import {needsUpdate, pullTracks} from '$lib/sync'

/** @type {import('./$types').PageLoad} */
export async function load({params, url}) {
	const {slug} = params
	const search = url.searchParams.get('search') || ''
	const order = url.searchParams.get('order') || 'created'
	const dir = url.searchParams.get('dir') || 'desc'

	try {
		if (await needsUpdate(slug)) {
			pullTracks(slug) // Don't await - page loads immediately, tracks sync in background
		}
	} catch (error) {
		console.error('Error checking tracks sync:', error)
	}

	return {
		slug,
		search,
		order,
		dir
	}
}
