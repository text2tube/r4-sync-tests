/**
 * Process items in batches with concurrency control
 * @template T, R
 * @param {T[]} items
 * @param {(item: T) => Promise<R>} fn
 * @param {Object} options
 * @param {number} [options.size=50] - Batch size
 * @param {number|'unbounded'} [options.concurrency=1] - Concurrency within batch
 * @returns {Promise<PromiseSettledResult<R>[]>}
 */
export async function batcher(items, fn, {size = 50, concurrency = 1} = {}) {
	const results = []

	for (let i = 0; i < items.length; i += size) {
		const batch = items.slice(i, i + size)

		if (concurrency === 'unbounded' || concurrency >= batch.length) {
			// Process batch in parallel
			const promises = batch.map(fn)
			const batchResults = await Promise.allSettled(promises)
			results.push(...batchResults)
		} else if (concurrency === 1) {
			// Sequential processing
			for (const item of batch) {
				try {
					const result = await fn(item)
					results.push(
						/** @type {PromiseFulfilledResult<R>} */ ({status: 'fulfilled', value: result})
					)
				} catch (error) {
					results.push(/** @type {PromiseRejectedResult} */ ({status: 'rejected', reason: error}))
				}
			}
		} else {
			// Limited concurrency within batch
			for (let j = 0; j < batch.length; j += concurrency) {
				const chunk = batch.slice(j, j + concurrency)
				const promises = chunk.map(fn)
				const chunkResults = await Promise.allSettled(promises)
				results.push(...chunkResults)
			}
		}

		// Yield to UI thread between batches
		if (i + size < items.length) {
			await new Promise((resolve) => setTimeout(resolve, 0))
		}
	}

	return results
}
