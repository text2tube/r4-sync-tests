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
