import {pg, debugLimit} from '$lib/db'
import {sdk} from '@radio4000/sdk'
import {pullV1Tracks, pullV1Channels} from '$lib/v1'

/**
 * SYNC ARCHITECTURE:
 *
We have a remote PostgreSQL database on Supabase. This is the source of truth.
We have a local PostgreSQL database in the browser via PGLite. We pull data from the remote into this.
Write are done remote. Most reads are local, with on-demand pulling (syncing) in many cases.

```js
// Main API
await sync() // Complete sync
await syncChannel('my-channel') // Single channel sync

// Status & preview
await needsUpdate('slug') // Check one channel
await needsUpdateBatch(['ids']) // Check multiple channels
await dryRun() // Preview what would sync

// Low-level
await pullChannels() // Always pull N channels
await pullTracks('slug') // Always pull tracks
await pullChannel('slug') // Always pull one channel
*/

/**
 * Always pull channel metadata from Radio4000 into local database. Does not touch tracks.
 * @param {Object} options
 * @param {number} [options.limit=15] - Number of channels to pull
 */
export async function pullChannels({limit = debugLimit} = {}) {
	// Use the channels_with_tracks view to get only channels that have tracks
	const {data: channels, error} = await sdk.supabase
		.from('channels_with_tracks')
		.select('*')
		.order('updated_at', {ascending: false})
		.limit(limit)
	if (error) throw error

	console.log('loaded channels', channels)

	await pg.transaction(async (tx) => {
		for (const channel of channels) {
			await tx.sql`
        INSERT INTO channels (id, name, slug, description, image, created_at, updated_at, latitude, longitude, url)
        VALUES (
          ${channel.id}, ${channel.name}, ${channel.slug},
          ${channel.description}, ${channel.image},
          ${channel.created_at}, ${channel.updated_at},
          ${channel.latitude}, ${channel.longitude},
          ${channel.url}
        )
        ON CONFLICT (slug) DO UPDATE SET
          id = EXCLUDED.id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          image = EXCLUDED.image,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          firebase_id = NULL;
      `
		}
	})
	console.log('Pulled channels', channels?.length)
}

/**
 * Pull all tracks for a channel from Radio4000 into local database
 * @param {string} slug - Channel slug
 */
export async function pullTracks(slug) {
	// Mark channel as busy while pulling
	await pg.sql`update channels set busy = true where slug = ${slug}`
	try {
		// Get channel ID for foreign key relationship
		const {rows} = await pg.sql`select id, firebase_id from channels where slug = ${slug}`
		const channel = rows[0]
		if (!channel.id) throw new Error(`Channel not found: ${slug}`)

		// if v1 pull like this instead
		if (channel.firebase_id) {
			return await pullV1Tracks(channel.id, channel.firebase_id, pg)
		}

		// Pull tracks
		const {data, error} = await sdk.channels.readChannelTracks(slug)
		if (error) throw error
		/** @type {import('$lib/types').Track[]} */
		const tracks = data

		await pg.transaction(async (tx) => {
			const CHUNK_SIZE = 50
			for (let i = 0; i < tracks.length; i += CHUNK_SIZE) {
				const chunk = tracks.slice(i, i + CHUNK_SIZE)
				const inserts = chunk.map(
					(track) => tx.sql`
	        INSERT INTO tracks (
	          id, channel_id, url, title, description,
	          discogs_url, created_at, updated_at
	        )
	        VALUES (
	          ${track.id}, ${channel.id}, ${track.url},
	          ${track.title}, ${track.description},
	          ${track.discogs_url}, ${track.created_at}, ${track.updated_at}
	        )
	        ON CONFLICT (id) DO UPDATE SET
	          url = EXCLUDED.url,
	          title = EXCLUDED.title,
	          description = EXCLUDED.description,
	          discogs_url = EXCLUDED.discogs_url,
	          updated_at = EXCLUDED.updated_at
	      `
				)
				await Promise.all(inserts)

				// Yield to UI thread between chunks
				if (i + CHUNK_SIZE < tracks.length) {
					await new Promise((resolve) => setTimeout(resolve, 0))
				}
			}
			console.log('Pulled tracks', tracks?.length)
		})
		// Mark as successfully synced
		await pg.sql`update channels set busy = false, tracks_synced_at = CURRENT_TIMESTAMP where slug = ${slug}`
	} catch (error) {
		// On error, just mark as not busy (tracks_synced_at stays NULL for retry)
		await pg.sql`update channels set busy = false where slug = ${slug}`
		throw error
	}
}

