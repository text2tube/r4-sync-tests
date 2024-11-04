import {pg} from '$lib/db'
import {sdk} from '@radio4000/sdk'

/**
 * Pull channel metadata from Radio4000 into local database
 * @param {Object} options
 * @param {number} [options.limit=15] - Number of channels to pull
 */
export async function pullChannels({limit = 150} = {}) {
	const {data: channels, error} = await sdk.channels.readChannels(limit)
	if (error) throw error

	await pg.transaction(async (tx) => {
		for (const channel of channels) {
			await tx.sql`
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
          updated_at = EXCLUDED.updated_at;
      `
		}
	})
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
		const {rows} = await pg.sql`select id from channels where slug = ${slug}`
		const channelId = rows[0]?.id
		if (!channelId) throw new Error(`Channel not found: ${slug}`)

		// Pull tracks
		const {data, error} = await sdk.channels.readChannelTracks(slug)
		if (error) throw error
		await pg.transaction(async (tx) => {
			/** @type {import('$lib/types').Track[]} */
			const tracks = data
			const inserts = tracks.map(
				(track) => tx.sql`
        INSERT INTO tracks (
          id, channel_id, url, title, description, 
          discogs_url, created_at, updated_at
        )
        VALUES (
          ${track.id}, ${channelId}, ${track.url}, 
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
		})
	} finally {
		// Always mark channel as not busy when done
		await pg.sql`update channels set busy = false, tracks_outdated = false where slug = ${slug}`
	}
}

/**
 * Check if a channel's tracks need pulling
 * @param {string} slug - Channel slug
 * @returns {Promise<boolean>}
 */
export async function needsUpdate(slug) {
	try {
		// Get channel ID for remote query
		const {rows} = await pg.sql`select id from channels where slug = ${slug}`
		const channelId = rows[0]?.id
		if (!channelId) throw new Error(`Channel not found: ${slug}`)

		// Get latest remote track update
		const {data: remoteLatest, error: remoteError} = await sdk.supabase
			.from('channel_track')
			.select('updated_at')
			.eq('channel_id', channelId)
			.order('updated_at', {ascending: false})
			.limit(1)
			.single()
		if (remoteError) throw remoteError

		// Get latest local track update
		const {rows: localRows} = await pg.sql`
      select updated_at 
      from tracks 
      where channel_id = ${channelId}
      order by updated_at desc 
      limit 1
    `
		const localLatest = localRows[0]
		if (!localLatest) return true

		// Compare timestamps (ignoring milliseconds)
		const remoteMsRemoved = new Date(remoteLatest.updated_at).setMilliseconds(0)
		const localMsRemoved = new Date(localLatest.updated_at).setMilliseconds(0)
		const toleranceMs = 20 * 1000
		return remoteMsRemoved - localMsRemoved > toleranceMs
	} catch (error) {
		console.error('Error checking for updates', error)
		return true // On error, suggest update to be safe
	}
}
