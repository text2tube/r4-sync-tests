import {PGlite} from '@electric-sql/pglite'
import {live} from '@electric-sql/pglite/live'
import type {PGliteWithLive} from '@electric-sql/pglite/live'
import {pg_trgm} from '@electric-sql/pglite/contrib/pg_trgm'
import {logger} from '$lib/logger'

const log = logger.ns('db').seal()

import migrationsql from '$lib/migrations/01-create_tables.sql?raw'
import migration02sql from '$lib/migrations/02-add_queue_panel_visibility.sql?raw'
import migration03sql from '$lib/migrations/03-add_broadcasts_table.sql?raw'
import migration04sql from '$lib/migrations/04-add_shuffle_queue.sql?raw'
import migration05sql from '$lib/migrations/05-add_shortcuts.sql?raw'
import migration06sql from '$lib/migrations/06-create_play_history.sql?raw'
import migration07sql from '$lib/migrations/07-add_channel-coordinates-url.sql?raw'
import migration08sql from '$lib/migrations/08-enable_pg_trgm.sql?raw'
import migration09sql from '$lib/migrations/09-create_track_meta.sql?raw'
import migration10sql from '$lib/migrations/10-create_ytid_function_and_view.sql?raw'

// This will limit the amount of channels pulled.
export const debugLimit = 2000

const migrations = [
	{name: '01-create_tables', sql: migrationsql},
	{name: '02-add_queue_panel_visibility', sql: migration02sql},
	{name: '03-add_broadcast_fields', sql: migration03sql},
	{name: '04-add_shuffle_queue', sql: migration04sql},
	{name: '05-add_shortcuts', sql: migration05sql},
	{name: '06-add_play_history', sql: migration06sql},
	{name: '07-add_channel-coordinates-url', sql: migration07sql},
	{name: '08-enable_pg_trgm', sql: migration08sql},
	{name: '09-create_track_meta', sql: migration09sql},
	{name: '10-create_ytid_function_and_view', sql: migration10sql}
]

// Switch between in-memory and OPFS persisted indexeddb for PostgreSQL
const persist = true
const dataDir = persist ? 'idb://radio4000test2' : 'memory://'

// This will be null until createPg() is called
export let pg: PGliteWithLive

async function createPg(): Promise<PGliteWithLive> {
	if (!pg) {
		pg = await PGlite.create({
			// debug: 1,
			dataDir: dataDir,
			relaxedDurability: true,
			extensions: {
				live,
				pg_trgm
			}
		})
	}
	return pg
}

export async function dropDb() {
	if (!pg) pg = await createPg()
	// Clear tables
	await pg.sql`DELETE FROM app_state;`
	await pg.sql`DELETE FROM tracks;`
	await pg.sql`DELETE FROM channels;`
	// Then drop them
	await pg.sql`drop table if exists app_state CASCADE;`
	await pg.sql`drop table if exists tracks CASCADE;`
	await pg.sql`drop table if exists channels CASCADE;`
	await pg.sql`drop table if exists migrations CASCADE;`
	await pg.sql`drop table if exists track_meta CASCADE;`
	log.log('drop_tables')
}

export async function exportDb() {
	if (!pg) throw new Error('Database not initialized')
	const file = await pg.dumpDataDir()
	// Download the dump
	const url = URL.createObjectURL(file)
	const a = document.createElement('a')
	a.href = url
	const timestamp = new Date().toISOString().replace(/:/g, '-')
	a.download = `r5-test-${timestamp}.tar.gz`
	a.click()
}

/** Runs a list of SQL migrations on the database */
export async function migrateDb() {
	if (!pg) pg = await createPg()

	// Create migrations table if it doesn't exist
	await pg.exec(`
		create table if not exists migrations (
			id serial primary key,
			name text not null unique,
			applied_at timestamp default current_timestamp
		);
	`)

	const [result] = await pg.exec('select name from migrations')
	const appliedMigrationNames = result.rows.map((x) => x.name)

	// Debug: Check what tables actually exist
	const [tablesResult] = await pg.exec(`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public'
		AND table_type = 'BASE TABLE'
	`)
	log.log('migrate_applied', {
		migrations: appliedMigrationNames,
		tables: tablesResult.rows.map((r) => r.table_name)
	})

	// Apply new migrations
	for (const migration of migrations) {
		if (appliedMigrationNames.includes(migration.name)) {
			// already applied
		} else {
			try {
				await pg.exec(migration.sql)
				await pg.query('insert into migrations (name) values ($1);', [migration.name])
				log.log(`migrate_applied ${migration.name}`)
			} catch (err) {
				log.error('migrate_error', err, migration, appliedMigrationNames)
				throw err
			}
		}
	}
}
