import {describe, test, expect, beforeEach, vi} from 'vitest'
import {PGlite} from '@electric-sql/pglite'

describe('Sequential sync behavior', () => {
	let pg
	let mockPullTracks
	let callOrder = []

	beforeEach(async () => {
		// Fresh database
		pg = await PGlite.create('memory://')
		callOrder = []

		// Set up schema
		await pg.exec(`
      CREATE TABLE channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        tracks_synced_at TIMESTAMP DEFAULT NULL,
        firebase_id TEXT DEFAULT NULL
      );
    `)

		// Mock pullTracks with delays and tracking
		mockPullTracks = vi.fn(async (slug) => {
			const startTime = Date.now()
			callOrder.push(`start-${slug}`)

			// Simulate real API delay (100-300ms)
			const delay = Math.random() * 200 + 100
			await new Promise((resolve) => setTimeout(resolve, delay))

			// Mark as synced in our test database
			await pg.query(
				`
        UPDATE channels 
        SET tracks_synced_at = CURRENT_TIMESTAMP 
        WHERE slug = $1
      `,
				[slug]
			)

			callOrder.push(`end-${slug}`)
			console.log(`Synced ${slug} in ${Date.now() - startTime}ms`)
		})
	})

	test('should process channels sequentially, not in parallel', async () => {
		// Insert test channels
		await pg.exec(`
      INSERT INTO channels (name, slug, tracks_synced_at) VALUES 
      ('Channel A', 'channel-a', NULL),
      ('Channel B', 'channel-b', NULL),
      ('Channel C', 'channel-c', NULL)
    `)

		// Sequential sync implementation (copied from your code)
		async function sequentialTrackSync() {
			const {rows: channels} = await pg.query(`
        SELECT slug, name FROM channels 
        WHERE firebase_id IS NULL 
        AND tracks_synced_at IS NULL
        ORDER BY name
      `)

			console.log(`Starting sequential sync for ${channels.length} channels`)

			for (const channel of channels) {
				await mockPullTracks(channel.slug)
			}
		}

		const startTime = Date.now()
		await sequentialTrackSync()
		const totalTime = Date.now() - startTime

		// Verify sequential execution (no overlapping start/end pairs)
		expect(callOrder).toEqual([
			'start-channel-a',
			'end-channel-a',
			'start-channel-b',
			'end-channel-b',
			'start-channel-c',
			'end-channel-c'
		])

		// Verify total time is sum of individual delays (sequential)
		expect(totalTime).toBeGreaterThan(300) // At least 3 * 100ms
		expect(mockPullTracks).toHaveBeenCalledTimes(3)
	})

	test('should skip already synced channels', async () => {
		// Mix of synced and unsynced channels
		await pg.exec(`
      INSERT INTO channels (name, slug, tracks_synced_at) VALUES 
      ('Synced Channel', 'synced', CURRENT_TIMESTAMP),
      ('Unsynced A', 'unsynced-a', NULL),
      ('Unsynced B', 'unsynced-b', NULL)
    `)

		async function sequentialTrackSync() {
			const {rows: channels} = await pg.query(`
        SELECT slug, name FROM channels 
        WHERE firebase_id IS NULL 
        AND tracks_synced_at IS NULL
        ORDER BY name
      `)

			for (const channel of channels) {
				await mockPullTracks(channel.slug)
			}
		}

		await sequentialTrackSync()

		// Should only process unsynced channels
		expect(mockPullTracks).toHaveBeenCalledTimes(2)
		expect(mockPullTracks).toHaveBeenCalledWith('unsynced-a')
		expect(mockPullTracks).toHaveBeenCalledWith('unsynced-b')
		expect(mockPullTracks).not.toHaveBeenCalledWith('synced')
	})

	test('should be resumable after interruption', async () => {
		// Set up 5 channels
		await pg.exec(`
      INSERT INTO channels (name, slug, tracks_synced_at) VALUES 
      ('Channel 1', 'ch1', NULL),
      ('Channel 2', 'ch2', NULL),
      ('Channel 3', 'ch3', NULL),
      ('Channel 4', 'ch4', NULL),
      ('Channel 5', 'ch5', NULL)
    `)

		// First run: sync 2 channels then "crash"
		const mockPullTracksFirstRun = vi.fn(async (slug) => {
			await new Promise((resolve) => setTimeout(resolve, 50))
			await pg.query(
				`
        UPDATE channels 
        SET tracks_synced_at = CURRENT_TIMESTAMP 
        WHERE slug = $1
      `,
				[slug]
			)
		})

		async function partialSync() {
			const {rows: channels} = await pg.query(`
        SELECT slug, name FROM channels 
        WHERE firebase_id IS NULL 
        AND tracks_synced_at IS NULL
        ORDER BY name
        LIMIT 2
      `)

			for (const channel of channels) {
				await mockPullTracksFirstRun(channel.slug)
			}
		}

		// Simulate first run (partial)
		await partialSync()
		expect(mockPullTracksFirstRun).toHaveBeenCalledTimes(2)

		// Check progress
		const {rows: progress1} = await pg.query(`
      SELECT 
        COUNT(*) FILTER (WHERE tracks_synced_at IS NOT NULL) as synced,
        COUNT(*) as total
      FROM channels WHERE firebase_id IS NULL
    `)
		expect(progress1[0]).toEqual({synced: 2, total: 5})

		// Second run: resume from where we left off
		async function resumeSync() {
			const {rows: channels} = await pg.query(`
        SELECT slug, name FROM channels 
        WHERE firebase_id IS NULL 
        AND tracks_synced_at IS NULL
        ORDER BY name
      `)

			for (const channel of channels) {
				await mockPullTracks(channel.slug)
			}
		}

		await resumeSync()

		// Should only sync remaining 3 channels
		expect(mockPullTracks).toHaveBeenCalledTimes(3)

		// Check final progress
		const {rows: progress2} = await pg.query(`
      SELECT 
        COUNT(*) FILTER (WHERE tracks_synced_at IS NOT NULL) as synced,
        COUNT(*) as total
      FROM channels WHERE firebase_id IS NULL
    `)
		expect(progress2[0]).toEqual({synced: 5, total: 5})
	})

	test('should handle individual channel failures gracefully', async () => {
		await pg.exec(`
      INSERT INTO channels (name, slug, tracks_synced_at) VALUES 
      ('Good Channel', 'good', NULL),
      ('Bad Channel', 'bad', NULL),
      ('Another Good', 'good2', NULL)
    `)

		// Mock that fails on "bad" channel
		const mockPullTracksWithFailure = vi.fn(async (slug) => {
			if (slug === 'bad') {
				throw new Error('Network error')
			}
			await new Promise((resolve) => setTimeout(resolve, 50))
			await pg.query(
				`
        UPDATE channels 
        SET tracks_synced_at = CURRENT_TIMESTAMP 
        WHERE slug = $1
      `,
				[slug]
			)
		})

		async function sequentialTrackSyncWithErrorHandling() {
			const {rows: channels} = await pg.query(`
        SELECT slug, name FROM channels 
        WHERE firebase_id IS NULL 
        AND tracks_synced_at IS NULL
        ORDER BY name
      `)

			for (const channel of channels) {
				try {
					await mockPullTracksWithFailure(channel.slug)
				} catch (error) {
					console.error(`Failed to sync ${channel.name}:`, error.message)
					// Continue to next channel
				}
			}
		}

		await sequentialTrackSyncWithErrorHandling()

		expect(mockPullTracksWithFailure).toHaveBeenCalledTimes(3)

		// Check that good channels are synced, bad one is not
		const {rows: results} = await pg.query(`
      SELECT slug, tracks_synced_at IS NOT NULL as is_synced
      FROM channels 
      ORDER BY slug
    `)

		expect(results).toEqual([
			{slug: 'bad', is_synced: false},
			{slug: 'good', is_synced: true},
			{slug: 'good2', is_synced: true}
		])
	})
})
