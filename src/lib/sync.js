import {pg} from '$lib/db'
import {sdk} from '@radio4000/sdk'

/**
 * Loads all channels from Radio4000 API into the local database
 * @param {number} limit
 */
export async function syncChannels(limit = 10) {
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
        updated_at = EXCLUDED.updated_at
    `
		}
	})
	console.timeEnd('syncChannels')
}

/**
 * Loads all tracks for a channel from Radio4000 API into the local database
 * @param {string} slug
 */
export async function syncTracks(slug) {
	console.time('syncTracks')

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
	console.timeEnd('syncTracks')
}
