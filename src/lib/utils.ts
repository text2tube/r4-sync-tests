export function uuid() {
	return self.crypto.randomUUID()
}

export async function delay(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

/**
 * Awaits a query and returns the first row or undefined
 * @template T
 * @param {Promise<{rows: T[]}>} query
 * @returns {Promise<T|undefined>}
 */
export async function getFirstRow(query) {
	try {
		const result = await query
		if (result.rows) return result.rows[0]
		return undefined
	} catch (err) {
		console.error('Query error:', err)
		return undefined
	}
}
