/**
 * Process items in batches with concurrency control
 * @template T, R
 * @param {T[]} items
 * @param {(item: T) => Promise<R>} fn
 * @param {Object} options
 * @param {number} [options.size=50] - Batch size
 * @param {number|'unbounded'} [options.concurrency=1] - Concurrency within batch
 * @param {'fail-fast'|'collect-all'} [options.strategy='fail-fast'] - Error handling strategy
 * @returns {Promise<R[]>}
 */
export async function batcher(items, fn, {size = 50, concurrency = 1, strategy = 'fail-fast'} = {}) {
	const results = []
	
	for (let i = 0; i < items.length; i += size) {
		const batch = items.slice(i, i + size)
		
		if (concurrency === 'unbounded' || concurrency >= batch.length) {
			// Process batch in parallel
			const promises = batch.map(fn)
			const batchResults = strategy === 'fail-fast' 
				? await Promise.all(promises)
				: await Promise.allSettled(promises)
			results.push(...batchResults)
		} else if (concurrency === 1) {
			// Sequential processing
			for (const item of batch) {
				try {
					const result = await fn(item)
					results.push(result)
				} catch (error) {
					if (strategy === 'fail-fast') throw error
					results.push({status: 'rejected', reason: error})
				}
			}
		} else {
			// Limited concurrency within batch
			for (let j = 0; j < batch.length; j += concurrency) {
				const chunk = batch.slice(j, j + concurrency)
				const promises = chunk.map(fn)
				const chunkResults = strategy === 'fail-fast'
					? await Promise.all(promises)
					: await Promise.allSettled(promises)
				results.push(...chunkResults)
			}
		}
		
		// Yield to UI thread between batches
		if (i + size < items.length) {
			await new Promise(resolve => setTimeout(resolve, 0))
		}
	}
	
	return results
}