/**
 * Pull a single channel by slug from Radio4000 into local database
 * @param {string} slug - Channel slug
 * @returns {Promise<import('$lib/types').Channel|null>}
 */
export async function pullChannel(slug) {
	const {data: channel, error} = await sdk.channels.readChannel(slug)
	if (error) throw error

	await pg.sql`
			INSERT INTO channels (id, name, slug, description, image, created_at, updated_at)
			VALUES (
				${channel.id}, ${channel.name}, ${channel.slug},
				${channel.description}, ${channel.image},
				${channel.created_at}, ${channel.updated_at}
			)
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name,
				slug = EXCLUDED.slug,
				description = EXCLUDED.description,
				image = EXCLUDED.image,
				updated_at = EXCLUDED.updated_at
		`
	console.log('Pulled channel', channel.slug)

	return channel
}

/**
 * Returns true if a channel's tracks need pulling
 * @param {string} slug - Channel slug
 * @returns {Promise<boolean>}
 */
export async function needsUpdate(slug) {
	try {
		// Get channel ID for remote query
		const {
			rows: [channel]
		} = await pg.sql`select * from channels where slug = ${slug}`

		const {id, firebase_id} = channel

		if (!id) throw new Error(`Channel not found: ${slug}`)

		// Get latest local track update
		const {rows: localRows} = await pg.sql`
      select updated_at
      from tracks
      where channel_id = ${id}
      order by updated_at desc
      limit 1
    `
		const localLatest = localRows[0]

		if (firebase_id) {
			// v1 channels dont need updating because it is in read-only state since before this project
			// @todo fetch tracks from v1 and pull to local??
			console.log('v1 channel do we want to fetch tracks?', localLatest)
			if (!localLatest) return true
		}

		// Get latest remote track update
		const {data: remoteLatest, error: remoteError} = await sdk.supabase
			.from('channel_track')
			.select('updated_at')
			.eq('channel_id', id)
			.order('updated_at', {ascending: false})
			.limit(1)
			.single()
		if (remoteError) throw remoteError

		if (!localLatest) return true

		// If never synced, needs update
		if (!channel.tracks_synced_at) return true

		// Compare timestamps (ignoring milliseconds)
		const remoteMsRemoved = new Date(remoteLatest.updated_at).setMilliseconds(0)
		const localMsRemoved = new Date(localLatest.updated_at).setMilliseconds(0)
		const toleranceMs = 20 * 1000
		const x = remoteMsRemoved - localMsRemoved > toleranceMs
		return x
	} catch (error) {
		console.error('Error checking for updates', error)
		return true // On error, suggest update to be safe
	}
}

/**
 * Batch check which channels need track updates - much faster than individual needsUpdate calls
 * @param {string[]} channelIds - Array of channel IDs to check
 * @returns {Promise<Set<string>>} Set of channel IDs that need updates
 */
