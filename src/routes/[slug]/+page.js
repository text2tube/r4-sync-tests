import {syncChannel, pullChannel} from '$lib/sync'
import {pg} from '$lib/db'
import {error} from '@sveltejs/kit'

/** @type {import('./$types').PageLoad} */
export async function load({params, url}) {
	const {slug} = params
	const search = url.searchParams.get('search') || ''
	const order = url.searchParams.get('order') || 'created'
	const dir = url.searchParams.get('dir') || 'desc'

	const {rows} = await pg.query('SELECT * FROM channels WHERE slug = $1', [slug])
	let channel = rows[0]

	// If not found locally, pull from SDK
	try {
		if (!channel) {
			channel = await pullChannel(slug)
			console.log('channel after pull', channel)
		}
	} catch (err) {
		console.error('Error pulling channel:', err)
		error(404, 'Channel not found')
	}

	await syncChannel(slug)
	console.log('channel after sync', channel)

	return {
		channel,
		slug,
		search,
		order,
		dir
	}
}
