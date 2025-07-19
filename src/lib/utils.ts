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

export function differenceInDays(dateString: string) {
	const date = new Date(dateString).getTime()
	const today = new Date().getTime()
	const diffTime = Math.abs(today - date)
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function relativeDate(dateString: string) {
	const days = differenceInDays(dateString)
	return `${days} day${days > 1 ? 's' : ''} ago`
}

/** Returns a fancy cosmic time duration string */
export function relativeDateSolar(dateString: string) {
	const days = differenceInDays(dateString)
	const years = Math.floor(days / 365)
	const remainingDays = days % 365
	const yearsString = years ? `${years} sun orbit${years > 1 ? 's' : ''}` : ''
	const andString = years && remainingDays ? ', ' : ''
	const daysString = `${remainingDays} earth rotation${remainingDays > 1 ? 's' : ''}`
	return `${yearsString}${andString}${daysString}`
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
		/(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/,
	]
	for (const pattern of patterns) {
		const match = url.match(pattern)
		if (match) return match[1]
	}
	return null
}

