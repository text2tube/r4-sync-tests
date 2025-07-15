import {pg} from '$lib/db'
import {error} from '@sveltejs/kit'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params}) {
	// Make sure we have the db.
	await parent()
	if (!pg) error(500, 'Database connection error')

	// Get URL params
	const {slug, tid} = params

	// Query local track
	const {rows} = await pg.query('SELECT * FROM tracks WHERE id = $1', [tid])

	/** @type {import('$lib/types').Track} */
	let track = rows[0]

	if (!track) {
		error(404, 'Track not found')
	}

	console.log({track})

	// Get channel info
	const {rows: channelRows} = await pg.query('SELECT * FROM channels WHERE id = $1', [track.channel_id])
	const channel = channelRows[0]

	// Verify the slug matches the channel
	if (!channel || channel.slug !== slug) {
		error(404, 'Track not found in this channel')
	}

	console.log({channel})

	return {
		track,
		channel,
		slug,
		tid
	}
}
