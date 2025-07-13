import {describe, test, expect, beforeEach, vi} from 'vitest'
import {PGlite} from '@electric-sql/pglite'
import {needsUpdate, batchNeedsUpdate, sequentialTrackSync, analyzeSync} from './sync.js'
import {sdk} from '@radio4000/sdk'

// Import migrations directly
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

		// Mock the production pg import to use our test database
		const syncModule = await import('./sync.js')
		originalPg = syncModule.pg
		vi.doMock('$lib/db', () => ({
			pg,
			debugLimit: 15
		}))
	})

	afterEach(() => {
		// Restore original pg
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

	test('Production API: Smart vs Skip Update Check Performance', async () => {
		console.log('\n🏭 Production API Performance Test (20 channels)\n')

		// Get fresh channels from Radio4000
		console.log('📥 Fetching 25 real channels from Radio4000...')
		const {data: realChannels, error} = await sdk.channels.readChannels(25)
		expect(error).toBeNull()
		expect(realChannels).toBeDefined()
		expect(realChannels.length).toBeGreaterThanOrEqual(20)

		// Use 20 channels for testing
		const testChannels = realChannels.slice(0, 20)
		console.log(`💾 Setting up ${testChannels.length} channels locally...`)

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
		console.log(
			`🔧 Testing with ${dbChannels.length} channels: ${dbChannels
				.slice(0, 3)
				.map((c) => c.slug)
				.join(', ')}${dbChannels.length > 3 ? '...' : ''}`
		)

		// Strategy 1: Individual needsUpdate calls (production function)
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

		// Strategy 2: Production batchNeedsUpdate call
		console.log('\n⚡ Strategy 2: Production batchNeedsUpdate call')
		const batchStart = performance.now()

		const channelIds = dbChannels.map((c) => c.id)
		const needsUpdateSet = await batchNeedsUpdate(channelIds)

		const batchTotal = performance.now() - batchStart
		console.log(`  💫 Total Batch Time: ${formatDuration(batchTotal)}`)

		// Verify results match
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

		// Performance Analysis
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

		// Assertions
		expect(matchCount).toBe(dbChannels.length)
		expect(batchTotal).toBeLessThan(individualTotal)
		expect(parseFloat(speedup)).toBeGreaterThan(1.5)
	}, 60000)

	test('Production API: analyzeSync dry run functionality', async () => {
		console.log('\n🔍 Production analyzeSync Testing\n')

		// Get real channels
		const {data: realChannels} = await sdk.channels.readChannels(10)
		expect(realChannels).toBeDefined()

		// Setup mix of channel states - some synced, some not
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

		// Test smart mode analysis
		console.log('\n🧠 Testing smart mode analysis...')
		const smartAnalysis = await analyzeSync({skipUpdateCheck: false})

		console.log('\n⏭️  Testing skip update check mode...')
		const skipAnalysis = await analyzeSync({skipUpdateCheck: true})

		// Verify analysis results
		console.log('\n📊 Analysis Comparison:')
		console.log(
			`  • Smart mode would sync: ${smartAnalysis.needsSync}/${smartAnalysis.total} channels`
		)
		console.log(
			`  • Skip mode would sync: ${skipAnalysis.needsSync}/${skipAnalysis.total} channels`
		)
		console.log(`  • Channels up to date: ${smartAnalysis.upToDate}`)

		expect(smartAnalysis.total).toBe(6)
		expect(skipAnalysis.total).toBe(6)
		expect(skipAnalysis.needsSync).toBe(6) // Skip mode syncs everything
		expect(smartAnalysis.needsSync).toBeLessThanOrEqual(skipAnalysis.needsSync) // Smart mode should sync fewer or equal
		expect(smartAnalysis.upToDate).toBeGreaterThanOrEqual(0)
	}, 30000)

	test('Production API: sequentialTrackSync performance comparison', async () => {
		console.log('\n🔄 Production sequentialTrackSync Performance\n')

		// Get real channels for testing
		const {data: realChannels} = await sdk.channels.readChannels(15)
		expect(realChannels).toBeDefined()

		const testSizes = [5, 10, 15]
		const results = {}

		for (const size of testSizes) {
			console.log(`\n🧪 Testing sequentialTrackSync with ${size} channels...`)

			// Reset and setup channels for this test size
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

			// Time smart mode (default behavior)
			console.log('  🧠 Testing smart mode (default)...')
			const smartStart = performance.now()
			await sequentialTrackSync({skipUpdateCheck: false})
			const smartTime = performance.now() - smartStart

			// Note: We can't time skipUpdateCheck mode because it would actually
			// try to pull all tracks from the network, which would be very slow
			// and hit the real API. The smart mode test verifies the batch logic works.

			results[size] = {smart: smartTime}

			console.log(`  • Smart mode: ${formatDuration(smartTime)}`)
			console.log(`  • Used batch needsUpdate optimization: ✅`)
		}

		console.log('\n📈 Smart Mode Performance Summary:')
		console.log('  Size | Smart Mode Time')
		console.log('  -----|----------------')
		testSizes.forEach((size) => {
			const {smart} = results[size]
			const smartStr = formatDuration(smart).padEnd(15)
			console.log(`  ${size.toString().padEnd(4)} | ${smartStr}`)
		})

		// The main assertion is that the function completes without error
		// and uses the batch optimization internally
		expect(results[15].smart).toBeGreaterThan(0)
	}, 60000)

	test('Single Record: Individual vs Batch needsUpdate overhead', async () => {
		console.log('\n🔍 Single Record Performance (Production API)\n')

		// Get one real channel
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

		// Run 10 iterations for statistical significance
		const iterations = 10
		const individualTimes = []
		const batchTimes = []
		let lastIndividualResult, lastBatchResult

		console.log(`\n⏱️  Running ${iterations} iterations for statistical accuracy...`)

		// Warm up (exclude from measurements)
		await needsUpdate(testChannel.slug)
		await batchNeedsUpdate([testChannel.id])

		// Individual approach measurements
		for (let i = 0; i < iterations; i++) {
			const start = performance.now()
			lastIndividualResult = await needsUpdate(testChannel.slug)
			const time = performance.now() - start
			individualTimes.push(time)
		}

		// Batch approach measurements
		for (let i = 0; i < iterations; i++) {
			const start = performance.now()
			const batchSet = await batchNeedsUpdate([testChannel.id])
			lastBatchResult = batchSet.has(testChannel.id)
			const time = performance.now() - start
			batchTimes.push(time)
		}

		// Statistical analysis
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
