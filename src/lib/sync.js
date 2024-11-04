import {pg} from '$lib/db'
import {sdk} from '@radio4000/sdk'

/**
 * Loads all channels from Radio4000 API into the local database
 * @param {number} limit
 */
export async function syncChannels(limit = 15) {
	console.time('syncChannels')

	const {data: channels, error} = await sdk.channels.readChannels(limit)
	if (error) throw error

	await pg.transaction(async (tx) => {
		for (const channel of channels) {
			await tx.sql`
      INSERT INTO channels (id, name, slug, description, image, created_at, updated_at)
      VALUES (
        ${channel.id},
        ${channel.name},
        ${channel.slug},
        ${channel.description},
        ${channel.image},
        ${channel.created_at},
        ${channel.updated_at}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        image = EXCLUDED.image,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at;
    `
		}
	})
	console.timeEnd('syncChannels')
}

/**
 * Pulls R4 tracks for a single channel into the local database
 * @param {string} slug
 */
export async function syncTracks(slug) {
	await pg.sql`update channels set busy = ${true} where slug = ${slug}`
	const {data: tracks, error} = await sdk.channels.readChannelTracks(slug)
	if (error) throw error

	const {rows} = await pg.sql`select id from channels where slug = ${slug}`
	const channelId = rows[0]?.id
	if (!channelId) throw new Error('Failed to sync tracks, missing channel id')

	await pg.transaction(async (tx) => {
		const inserts = tracks.map(
			(track) => tx.sql`
      INSERT INTO tracks (id, channel_id, url, title, description, discogs_url, created_at, updated_at)
      VALUES (
        ${track.id},
        ${channelId},
        ${track.url},
        ${track.title},
        ${track.description},
        ${track.discogs_url},
        ${track.created_at},
        ${track.updated_at}
      )
      ON CONFLICT (id) DO UPDATE SET
        url = EXCLUDED.url,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        discogs_url = EXCLUDED.discogs_url,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `
		)
		await Promise.all(inserts) // Key change: await the promises inside the transaction
	})
	await pg.sql`update channels set tracks_outdated = ${false}, busy = ${false} where slug = ${slug}`
	console.log(`syncTracks`, slug)
}

/**
 * Compares the latest updated track on local vs R4
 * @param {string} channelId
 * @returns {Promise<boolean>}
 */
export async function shouldReloadTracks(channelId) {
	try {
		// Get latest track update from remote
		const {data: remoteLatest, error: remoteError} = await sdk.supabase
			.from('channel_track')
			.select('track_id, updated_at')
			.eq('channel_id', channelId)
			.order('updated_at', {ascending: false})
			.limit(1)
			.single()
		if (remoteError) throw remoteError

		// const ids = [1,2,3]
		// await sdk.supabase
		// 	.from('channel_track')
		// 	.select('track_id, updated_at')
		// 	.in('channel_id', [ids])
		// 	.order('updated_at', {ascending: false})

		// Get latest track update from local DB
		const {rows} =
			await pg.sql`select id, updated_at from tracks where channel_id = ${channelId} order by updated_at desc limit 1`
		const localLatest = rows[0]
		// If no local tracks, definitely reload
		if (!localLatest) return true

		// Compare timestamps (ignoring milliseconds)
		const a = new Date(remoteLatest.updated_at).setMilliseconds(0)
		const b = new Date(localLatest.updated_at).setMilliseconds(0)
		const tolerance = 20 * 1000
		return a - b > tolerance
	} catch (error) {
		console.error('Error checking track updates:', error)
		// On error, reload to be safe
		return true
	}
}

/** Pulls tracks for all channels (respecting "shouldReload") */
export async function syncChannelTracks() {
	const {rows: channels} = await pg.sql`select * from channels;`
	console.time('syncChannelTracks')
	// const promises = res.rows.map((c) => syncTracks(c.slug))
	// const what = await Promise.allSettled(promises)
	// await Promise.allSettled(channels.map(c => shouldReloadTracks(c.id)))
	// await Promise.allSettled(channels.filter(c => c.tracks_outdated).map(c => syncTracks(c.slug)))
	for (const channel of channels) {
		try {
			const needsUpdate = await shouldReloadTracks(channel.id)
			if (needsUpdate) {
				// await pg.sql`update channels set busy = ${true} where id = ${channel.id}`
				console.log(channel.slug, {needsUpdate})
				await syncTracks(channel.slug)
				// await pg.sql`update channels set busy = ${false} where id = ${channel.id}`
			} else {
				await pg.sql`update channels set tracks_outdated = ${needsUpdate} where id = ${channel.id}`
				// console.log(channel.slug, {needsUpdate})
			}
		} catch (err) {
			console.err(err)
		}
	}
	console.timeEnd('syncChannelTracks')
}
