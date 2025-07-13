import {browser} from '$app/environment'
import {initDb, pg} from '$lib/db'
import {sdk} from '@radio4000/sdk'
import {subscribeToAppState} from '$lib/api'

// Disable server-side rendering for all routes by default. Otherwise we can't use pglite + indexeddb.
export const ssr = false

/** @type {import('./$types').LayoutLoad} */
export async function load() {
	let preloading = true

	/** @type {import('$lib/types').AppState} */
	let appState = {}

	try {
		await initDb()
		subscribeToAppState((state) => {
			appState = state
		})
	} catch (err) {
		console.error('Failed to initialize database:', err)
	} finally {
		preloading = false
	}

	return {pg, sdk, preloading, appState}
}

// @ts-expect-error just for debugging
if (browser) window.r5 = {pg, sdk}
