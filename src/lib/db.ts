import {PGlite} from '@electric-sql/pglite'
import {live} from '@electric-sql/pglite/live'
import {sdk} from '@radio4000/sdk'
import {PGliteWorker} from '@electric-sql/pglite/worker'
import {browser} from '$app/environment'

const useWorker = false
const persist = true
const dbUrl = persist ? 'idb://radio4000-debug' : 'memory://'

export const pg = !useWorker
	? await PGlite.create({
			// debug: 1,
			dataDir: dbUrl,
			// faster when using idb?
			relaxedDurability: true, 

			extensions: {
				live
			}
		})
	: new PGliteWorker(
			new Worker(new URL('./my-pglite-worker.js?worker', import.meta.url), {
				type: 'module'
			}),
			{
				extensions: {
					live
				}
			}
		)

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
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      tracks_outdated BOOLEAN,
      busy BOOLEAN,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      source TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels(slug);

    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      discogs_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tracks_channel_id ON tracks(channel_id);

    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      playlist_slug TEXT,
      playlist_tracks JSONB,
      is_playing BOOLEAN DEFAULT false,
      volume INTEGER DEFAULT 70,
      theme TEXT,
      counter INTEGER DEFAULT 0,
      channels_display TEXT
    );

    INSERT INTO app_state (id) values (1) on conflict do nothing;
  `)
	console.timeEnd('Initializing database')
}

export async function exportDb() {
	const file = await pg.dumpDataDir()

	if (typeof window !== 'undefined') {
		// Download the dump
		const url = URL.createObjectURL(file)
		const a = document.createElement('a')
		a.href = url
		a.download = file.name
		console.log(url, file, a)
		// a.click()
	}

	const pg2 = new PGlite({
		loadDataDir: file
	})
	const rows = await pg2.query('SELECT name FROM channels;')
	console.log('test query using the exported file as db', rows)
}
