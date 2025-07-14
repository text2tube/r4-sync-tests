import {PGlite} from '@electric-sql/pglite'
import {sdk} from '@radio4000/sdk'

// Simple chunking performance test
async function testChunking() {
	console.log('🔄 Testing track insertion chunking to reduce jank\n')

	// Setup test database
	const pg = await PGlite.create('memory://')
	await pg.exec(`
		CREATE TABLE channels (
			id text PRIMARY KEY,
			name text,
			slug text,
			description text,
			image text,
			created_at timestamptz,
			updated_at timestamptz
		);

		CREATE TABLE tracks (
			id text PRIMARY KEY,
			channel_id text REFERENCES channels(id),
			url text,
			title text,
			description text,
			discogs_url text,
			created_at timestamptz,
			updated_at timestamptz
		);
	`)

	// Get oskar channel which has many tracks
	const {data: oskarChannel, error: channelError} = await sdk.channels.readChannel('oskar')
	if (channelError || !oskarChannel) {
		console.log('Could not find oskar channel, skipping test')
		return
	}
	
	const testChannel = oskarChannel

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
	const {data: allTracks, error} = await sdk.channels.readChannelTracks(testChannel.slug)
	if (error || !allTracks || allTracks.length < 100) {
		console.log(`Channel ${testChannel.slug} has ${allTracks?.length || 0} tracks, skipping test`)
		return
	}

	console.log(`🧪 Testing with ${allTracks.length} tracks from ${testChannel.slug}`)

	function formatDuration(ms) {
		if (ms < 1000) return `${Math.round(ms)}ms`
		return `${(ms / 1000).toFixed(2)}s`
	}

	// Test different track counts: 10, 50, 100, 400, 800, 2000
	const testSizes = [10, 50, 100, 400, 800, Math.min(2000, allTracks.length)]
	const results = []

	for (const size of testSizes) {
		const tracks = allTracks.slice(0, size)
		console.log(`\n📊 Testing ${size} tracks`)

		// Test 1: Large transaction (current approach)
		console.log('  📦 Large transaction (current approach)')
		const largeStart = performance.now()
		await pg.transaction(async (tx) => {
			const inserts = tracks.map(track => tx.sql`
				INSERT INTO tracks (id, channel_id, url, title, description, discogs_url, created_at, updated_at)
				VALUES (
					${track.id + '_large'}, ${testChannel.id}, ${track.url}, ${track.title}, ${track.description},
					${track.discogs_url}, ${track.created_at}, ${track.updated_at}
				)
			`)
			await Promise.all(inserts)
		})
		const largeTime = performance.now() - largeStart
		console.log(`    • Large transaction: ${formatDuration(largeTime)}`)

		// Test 2: Chunked with yielding (proposed approach)
		console.log('  ⚡ Chunked with yielding (proposed approach)')
		const CHUNK_SIZE = 50
		const chunkStart = performance.now()
		
		await pg.transaction(async (tx) => {
			for (let i = 0; i < tracks.length; i += CHUNK_SIZE) {
				const chunk = tracks.slice(i, i + CHUNK_SIZE)
				const inserts = chunk.map(track => tx.sql`
					INSERT INTO tracks (id, channel_id, url, title, description, discogs_url, created_at, updated_at)
					VALUES (
						${track.id + '_chunk'}, ${testChannel.id}, ${track.url}, ${track.title}, ${track.description},
						${track.discogs_url}, ${track.created_at}, ${track.updated_at}
					)
				`)
				await Promise.all(inserts)
				
				// Yield to event loop between chunks
				if (i + CHUNK_SIZE < tracks.length) {
					await new Promise(resolve => setTimeout(resolve, 0))
				}
			}
		})
		const chunkTime = performance.now() - chunkStart
		console.log(`    • Chunked (${CHUNK_SIZE} per chunk): ${formatDuration(chunkTime)}`)

		// Calculate overhead/savings
		const isOverhead = chunkTime > largeTime
		const percentage = isOverhead 
			? ((chunkTime - largeTime) / largeTime * 100).toFixed(1)
			: ((largeTime - chunkTime) / largeTime * 100).toFixed(1)
		const symbol = isOverhead ? '↑' : '↓'
		
		console.log(`    • Chunking ${isOverhead ? 'overhead' : 'savings'}: ${symbol} ${percentage}%`)
		console.log(`    • UI yields: ${Math.ceil(tracks.length / CHUNK_SIZE) - 1}`)

		results.push({
			size,
			largeTime,
			chunkTime,
			overhead: isOverhead ? percentage : `-${percentage}`,
			yields: Math.ceil(tracks.length / CHUNK_SIZE) - 1
		})

		// Clear tracks for next test
		await pg.sql`DELETE FROM tracks WHERE channel_id = ${testChannel.id}`
	}

	console.log('\n📈 Summary Results:')
	console.log('Size  | Large Trans | Chunked    | Overhead | UI Yields')
	console.log('------|-------------|------------|----------|----------')
	results.forEach(r => {
		const sizeStr = r.size.toString().padEnd(5)
		const largeStr = formatDuration(r.largeTime).padEnd(11)
		const chunkStr = formatDuration(r.chunkTime).padEnd(10)
		const overheadStr = `${r.overhead}%`.padEnd(8)
		const yieldsStr = r.yields.toString()
		console.log(`${sizeStr} | ${largeStr} | ${chunkStr} | ${overheadStr} | ${yieldsStr}`)
	})

	console.log('\n💡 Key Insights:')
	console.log('  • Chunking trades small performance overhead for jank reduction')
	console.log('  • Each UI yield prevents blocking the main thread')
	console.log('  • Larger track counts benefit more from chunking approach')

	await pg.close()
}

testChunking().catch(console.error)