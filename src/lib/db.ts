import {PGlite} from '@electric-sql/pglite'
import {live} from '@electric-sql/pglite/live'
import {sdk} from '@radio4000/sdk'
// import {PGliteWorker} from '@electric-sql/pglite/worker'
import {browser} from '$app/environment'
import migrationsql from './migrations/01-create_tables.sql?raw'

export const DEBUG_LIMIT = 10

const migrations = [{name: '01-create_tables', sql: migrationsql}]

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
	migrate(pg)
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

/** Runs a list of SQL migrations on the database */
export async function migrate(pg: PGlite) {
	console.log('migrating pg')
	// Create migrations table if it doesn't exist
	await pg.exec(`
		create table if not exists migrations (
			id serial primary key,
			name text not null unique,
			applied_at timestamp default current_timestamp
		);
	`)

	const [result] = await pg.exec(`select name from migrations`)
	const appliedMigrationNames = result.rows.map((x) => x.name)

	// Apply new migrations
	for (const migration of migrations) {
		if (!appliedMigrationNames.includes(migration.name)) {
			console.log('are we here?', migration)
			try {
				console.log(`trying migration: ${migration.name}`)
				await pg.exec(migration.sql)
				await pg.query('insert into migrations (name) values ($1);', [migration.name])
			} catch (err) {
				console.error('failed migration', err, migration, appliedMigrationNames)
			}
		}
	}
}
