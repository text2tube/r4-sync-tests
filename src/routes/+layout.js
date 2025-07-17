import {browser} from '$app/environment'
import {pg, migrateDb} from '$lib/db'
import {sdk} from '@radio4000/sdk'
import {logger} from '$lib/logger'

const log = logger.ns('layout').seal()

// Disable server-side rendering for all routes by default. Otherwise we can't use pglite + indexeddb.
export const ssr = false

/** @type {import('./$types').LayoutLoad} */
export async function load() {
	log.log('load')
	let preloading = true

	if (browser) {
		try {
			await migrateDb()
			// @ts-expect-error debugging
			window.r5 = {pg, sdk}
		} catch (err) {
			// console.error('Failed to initialize database:', err)
			log.error('load_error_migrate', err)
		} finally {
			preloading = false
			log.log('load_done')
		}
	}

	return {pg, sdk, preloading}
}
