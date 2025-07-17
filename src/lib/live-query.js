import {pg} from '$lib/db'

/**
 * Checks if two parameter arrays are equal
 */
function paramsEqual(a, b) {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}
	return true
}

/**
 * Sets up a live query subscription that auto-cleans up with Svelte 5 $effect
 * Use inside $effect(() => { setupLiveQuery(...) })
 * @param {string} query - SQL query string
 * @param {any[]} params - Query parameters
 * @param {(result: any) => void} callback - Callback for query results
 */
export function setupLiveQuery(query, params = [], callback) {
	let cancelled = false
	let subscription = null

	// Start the subscription
	pg.live
		.query(query, params, (result) => {
			if (!cancelled) {
				callback(result)
			}
		})
		.then((sub) => {
			subscription = sub
		})

	// Return cleanup function for $effect
	return () => {
		cancelled = true
		subscription?.unsubscribe()
	}
}

/**
 * Sets up an incremental live query subscription that auto-cleans up with Svelte 5 $effect
 * Use inside $effect(() => { setupIncrementalLiveQuery(...) })
 * @param {string} query - SQL query string
 * @param {any[]} params - Query parameters
 * @param {string} key - Key field for incremental updates
 * @param {(result: any) => void} callback - Callback for query results
 */
export function setupIncrementalLiveQuery(query, params = [], key, callback) {
	let cancelled = false
	let subscription = null

	// Start the subscription
	pg.live
		.incrementalQuery(query, params, key, (result) => {
			if (!cancelled) {
				callback(result)
			}
		})
		.then((sub) => {
			subscription = sub
		})

	// Return cleanup function for $effect
	return () => {
		cancelled = true
		subscription?.unsubscribe()
	}
}