export async function needsUpdateBatch(channelIds) {
	if (!channelIds.length) return new Set()

	console.log(`🔍 needsUpdateBatch: Checking ${channelIds.length} channels for updates`)

	try {
		// Get all channel data we need
		const {rows: channels} = await pg.sql`
			select id, slug, tracks_synced_at, firebase_id from channels
			where id = ANY(${channelIds})
		`

		// Filter out v1 channels (they don't need updates)
		const v2Channels = channels.filter((ch) => !ch.firebase_id)
		if (!v2Channels.length) return new Set()

		const v2ChannelIds = v2Channels.map((ch) => ch.id)

		// Single batch query for all remote latest updates
		const {data: remoteUpdates, error: remoteError} = await sdk.supabase
			.from('channel_track')
			.select('channel_id, updated_at')
			.in('channel_id', v2ChannelIds)
			.order('updated_at', {ascending: false})

		if (remoteError) throw remoteError

		// Get latest remote update per channel
		const remoteLatestMap = new Map()
		for (const update of remoteUpdates || []) {
			if (!remoteLatestMap.has(update.channel_id)) {
				remoteLatestMap.set(update.channel_id, update.updated_at)
			}
		}

		// Get all local latest updates in one query
		const {rows: localUpdates} = await pg.sql`
			select channel_id, max(updated_at) as updated_at
			from tracks
			where channel_id = ANY(${v2ChannelIds})
			group by channel_id
		`

		const localLatestMap = new Map()
		for (const update of localUpdates) {
			localLatestMap.set(update.channel_id, update.updated_at)
		}

		// Determine which channels need updates
		const needsUpdateSet = new Set()
		const toleranceMs = 20 * 1000

		console.log(`🔍 needsUpdateBatch: Processing ${v2Channels.length} v2 channels for sync check`)

		for (const channel of v2Channels) {
			const {id, slug, tracks_synced_at} = channel

			// If never synced, needs update
			if (!tracks_synced_at) {
				console.log(`📝 Channel ${slug} (${id}): tracks_synced_at = null -> NEEDS UPDATE`)
				needsUpdateSet.add(id)
				continue
			}

			// If no local tracks, needs update
			if (!localLatestMap.has(id)) {
				console.log(`📝 Channel ${slug} (${id}): no local tracks -> NEEDS UPDATE`)
				needsUpdateSet.add(id)
				continue
			}

			// If no remote tracks, skip
			if (!remoteLatestMap.has(id)) {
				console.log(`📝 Channel ${slug} (${id}): no remote tracks -> SKIP`)
				continue
			}

			// Compare timestamps
			const remoteMs = new Date(remoteLatestMap.get(id)).setMilliseconds(0)
			const localMs = new Date(localLatestMap.get(id)).setMilliseconds(0)

			if (remoteMs - localMs > toleranceMs) {
				console.log(
					`📝 Channel ${slug} (${id}): timestamp diff ${remoteMs - localMs}ms > ${toleranceMs}ms -> NEEDS UPDATE`
				)
				needsUpdateSet.add(id)
			} else {
				console.log(`📝 Channel ${slug} (${id}): up to date (diff: ${remoteMs - localMs}ms)`)
			}
		}

		console.log(
			`🔍 needsUpdateBatch: Final result - ${needsUpdateSet.size} channels need updates:`,
			Array.from(needsUpdateSet)
		)
		return needsUpdateSet
	} catch (error) {
		console.error('Error in batch needs update check', error)
		// On error, return all channel IDs to be safe
		return new Set(channelIds)
	}
}

/**
 * V2 sync pipeline: channels + tracks from SDK
 * @param {Object} options
 * @param {boolean} [options.skipUpdateCheck=false] - Skip update checks and sync all channels
 */
export async function syncV2({skipUpdateCheck = false} = {}) {
	console.time('syncV2')
	await pullChannels()
	// await syncTracks({skipUpdateCheck})
	console.timeEnd('syncV2')
}

/**
 * V1 sync pipeline: channels only from JSON (tracks loaded on-demand)
 */
export async function syncV1() {
	console.time('syncV1')
	await pullV1Channels()
	// we don't sync tracks to save time. they can be loaded on demand
	console.timeEnd('syncV1')
}

/**
 * Complete sync: v1 and v2 pipelines in parallel
 * @param {Object} options
 * @param {boolean} [options.skipUpdateCheck=false] - Skip update checks and sync all channels
 */
export async function sync({skipUpdateCheck = false} = {}) {
	console.time('sync')
	await Promise.all([
		syncV2({skipUpdateCheck}).catch((err) => console.error('V2 sync failed:', err)),
		syncV1().catch((err) => console.error('V1 sync failed:', err))
	])
	console.timeEnd('sync')
}

/**
 * Track sync for v2 channels that need it
 * @param {Object} options
 * @param {boolean} [options.skipUpdateCheck=false] - Skip needsUpdate checks and sync all channels
 */
