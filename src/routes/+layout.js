// Disable server-side rendering for all routes by default. Otherwise we can't use pglite + indexeddb.
export const ssr = false

import {browser} from '$app/environment'
import {initDb, pg} from '$lib/db'
import {sdk} from '@radio4000/sdk'

// @ts-expect-error just for debugging
if (browser) window.r5 = {pg, sdk}

/** @type {import('./$types').LayoutLoad} */
export async function load() {
	let preloading = true

	try {
		await initDb()
	} catch (err) {
		console.error('Failed to initialize database:', err)
	} finally {
		preloading = false
	}

	return {pg, sdk, preloading}
}
