export async function searchMusicBrainz(title) {
	if (!title) return null

	const parsed = parseTrackTitle(title)

	// Try multiple search strategies in order of specificity
	const searchStrategies = []

	if (parsed.artist) {
		// Strategy 1: Exact artist and title search
		searchStrategies.push({
			query: `artist:"${parsed.artist}" AND recording:"${parsed.title}"`,
			description: `Artist: "${parsed.artist}" + Title: "${parsed.title}"`
		})

		// Strategy 2: Fuzzy artist and title search
		searchStrategies.push({
			query: `artist:${parsed.artist} AND recording:${parsed.title}`,
			description: `Fuzzy artist + title search`
		})
	}

	// Strategy 3: Just title search (exact)
	searchStrategies.push({
		query: `recording:"${parsed.title}"`,
		description: `Title only: "${parsed.title}"`
	})

	// Strategy 4: Just title search (fuzzy)
	searchStrategies.push({
		query: `recording:${parsed.title}`,
		description: `Fuzzy title search`
	})

	// Try each strategy until we get a good result
	for (const strategy of searchStrategies) {
		try {
			const encodedQuery = encodeURIComponent(strategy.query)
			const response = await fetch(
				`https://musicbrainz.org/ws/2/recording?query=${encodedQuery}&fmt=json&limit=1`
			)

			if (response.ok) {
				const data = await response.json()
				if (data.recordings && data.recordings.length > 0) {
					return {
						recording: data.recordings[0], // Just return the best match
						searchQuery: strategy.query,
						searchDescription: strategy.description,
						parsed,
						originalTitle: title
					}
				}
			}
		} catch (error) {
			console.error(`Search strategy failed:`, strategy.query, error)
		}
	}

	return null
}

function cleanTitle(title) {
	return (
		title
			// Remove everything after // or similar separators (album info, etc.)
			.replace(/\s*(\/\/|\\\\|\|\||--)\s*.+$/, '')
			// Remove parenthetical info at end
			.replace(/\s*\([^)]+\)$/, '')
			// Remove bracketed info at end
			.replace(/\s*\[[^\]]+\]$/, '')
			// Remove feat/featuring info
			.replace(/\s*(feat\.?|ft\.?|featuring|with)\s+.+$/i, '')
			// Remove remix/edit info
			.replace(/\s*(remix|edit|version|mix|dub)\s*.+$/i, '')
			.trim()
	)
}

function parseTrackTitle(title) {
	const cleanedTitle = cleanTitle(title)

	// Try different separators
	const separators = [' - ', ' – ', ': ', ' | ', ' by ']

	for (const sep of separators) {
		const parts = cleanedTitle.split(sep)
		if (parts.length === 2) {
			return {
				artist: parts[0].trim(),
				title: parts[1].trim(),
				cleaned: cleanedTitle
			}
		}
	}

	return {
		artist: null,
		title: cleanedTitle,
		cleaned: cleanedTitle
	}
}
