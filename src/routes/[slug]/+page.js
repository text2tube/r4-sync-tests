import {needsUpdate, pullChannel, pullTracks} from '$lib/sync'
import {pg} from '$lib/db'
import {error} from '@sveltejs/kit'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params, url}) {
	// Make sure we have the db.
	await parent()
	if (!pg) error(500, 'Database connection error')

	// Get URL params
	const {slug} = params
	const search = url.searchParams.get('search') || ''
	const order = url.searchParams.get('order') || 'created'
	const dir = url.searchParams.get('dir') || 'desc'

	// Query local channel
	const {rows} = await pg.query('SELECT * FROM channels WHERE slug = $1', [slug])

	/** @type {import('$lib/types').Channel} */
	let channel = rows[0]

	// If not found locally, pull from remote
	try {
		if (!channel) await pullChannel(slug)
	} catch (err) {
		console.error('Error pulling channel:', err)
		error(404, 'Channel not found')
	}

	// and make sure it's up to date
	if ((await needsUpdate(slug))) await pullTracks(slug)

	return {
		channel,
		slug,
		search,
		order,
		dir
	}
}
