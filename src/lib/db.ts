import {PGlite} from '@electric-sql/pglite'
import {live} from '@electric-sql/pglite/live'
import {sdk} from '@radio4000/sdk'
// import {PGliteWorker} from '@electric-sql/pglite/worker'
import {browser} from '$app/environment'

export const DEBUG_LIMIT = 30

// const useWorker = false
const persist = true
const dbUrl = persist ? 'idb://radio4000-debug' : 'memory://'
const options = {
	// debug: 1,
	dataDir: dbUrl,
	// faster when using idb?
	relaxedDurability: true,
	extensions: {
		live
	}
}

export const pg = await PGlite.create(options)
/* export const pg = !useWorker
	? await PGlite.create(options)
	: new PGliteWorker(
			new Worker(new URL('./my-pglite-worker.js?worker', import.meta.url), {
				type: 'module'
			}),
			options
	 )*/

// @ts-expect-error just for debugging
if (browser) window.r5 = {pg, sdk}

export async function dropAllTables() {
	await pg.sql`drop table if exists app_state CASCADE;`
	await pg.sql`drop table if exists tracks CASCADE;`
	await pg.sql`drop table if exists channels CASCADE;`
	console.log('Dropped all tables')
}

export async function initDb(reset = false) {
	console.time('Initializing database')
	if (reset) await dropAllTables()

	await pg.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      tracks_outdated BOOLEAN,
      busy BOOLEAN,
      firebase_id TEXT unique
    );

    CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels(slug);

    CREATE TABLE IF NOT EXISTS tracks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      discogs_url TEXT,
      firebase_id TEXT unique
    );

    CREATE INDEX IF NOT EXISTS idx_tracks_channel_id ON tracks(channel_id);

    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      theme TEXT,
      counter INTEGER DEFAULT 0,
      channels_display TEXT,

      is_playing BOOLEAN DEFAULT false,
      volume INTEGER DEFAULT 70,

			playlist_tracks UUID[] DEFAULT ARRAY[]::UUID[],
			playlist_index INTEGER default 1,
			playlist_track UUID references tracks(id),

			channels UUID[] DEFAULT ARRAY[]::UUID[]
    );

    INSERT INTO app_state (id) values (1) on conflict do nothing;
  `)
	console.timeEnd('Initializing database')
}

export async function exportDb() {
	const file = await pg.dumpDataDir()
	// Download the dump
	const url = URL.createObjectURL(file)
	const a = document.createElement('a')
	a.href = url
	a.download = file.name
	a.click()
	// could even query the new db
	//const pg2 = new PGlite({ loadDataDir: file })
}
