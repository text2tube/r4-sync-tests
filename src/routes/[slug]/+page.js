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

	/** @type {import('$lib/types').Channel} */
	let channel = (await pg.query('SELECT * FROM channels WHERE slug = $1', [slug])).rows[0]

	if (!channel) {
		try {
			await pullChannel(slug)
			channel = (await pg.query('SELECT * FROM channels WHERE slug = $1', [slug])).rows[0]
		} catch (err) {
			console.error('channel_page:load_error', err)
		}
	}

	if (!channel) error(404, 'Channel not found')

	if (channel && (await needsUpdate(slug))) await pullTracks(slug)

	// console.log('channel_page:load', channel, {slug, search, order, dir})

	return {
		channel,
		slug,
		search,
		order,
		dir
	}
}
