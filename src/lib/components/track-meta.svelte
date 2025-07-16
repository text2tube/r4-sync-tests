<script>
	const {track} = $props()

	let loading = $state(false)
	let error = $state(null)

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

	async function searchMusicBrainz(title) {
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

	let searchInfo = $state(null)

	$effect(() => {
		if (track?.title) {
			loading = true
			error = null
			searchInfo = null

			searchMusicBrainz(track.title).then((result) => {
				if (result) {
					searchInfo = result
					console.log('MusicBrainz metadata for:', track.title, result)
				} else {
					error = 'No matches found'
				}
				loading = false
			})
		}
	})
</script>

{#if loading}
	<p>Loading MusicBrainz metadata...</p>
{:else if error}
	<p>Error: {error}</p>
{:else if searchInfo}
	{@const recording = searchInfo.recording}
	{@const artist = recording['artist-credit']?.map((ac) => ac.name).join(', ')}
	{@const duration = recording.length
		? `${Math.floor(recording.length / 60000)}:${String(Math.floor((recording.length % 60000) / 1000)).padStart(2, '0')}`
		: null}
	{@const releaseDate = recording['first-release-date']}

	{@const primaryRelease =
		recording.releases?.find(
			(r) =>
				r.status === 'Official' &&
				r['release-group']?.['primary-type'] === 'Album' &&
				!r['release-group']?.['secondary-types']?.includes('Compilation')
		) ||
		recording.releases?.find(
			(r) => r.status === 'Official' && r['release-group']?.['primary-type'] === 'EP'
		) ||
		recording.releases?.[0]}

	<div>
		<p>
			Please note, we searched MusicBrainz for the track title. This might not be the track you are
			looking for. But it also might be.
		</p>
		<p>
			MusicBrainz ID: {recording.id}<br />
			recording title: {recording.title}<br />
			artist: {artist}<br />
			duration: {duration}<br />
			primary release: {primaryRelease.title}<br />
			release date: {releaseDate}<br />
			release date: {new Date(releaseDate).toLocaleDateString()}<br />
			tags: {recording.tags?.map((tag) => tag.name).join(', ')}<br />
		</p>

		{#if recording.releases && recording.releases.length > 1}
			<details>
				<summary><strong>All Releases ({recording.releases.length})</strong></summary>
				<ul>
					{#each recording.releases as release (release.id)}
						<li>
							<strong>{release.title}</strong>
							{#if release.date}({release.date}){/if}
							- {release.status}
							{#if release['release-group']?.['primary-type']}
								{release['release-group']['primary-type']}
							{/if}
							{#if release['release-group']?.['secondary-types']}
								({release['release-group']['secondary-types'].join(', ')})
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/if}

		<details>
			<summary><strong>Search Debug</strong></summary>
			<p>
				original: {searchInfo.originalTitle}<br />
				cleaned: {searchInfo.parsed.cleaned}<br />
				strategy: {searchInfo.searchDescription}<br />
				score: {recording.score}%
			</p>
		</details>
	</div>
{:else}
	<p>No MusicBrainz metadata found for "{track.title}"</p>
{/if}
