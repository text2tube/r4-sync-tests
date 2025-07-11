import {describe, test, expect, beforeEach} from 'vitest'
import {PGlite} from '@electric-sql/pglite'

describe('Sync resumability', () => {
	let pg

	beforeEach(async () => {
		// Create fresh in-memory database for each test
		pg = await PGlite.create('memory://')

		// Set up tables (simplified version of your schema)
		await pg.exec(`
      CREATE TABLE channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        tracks_synced_at TIMESTAMP DEFAULT NULL,
        busy BOOLEAN DEFAULT FALSE
      );
      
      CREATE TABLE tracks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id UUID REFERENCES channels(id),
        title TEXT NOT NULL
      );
    `)
	})

	test('should identify unsynced channels', async () => {
		// Insert test channels - some synced, some not
		await pg.exec(`
      INSERT INTO channels (name, slug, tracks_synced_at) VALUES 
      ('Synced Channel', 'synced', CURRENT_TIMESTAMP),
      ('Unsynced Channel', 'unsynced', NULL),
      ('Another Unsynced', 'unsynced2', NULL)
    `)

		// Query for unsynced channels (our resume logic)
		const {rows} = await pg.query(`
      SELECT * FROM channels WHERE tracks_synced_at IS NULL
    `)

		expect(rows).toHaveLength(2)
		expect(rows.map((r) => r.slug)).toEqual(['unsynced', 'unsynced2'])
	})

	test('should simulate interrupted sync and resume correctly', async () => {
		// Set up scenario: 5 channels to sync
		await pg.exec(`
      INSERT INTO channels (name, slug, tracks_synced_at) VALUES 
      ('Channel 1', 'ch1', NULL),
      ('Channel 2', 'ch2', NULL),
      ('Channel 3', 'ch3', NULL),
      ('Channel 4', 'ch4', NULL),
      ('Channel 5', 'ch5', NULL)
    `)

		// Simulate partial sync - first 2 channels completed
		async function markChannelSynced(slug) {
			await pg.query(
				`
        UPDATE channels 
        SET tracks_synced_at = CURRENT_TIMESTAMP 
        WHERE slug = $1
      `,
				[slug]
			)
		}

		// "Sync" first 2 channels
		await markChannelSynced('ch1')
		await markChannelSynced('ch2')

		// Simulate "interruption" - check what needs resuming
		const {rows: unsyncedChannels} = await pg.query(`
      SELECT slug FROM channels 
      WHERE tracks_synced_at IS NULL 
      ORDER BY slug
    `)

		expect(unsyncedChannels).toHaveLength(3)
		expect(unsyncedChannels.map((r) => r.slug)).toEqual(['ch3', 'ch4', 'ch5'])

		// Simulate resume - sync one more
		await markChannelSynced('ch3')

		// Check remaining
		const {rows: stillUnsynced} = await pg.query(`
      SELECT slug FROM channels 
      WHERE tracks_synced_at IS NULL 
      ORDER BY slug
    `)

		expect(stillUnsynced).toHaveLength(2)
		expect(stillUnsynced.map((r) => r.slug)).toEqual(['ch4', 'ch5'])
	})

	test('should reset channel for re-sync', async () => {
		// Set up synced channel
		await pg.exec(`
      INSERT INTO channels (name, slug, tracks_synced_at) VALUES 
      ('Test Channel', 'test', CURRENT_TIMESTAMP)
    `)

		// Verify it's synced
		let {rows} = await pg.query(`
      SELECT * FROM channels WHERE tracks_synced_at IS NULL
    `)
		expect(rows).toHaveLength(0)

		// Reset for re-sync (like when new tracks are added)
		await pg.query(
			`
      UPDATE channels 
      SET tracks_synced_at = NULL 
      WHERE slug = $1
    `,
			['test']
		)

		// Verify it needs sync again
		const {rows: needsSync} = await pg.query(`
      SELECT slug FROM channels WHERE tracks_synced_at IS NULL
    `)
		expect(needsSync).toHaveLength(1)
		expect(needsSync[0].slug).toBe('test')
	})
})
