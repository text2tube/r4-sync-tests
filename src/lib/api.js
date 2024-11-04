import {pg} from '$lib/db'
import {needsUpdate, pullTracks} from '$lib/sync'

/** @param {import('$lib/types').Channel} channel */
export async function playChannel(channel) {
	const {id, slug} = channel

	// Update app_state to play the channel
	await pg.sql`
    INSERT INTO app_state (id, playlist_slug)
    VALUES (1, ${slug})
    ON CONFLICT (id) DO UPDATE SET playlist_slug = EXCLUDED.playlist_slug
  `

	// Check if we need to sync tracks
	const {rows: tracks} = await pg.sql`select * from tracks where channel_id = ${id}`
	console.log('Play channel', slug, tracks?.length)
	if (!tracks.length) {
		await pullTracks(slug)
	}

	// Update app_state to indicate we want to play the channel
	await pg.sql`
    INSERT INTO app_state (id, playlist_slug)
    VALUES (1, ${slug})
    ON CONFLICT (id) DO UPDATE SET playlist_slug = EXCLUDED.playlist_slug
  `

	// In the background, maybe update tracks.
	if (await needsUpdate(slug)) {
		await pullTracks(slug)
	}
}
