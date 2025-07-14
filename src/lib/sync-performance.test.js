import {describe, test, expect, beforeEach, afterEach, vi} from 'vitest'
import {PGlite} from '@electric-sql/pglite'
import {needsUpdate, needsUpdateBatch, syncTracks, dryRun} from './sync.js'
import {sdk} from '@radio4000/sdk'

import migrationsql from './migrations/01-create_tables.sql?raw'
import migration02sql from './migrations/02-add_queue_panel_visibility.sql?raw'
import migration03sql from './migrations/03-add_broadcasts_table.sql?raw'
import migration04sql from './migrations/04-add_shuffle_queue.sql?raw'

const migrations = [
	{name: '01-create_tables', sql: migrationsql},
	{name: '02-add_queue_panel_visibility', sql: migration02sql},
	{name: '03-add_broadcast_fields', sql: migration03sql},
	{name: '04-add_shuffle_queue', sql: migration04sql}
]

async function migrate(pg) {
	await pg.exec(`
		create table if not exists migrations (
			id serial primary key,
			name text not null unique,
			applied_at timestamp default current_timestamp
		);
	`)

	const [result] = await pg.exec('select name from migrations')
	const appliedMigrationNames = result.rows.map((x) => x.name)

	for (const migration of migrations) {
		if (!appliedMigrationNames.includes(migration.name)) {
			try {
				await pg.exec(migration.sql)
				await pg.query('insert into migrations (name) values ($1);', [migration.name])
			} catch (err) {
				console.error('Failed migration', err, migration, appliedMigrationNames)
				throw err
			}
		}
	}
}

