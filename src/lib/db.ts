import {PGlite} from '@electric-sql/pglite'
import {live} from '@electric-sql/pglite/live'

import migrationsql from './migrations/01-create_tables.sql?raw'
import migration02sql from './migrations/02-add_queue_panel_visibility.sql?raw'
import migration03sql from './migrations/03-add_broadcasts_table.sql?raw'
import migration04sql from './migrations/04-add_shuffle_queue.sql?raw'
import migration05sql from './migrations/05-add_shortcuts.sql?raw'

// This will limit the amount of channels pulled.
export const debugLimit = 20

const migrations = [
	{name: '01-create_tables', sql: migrationsql},
	{name: '02-add_queue_panel_visibility', sql: migration02sql},
	{name: '03-add_broadcast_fields', sql: migration03sql},
	{name: '04-add_shuffle_queue', sql: migration04sql},
	{name: '05-add_shortcuts', sql: migration05sql}
]

const persist = true
const dbUrl = persist ? 'idb://radio4000test2' : 'memory://'
const pgLiteOptions = {
	// debug: 1,
	dataDir: dbUrl,
	relaxedDurability: true,
	extensions: {
		live
	}
}

export const pg = await PGlite.create(pgLiteOptions)

export async function dropAllTables() {
	console.log('Dropping all tables')
	// Clear tables
	await pg.sql`DELETE FROM app_state;`
	await pg.sql`DELETE FROM tracks;`
	await pg.sql`DELETE FROM channels;`
	// Then drop them
	await pg.sql`drop table if exists app_state CASCADE;`
	await pg.sql`drop table if exists tracks CASCADE;`
	await pg.sql`drop table if exists channels CASCADE;`
	await pg.sql`drop table if exists migrations CASCADE;`

	console.log('Dropped all tables')
}

export async function initDb(reset = false) {
	console.time('Initialized database')
	if (reset) await dropAllTables()
	await migrate(pg)
	console.timeEnd('Initialized database')
}

export async function exportDb() {
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
export async function migrate(pg: PGlite) {
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
	console.log('Applied migrations', appliedMigrationNames)
	console.log(
		'Local tables',
		tablesResult.rows.map((r) => r.table_name)
	)

	// Apply new migrations
	for (const migration of migrations) {
		if (appliedMigrationNames.includes(migration.name)) {
			// console.log(`Migration already applied: ${migration.name}`)
		} else {
			try {
				await pg.exec(migration.sql)
				await pg.query('insert into migrations (name) values ($1);', [migration.name])
				console.log(`Applied migration: ${migration.name}`)
			} catch (err) {
				console.error('Failed migration', err, migration, appliedMigrationNames)
				throw err // Re-throw to stop the process
			}
		}
	}
}
