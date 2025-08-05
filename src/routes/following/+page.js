import {appState} from '$lib/app-state.svelte'
import {pullFollowers} from '$lib/sync'
import {pg} from '$lib/db'

/** @type {import('./$types').PageLoad} */
export async function load({parent}) {
	await parent()
	if (!appState.channels?.length) {
		return {followings: []}
	}

	const userChannelId = appState.channels[0]

	// Pull remote favorites
	try {
		console.log(1)
		await pullFollowers(userChannelId)
		console.log(2)
	} catch (err) {
		console.error('Failed to sync remote favorites:', err)
	}

	// Load from local db after sync
	const {rows} = await pg.sql`
		SELECT f.channel_id, f.created_at, c.name, c.slug, c.image, c.description
		FROM followers f
		LEFT JOIN channels c ON f.channel_id = c.id
		WHERE f.follower_id = ${userChannelId}
		ORDER BY f.created_at DESC
	`

	console.log(rows, userChannelId)

	const followings = rows.map((row) => ({
		id: row.channel_id,
		name: row.name || `Channel ${row.channel_id.slice(0, 8)}...`,
		slug: row.slug,
		image: row.image,
		description: row.description,
		created_at: row.created_at
	}))

	return {followings}
}
