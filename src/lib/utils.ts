export function uuid() {
	return self.crypto.randomUUID()
}

export async function delay(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

/**
 * Awaits a query and returns the first row or undefined. Use for getFirstRow(pg.sql`select * from channels where id = 1`) style queries
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

export function trimWithEllipsis(text?: string, maxLength: number = 267) {
	return !text || text.length <= maxLength ? text || '' : text.substring(0, maxLength) + '…'
}

export function parseSearchTokens(query) {
	const mentions = query.match(/@\w+/g) || []
	const cleanQuery = query.replace(/@\w+/g, '').trim()
	return {
		text: cleanQuery,
		mentions: mentions.map((m) => m.slice(1)) // remove @
	}
}

export function extractYouTubeId(url) {
	const patterns = [
		/(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/
	]
	for (const pattern of patterns) {
		const match = url.match(pattern)
		if (match) return match[1]
	}
	return null
}