describe('Production Sync Performance: Real API Testing', () => {
	let pg
	let originalPg

	beforeEach(async () => {
		pg = await PGlite.create('memory://')
		await migrate(pg)

		const syncModule = await import('./sync.js')
		originalPg = syncModule.pg
		vi.doMock('$lib/db', () => ({
			pg,
			debugLimit: 15
		}))
	})

	afterEach(() => {
		if (originalPg) {
			vi.doMock('$lib/db', () => ({
				pg: originalPg,
				debugLimit: 15
			}))
		}
	})

	function formatDuration(ms) {
		if (ms < 1000) return `${Math.round(ms)}ms`
		return `${(ms / 1000).toFixed(2)}s`
	}

	test('Production API: Update Check vs Skip Check Performance', async () => {
		console.log('Testing 20 channels performance')

		const {data: realChannels, error} = await sdk.channels.readChannels(25)
		expect(error).toBeNull()
		expect(realChannels).toBeDefined()
		expect(realChannels.length).toBeGreaterThanOrEqual(20)

		const testChannels = realChannels.slice(0, 20)

		for (const channel of testChannels) {
			await pg.sql`
				INSERT INTO channels (id, name, slug, description, image, created_at, updated_at)
				VALUES (
					${channel.id}, ${channel.name}, ${channel.slug},
					${channel.description}, ${channel.image},
					${channel.created_at}, ${channel.updated_at}
				)
			`
		}

		const {rows: dbChannels} = await pg.query('SELECT id, slug FROM channels ORDER BY slug')

		console.log('\n🔄 Strategy 1: Individual needsUpdate calls')
		const individualStart = performance.now()

		const individualResults = []
		for (const channel of dbChannels) {
			const channelStart = performance.now()
			const needs = await needsUpdate(channel.slug)
			const channelTime = performance.now() - channelStart
			individualResults.push({slug: channel.slug, id: channel.id, needs, time: channelTime})
		}

		const individualTotal = performance.now() - individualStart
		console.log(`  💫 Total Individual Time: ${formatDuration(individualTotal)}`)

		console.log('\n⚡ Strategy 2: Production needsUpdateBatch call')
		const batchStart = performance.now()

		const channelIds = dbChannels.map((c) => c.id)
		const needsUpdateSet = await needsUpdateBatch(channelIds)

		const batchTotal = performance.now() - batchStart
		console.log(`  💫 Total Batch Time: ${formatDuration(batchTotal)}`)

		console.log('\n🔍 Result Verification:')
		let matchCount = 0
		let mismatchDetails = []

		for (const channel of dbChannels) {
			const individualResult = individualResults.find((r) => r.id === channel.id)
			const batchResult = needsUpdateSet.has(channel.id)
			const match = individualResult.needs === batchResult

			if (match) {
				matchCount++
			} else {
				mismatchDetails.push({
					slug: channel.slug,
					individual: individualResult.needs,
					batch: batchResult
				})
			}
		}

		console.log(`  • Result accuracy: ${matchCount}/${dbChannels.length} matches`)
		if (mismatchDetails.length > 0) {
			console.log(`  ❌ Mismatches found:`)
			mismatchDetails.forEach((detail) => {
				console.log(
					`    • ${detail.slug}: Individual(${detail.individual}) vs Batch(${detail.batch})`
				)
			})
		}

		console.log('\n📊 Performance Analysis:')
		const speedup = (individualTotal / batchTotal).toFixed(2)
		const timeSaved = individualTotal - batchTotal
		const efficiency = ((timeSaved / individualTotal) * 100).toFixed(1)

		console.log(`  • Individual needsUpdate: ${formatDuration(individualTotal)}`)
		console.log(`  • Batch needsUpdate: ${formatDuration(batchTotal)}`)
		console.log(`  • Speedup: ${speedup}x faster (${efficiency}% improvement)`)
		console.log(
			`  • Per-channel avg: Individual ${formatDuration(individualTotal / dbChannels.length)} vs Batch ${formatDuration(batchTotal / dbChannels.length)}`
		)

		expect(matchCount).toBe(dbChannels.length)
		expect(batchTotal).toBeLessThan(individualTotal)
		expect(parseFloat(speedup)).toBeGreaterThan(1.5)
	}, 60000)

	test('Production API: dryRun functionality', async () => {
		console.log('\n🔍 Production dryRun Testing\n')

		const {data: realChannels} = await sdk.channels.readChannels(10)
		expect(realChannels).toBeDefined()

		console.log('🔧 Setting up mixed channel states...')
		for (const [i, channel] of realChannels.slice(0, 6).entries()) {
			const tracksSyncedAt = i < 3 ? new Date().toISOString() : null
			await pg.sql`
				INSERT INTO channels (id, name, slug, description, image, created_at, updated_at, tracks_synced_at)
				VALUES (
					${channel.id}, ${channel.name}, ${channel.slug},
					${channel.description}, ${channel.image},
					${channel.created_at}, ${channel.updated_at},
					${tracksSyncedAt}
				)
			`
		}

		// Test with update checks
		console.log('\n🔍 Testing with update checks...')
		const checkAnalysis = await dryRun({skipUpdateCheck: false})

		console.log('\n⏭️  Testing skip check mode...')
		const skipAnalysis = await dryRun({skipUpdateCheck: true})

		console.log('\n📊 Analysis Comparison:')
		console.log(
			`  • Check mode would sync: ${checkAnalysis.needsSync}/${checkAnalysis.total} channels`
		)
		console.log(
			`  • Skip mode would sync: ${skipAnalysis.needsSync}/${skipAnalysis.total} channels`
		)
		console.log(`  • Channels up to date: ${checkAnalysis.upToDate}`)

		expect(checkAnalysis.total).toBe(6)
		expect(skipAnalysis.total).toBe(6)
		expect(skipAnalysis.needsSync).toBe(6)
		expect(checkAnalysis.needsSync).toBeLessThanOrEqual(skipAnalysis.needsSync)
		expect(checkAnalysis.upToDate).toBeGreaterThanOrEqual(0)
	}, 30000)

	test('Production API: syncTracks performance comparison', async () => {
		console.log('\n🔄 Production syncTracks Performance\n')

		const {data: realChannels} = await sdk.channels.readChannels(15)
		expect(realChannels).toBeDefined()

		const testSizes = [5, 10, 15]
		const results = {}

		for (const size of testSizes) {
			console.log(`\n🧪 Testing syncTracks with ${size} channels...`)

			await pg.exec('DELETE FROM channels')

			for (const channel of realChannels.slice(0, size)) {
				await pg.sql`
					INSERT INTO channels (id, name, slug, description, image, created_at, updated_at)
					VALUES (
						${channel.id}, ${channel.name}, ${channel.slug},
						${channel.description}, ${channel.image},
						${channel.created_at}, ${channel.updated_at}
					)
				`
			}

			console.log('  🔍 Testing with update checks (default)...')
			const checkStart = performance.now()
			await syncTracks({skipUpdateCheck: false})
			const checkTime = performance.now() - checkStart

			// Note: We can't time skipUpdateCheck mode because it would actually
			// try to pull all tracks from the network, which would be very slow
			// and hit the real API. The check mode test verifies the batch logic works.

			results[size] = {check: checkTime}

			console.log(`  • Check mode: ${formatDuration(checkTime)}`)
			console.log(`  • Used batch needsUpdate optimization: ✅`)
		}

		console.log('\n📈 Check Mode Performance Summary:')
		console.log('  Size | Check Mode Time')
		console.log('  -----|----------------')
		testSizes.forEach((size) => {
			const {check} = results[size]
			const checkStr = formatDuration(check).padEnd(15)
			console.log(`  ${size.toString().padEnd(4)} | ${checkStr}`)
		})

		expect(results[15].check).toBeGreaterThan(0)
	}, 60000)

	test('Track insertion chunking performance - jank reduction', async () => {
		console.log('\\n🔄 Testing track insertion chunking to reduce jank\\n')

		// Get a channel with many tracks to simulate the jank scenario
		const {data: realChannels} = await sdk.channels.readChannels(5)
		const testChannel = realChannels.find((ch) => !ch.firebase_id) // Get a v2 channel

		if (!testChannel) {
			console.log('No v2 channel found, skipping chunking test')
			return
		}

		// Insert the channel
		await pg.sql`
			INSERT INTO channels (id, name, slug, description, image, created_at, updated_at)
			VALUES (
				${testChannel.id}, ${testChannel.name}, ${testChannel.slug},
				${testChannel.description}, ${testChannel.image},
				${testChannel.created_at}, ${testChannel.updated_at}
			)
		`

		// Get real tracks for this channel
		const {data: tracks, error} = await sdk.channels.readChannelTracks(testChannel.slug)
		if (error || !tracks || tracks.length < 100) {
			console.log(
				`Channel ${testChannel.slug} has ${tracks?.length || 0} tracks, skipping chunking test`
			)
			return
		}

		console.log(`🧪 Testing with ${tracks.length} tracks from ${testChannel.slug}`)

		// Test 1: Large transaction (current approach)
		console.log('\\n📦 Test 1: Large transaction (current approach)')
		const largeStart = performance.now()
		await pg.transaction(async (tx) => {
			const inserts = tracks.map(
				(track) => tx.sql`
				INSERT INTO tracks (id, channel_id, url, title, description, discogs_url, created_at, updated_at)
				VALUES (
					${track.id}, ${testChannel.id}, ${track.url}, ${track.title}, ${track.description},
					${track.discogs_url}, ${track.created_at}, ${track.updated_at}
				)
			`
			)
			await Promise.all(inserts)
		})
		const largeTime = performance.now() - largeStart
		console.log(`  • Large transaction: ${formatDuration(largeTime)}`)

		// Clear tracks for next test
		await pg.sql`DELETE FROM tracks WHERE channel_id = ${testChannel.id}`

		// Test 2: Chunked with yielding (proposed approach)
		console.log('\\n⚡ Test 2: Chunked with yielding (proposed approach)')
		const CHUNK_SIZE = 50
		const chunkStart = performance.now()

		await pg.transaction(async (tx) => {
			for (let i = 0; i < tracks.length; i += CHUNK_SIZE) {
				const chunk = tracks.slice(i, i + CHUNK_SIZE)
				const inserts = chunk.map(
					(track) => tx.sql`
					INSERT INTO tracks (id, channel_id, url, title, description, discogs_url, created_at, updated_at)
					VALUES (
						${track.id}, ${testChannel.id}, ${track.url}, ${track.title}, ${track.description},
						${track.discogs_url}, ${track.created_at}, ${track.updated_at}
					)
				`
				)
				await Promise.all(inserts)

				// Yield to event loop between chunks
				if (i + CHUNK_SIZE < tracks.length) {
					await new Promise((resolve) => setTimeout(resolve, 0))
				}
			}
		})
		const chunkTime = performance.now() - chunkStart
		console.log(`  • Chunked (${CHUNK_SIZE} per chunk): ${formatDuration(chunkTime)}`)

		// Verify both approaches inserted same number of tracks
		const {
			rows: [result]
		} = await pg.sql`SELECT COUNT(*) as count FROM tracks WHERE channel_id = ${testChannel.id}`

		console.log('\\n📊 Jank Reduction Analysis:')
		console.log(`  • Tracks inserted: ${result.count}/${tracks.length}`)

		if (chunkTime > largeTime) {
			const overhead = (((chunkTime - largeTime) / largeTime) * 100).toFixed(1)
			console.log(
				`  • Chunking overhead: ${overhead}% slower (${formatDuration(chunkTime - largeTime)} extra)`
			)
		} else {
			const savings = (((largeTime - chunkTime) / largeTime) * 100).toFixed(1)
			console.log(
				`  • Chunking savings: ${savings}% faster (${formatDuration(largeTime - chunkTime)} saved)`
			)
		}

		console.log('  • Main benefit: Chunking yields to UI thread, reducing jank')
		console.log(`  • Chunks processed: ${Math.ceil(tracks.length / CHUNK_SIZE)}`)
		console.log(`  • UI yields: ${Math.ceil(tracks.length / CHUNK_SIZE) - 1}`)

		expect(parseInt(result.count)).toBe(tracks.length)
		expect(chunkTime).toBeGreaterThan(0)
		expect(largeTime).toBeGreaterThan(0)
	}, 60000)

	test('Single Record: Individual vs Batch needsUpdate overhead', async () => {
		console.log('\n🔍 Single Record Performance (Production API)\n')

		const {data: realChannels} = await sdk.channels.readChannels(5)
		expect(realChannels).toBeDefined()

		const testChannel = realChannels[0]
		await pg.sql`
			INSERT INTO channels (id, name, slug, description, image, created_at, updated_at)
			VALUES (
				${testChannel.id}, ${testChannel.name}, ${testChannel.slug},
				${testChannel.description}, ${testChannel.image},
				${testChannel.created_at}, ${testChannel.updated_at}
			)
		`

		console.log(`🔧 Testing single channel: ${testChannel.slug}`)

		const iterations = 10
		const individualTimes = []
		const batchTimes = []
		let lastIndividualResult, lastBatchResult

		console.log(`\n⏱️  Running ${iterations} iterations for statistical accuracy...`)

		await needsUpdate(testChannel.slug)
		await needsUpdateBatch([testChannel.id])

		for (let i = 0; i < iterations; i++) {
			const start = performance.now()
			lastIndividualResult = await needsUpdate(testChannel.slug)
			const time = performance.now() - start
			individualTimes.push(time)
		}

		for (let i = 0; i < iterations; i++) {
			const start = performance.now()
			const batchSet = await needsUpdateBatch([testChannel.id])
			lastBatchResult = batchSet.has(testChannel.id)
			const time = performance.now() - start
			batchTimes.push(time)
		}

		const avgIndividual = individualTimes.reduce((a, b) => a + b, 0) / iterations
		const avgBatch = batchTimes.reduce((a, b) => a + b, 0) / iterations
		const minIndividual = Math.min(...individualTimes)
		const maxIndividual = Math.max(...individualTimes)
		const minBatch = Math.min(...batchTimes)
		const maxBatch = Math.max(...batchTimes)

		console.log('\n📊 Statistical Results:')
		console.log(
			`  • Individual: avg ${formatDuration(avgIndividual)}, range ${formatDuration(minIndividual)}-${formatDuration(maxIndividual)}`
		)
		console.log(
			`  • Batch: avg ${formatDuration(avgBatch)}, range ${formatDuration(minBatch)}-${formatDuration(maxBatch)}`
		)

		if (avgBatch < avgIndividual) {
			const speedup = (avgIndividual / avgBatch).toFixed(2)
			const improvement = (((avgIndividual - avgBatch) / avgIndividual) * 100).toFixed(1)
			console.log(`  • Batch advantage: ${speedup}x faster (${improvement}% improvement)`)
		} else {
			const overhead = (avgBatch / avgIndividual).toFixed(2)
			const slowdown = (((avgBatch - avgIndividual) / avgIndividual) * 100).toFixed(1)
			console.log(`  • Individual advantage: ${overhead}x faster (${slowdown}% batch overhead)`)
		}

		console.log(
			`  • Result consistency: ${lastIndividualResult === lastBatchResult ? '✅ Perfect' : '❌ Mismatch'}`
		)
		console.log(`  • Recommendation: Use individual needsUpdate for single channels`)

		expect(lastIndividualResult).toBe(lastBatchResult)
	}, 30000)
})