export async function syncTracks({skipUpdateCheck = false} = {}) {
	let channelsToSync

	if (skipUpdateCheck) {
		// Skip update checks: sync all v2 channels regardless of update status
		console.log('Skipping update checks: syncing all v2 channels')
		const {rows} = await pg.query(`
			SELECT id, slug, name FROM channels
			WHERE firebase_id IS NULL
			ORDER BY name
		`)
		channelsToSync = rows
	} else {
		console.log('checking which channels need updates...')
		const {rows: allChannels} = await pg.query(`
			SELECT id, slug, name FROM channels
			ORDER BY name
		`)
		// WHERE firebase_id IS NULL

		if (allChannels.length === 0) {
			console.log('No v2 channels found')
			return
		}

		const channelIds = allChannels.map((ch) => ch.id)
		const needsUpdateSet = await needsUpdateBatch(channelIds)

		// Filter to only channels that need updates
		channelsToSync = allChannels.filter((ch) => needsUpdateSet.has(ch.id))
		console.log(
			`syncTracks: channelsToSync result - ${channelsToSync.length} channels:`,
			channelsToSync.map((ch) => `${ch.name} (${ch.slug})`)
		)

		console.log(`Check result: ${needsUpdateSet.size}/${allChannels.length} channels need updates`)
	}

	if (channelsToSync.length === 0) {
		console.log('✅ All channels up to date')
		return
	}

	console.log(`Syncing tracks for ${channelsToSync.length} channels`)

	// Process channels in batches for concurrency
	const CONCURRENCY = 8
	const batches = []
	for (let i = 0; i < channelsToSync.length; i += CONCURRENCY) {
		batches.push(channelsToSync.slice(i, i + CONCURRENCY))
	}

	for (const batch of batches) {
		await Promise.all(
			batch.map(async (channel) => {
				try {
					console.log(`  • Syncing tracks for: ${channel.name}`)
					await pullTracks(channel.slug)
				} catch (error) {
					console.error(`  ❌ Failed to sync tracks for ${channel.name}:`, error)
					// Continue to next channel - error handling is in pullTracks
				}
			})
		)

		// Yield to UI thread between batches
		if (batches.indexOf(batch) < batches.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, 10))
		}
	}

	console.log('√ Completed track sync')
}

/**
 * Sync for a single channel - only pulls tracks if channel needs updating
 * @param {string} slug - Channel slug
 * @param {Object} options
 * @param {boolean} [options.skipUpdateCheck=false] - Skip update check and always pull
 * @returns {Promise<boolean>} - True if tracks were pulled, false if skipped
 */
export async function syncChannel(slug, {skipUpdateCheck = false} = {}) {
	if (!skipUpdateCheck) {
		const needs = await needsUpdate(slug)
		if (!needs) {
			console.log(`Skipping ${slug} - already up to date`)
			return false
		}
	}

	await pullTracks(slug)
	return true
}

/**
 * Dry run - check what would be synced without actually syncing
 * @param {Object} options
 * @param {boolean} [options.skipUpdateCheck=false] - Check behavior when skipping update checks
 * @returns {Promise<Object>} Analysis of what would be synced
 */
export async function dryRun({skipUpdateCheck = false} = {}) {
	let analysis

	// Get all v2 channels
	const {rows: allChannels} = await pg.query(`
		SELECT id, slug, name, tracks_synced_at FROM channels
		WHERE firebase_id IS NULL
		ORDER BY name
	`)

	if (allChannels.length === 0) {
		analysis = {
			total: 0,
			needsSync: 0,
			upToDate: 0,
			channels: [],
			wouldSync: []
		}
	}

	let channelsNeedingSync = []

	if (skipUpdateCheck) {
		channelsNeedingSync = allChannels
	} else {
		// Use batch logic for efficiency
		const channelIds = allChannels.map((ch) => ch.id)
		const needsUpdateSet = await needsUpdateBatch(channelIds)
		channelsNeedingSync = allChannels.filter((ch) => needsUpdateSet.has(ch.id))
	}

	analysis = {
		total: allChannels.length,
		needsSync: channelsNeedingSync.length,
		upToDate: allChannels.length - channelsNeedingSync.length,
		channels: allChannels.map((ch) => ({
			slug: ch.slug,
			name: ch.name,
			lastSynced: ch.tracks_synced_at,
			needsSync: channelsNeedingSync.some((sync) => sync.id === ch.id)
		})),
		wouldSync: channelsNeedingSync.map((ch) => ({slug: ch.slug, name: ch.name}))
	}

	console.log(
		`Dry run sync analysis (${skipUpdateCheck ? 'skip checks' : 'check'} mode):`,
		analysis
	)
	if (analysis.needsSync > 0) {
		console.log(`  • Would sync: ${analysis.wouldSync.map((ch) => ch.slug).join(', ')}`)
	}

	return analysis
}
