import {browser} from '$app/environment'
import {initDb} from '$lib/db'
import {sdk} from '@radio4000/sdk'

// Disable server-side rendering for all routes by default. Otherwise we can't use pglite + indexeddb.
export const ssr = false

/** @type {import('./$types').LayoutLoad} */
export async function load() {
	let pg = null
	let preloading = true

	if (browser) {
		try {
			await initDb() // Creates PGlite instance and runs migrations
			pg = true // Signal that pg is ready
			window.r5 = {pg, sdk}
		} catch (err) {
			console.error('Failed to initialize database:', err)
		} finally {
			preloading = false
		}
	}

	return {pg, sdk, preloading}
}
