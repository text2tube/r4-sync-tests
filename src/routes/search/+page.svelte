<script>
	import {onMount} from 'svelte'
	import {page} from '$app/stores'
	import {goto} from '$app/navigation'
	import {IconSearch} from 'obra-icons-svelte'
	import {pg} from '$lib/db.ts'
	import {subscribeToAppState, playTrack, playTracks, addToPlaylist} from '$lib/api'
	import Tracklist from '$lib/components/tracklist.svelte'
	import ChannelCard from '$lib/components/channel-card.svelte'

	/** @type {AppState} */
	let appState = $state({})
	subscribeToAppState((state) => {
		appState = state
	})

	/** @type {import('$lib/types.ts').Channel[]} */
	let channels = $state([])

	/** @type {import('$lib/types.ts').Track[]} */
	let tracks = $state([])

	/** @type {import('$lib/types.ts').Channel[]} */
	let channelSummary = $state([])

	let searchQuery = $state('')
	let isLoading = $state(false)
	let debounceTimer = $state()
	
	/** Parse search tokens from query */
	function parseSearchTokens(query) {
		const mentions = query.match(/@\w+/g) || []
		const cleanQuery = query.replace(/@\w+/g, '').trim()
		return {
			text: cleanQuery,
			mentions: mentions.map(m => m.slice(1)) // remove @
		}
	}

	onMount(() => {
		const urlSearch = $page.url.searchParams.get('search')
		if (urlSearch) {
			searchQuery = urlSearch
			performSearch()
		}
	})

	function debouncedSearch() {
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(performSearch, 200)
	}

	async function performSearch() {
		if (!searchQuery.trim()) {
			channels = []
			tracks = []
			channelSummary = []
			return
		}

		isLoading = true
		const tokens = parseSearchTokens(searchQuery)
		const query = `%${tokens.text.toLowerCase()}%`
		const mention = tokens.mentions[0] // Use first mention for now

		console.log('querying', {query, mention, tokens})

		try {
			// Only search channels by name/description if no mention (since @mention targets specific channel)
			let channelResults = {rows: []}
			if (!mention) {
				channelResults = await pg.query(
					`
					SELECT id, name, slug, description, image
					FROM channels 
					WHERE LOWER(name) LIKE $1 
					   OR LOWER(slug) LIKE $1 
					   OR LOWER(description) LIKE $1
					ORDER BY name
				`,
					[query]
				)
			}

			// Track search with optional channel filter
			const trackQuery = mention 
				? `
					SELECT t.id, t.title, t.description, t.url, t.channel_id,
					       c.name as channel_name, c.slug as channel_slug
					FROM tracks t
					JOIN channels c ON t.channel_id = c.id
					WHERE c.slug = $2
					  AND (LOWER(t.title) LIKE $1 
					       OR LOWER(t.description) LIKE $1
					       OR LOWER(t.url) LIKE $1)
					ORDER BY t.title
				`
				: `
					SELECT t.id, t.title, t.description, t.url, t.channel_id,
					       c.name as channel_name, c.slug as channel_slug
					FROM tracks t
					JOIN channels c ON t.channel_id = c.id
					WHERE LOWER(t.title) LIKE $1 
					   OR LOWER(t.description) LIKE $1 
					   OR LOWER(t.url) LIKE $1
					ORDER BY t.title
				`

			const trackParams = mention ? [query, mention] : [query]
			const trackResults = await pg.query(trackQuery, trackParams)

			// Channel summary with optional filter
			const summaryQuery = mention
				? `
					SELECT c.id, c.name, c.slug, c.description, c.image, COUNT(t.id) as track_count
					FROM channels c
					JOIN tracks t ON c.id = t.channel_id
					WHERE c.slug = $2
					  AND (LOWER(t.title) LIKE $1 
					       OR LOWER(t.description) LIKE $1 
					       OR LOWER(t.url) LIKE $1)
					GROUP BY c.id, c.name, c.slug, c.description, c.image
					ORDER BY COUNT(t.id) DESC, c.name
				`
				: `
					SELECT c.id, c.name, c.slug, c.description, c.image, COUNT(t.id) as track_count
					FROM channels c
					JOIN tracks t ON c.id = t.channel_id
					WHERE LOWER(t.title) LIKE $1 
					   OR LOWER(t.description) LIKE $1 
					   OR LOWER(t.url) LIKE $1
					GROUP BY c.id, c.name, c.slug, c.description, c.image
					ORDER BY COUNT(t.id) DESC, c.name
				`

			const summaryParams = mention ? [query, mention] : [query]
			const channelSummaryResults = await pg.query(summaryQuery, summaryParams)

			channels = channelResults.rows
			tracks = trackResults.rows
			channelSummary = channelSummaryResults.rows
			console.log({channelSummary})
		} catch (error) {
			console.error('Search error:', error)
		} finally {
			isLoading = false
		}
	}

	function handleSubmit(event) {
		event.preventDefault()
		updateURL()
	}

	function updateURL() {
		const params = new URLSearchParams()
		if (searchQuery.trim()) {
			params.set('search', searchQuery.trim())
		}
		const queryString = params.toString()
		const newUrl = `/search${queryString ? `?${queryString}` : ''}`
		goto(newUrl, {replaceState: true})
	}
</script>

<svelte:head>
	<title>Search - Radio4000</title>
</svelte:head>

<form onsubmit={handleSubmit}>
	<IconSearch />
	<input
		type="search"
		placeholder="Search channels and tracks... (@slug to scope)"
		bind:value={searchQuery}
		oninput={debouncedSearch}
	/>
</form>

{#if isLoading}
	<p>Searching...</p>
{/if}

{#if searchQuery && !isLoading}
	{@const tokens = parseSearchTokens(searchQuery)}
	{#if tokens.mentions.length > 0}
		<p><small>Found {tracks.length} tracks from @{tokens.mentions[0]}</small></p>
	{:else}
		<p><small>Found {channels.length} channels and {tracks.length} tracks</small></p>
	{/if}
	
	{#if channels.length > 0}
		<section>
			<h2>Channels ({channels.length})</h2>
			<ul class="grid">
				{#each channels as channel}
					<li>
						<ChannelCard {channel} />
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if channelSummary.length > 0}
		<section>
			<h2>Channels with "{searchQuery}" tracks ({channelSummary.length})</h2>
			<ul class="grid">
				{#each channelSummary as channel}
					<li>
						<ChannelCard channel={{...channel, track_count: channel.track_count}} />
						&nbsp;&nbsp;@{channel.slug} {channel.track_count} tracks
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if tracks.length > 0}
		<section>
			<header>
				<h2>Tracks ({tracks.length})</h2>
				<menu>
					<button onclick={() => playTracks(tracks.map(t => t.id))}>Play All</button>
					<button onclick={() => addToPlaylist(tracks.map(t => t.id))}>Add to queue</button>
				</menu>
			</header>

			<ul class="list tracks">
				{#each tracks as track, index}
					<li class={track.id === appState.playlist_track ? 'current' : ''} ondblclick={() => playTrack(track.id)}>
						<span>{index + 1}.</span>
						<div class="title">{track.title}</div>
						<div class="description">
							<small><a href="/{track.channel_slug}">@{track.channel_slug}</a></small>
							<small>{track.description}</small>
						</div>
					</li>
				{/each}
			</ul>

		</section>
	{/if}

	{#if channels.length === 0 && tracks.length === 0 && channelSummary.length === 0}
		<p>No results found for "{searchQuery}"</p>
	{/if}
{/if}

<style>
	form {
		display: flex;
		gap: 1rem;
		margin: 0.5rem 0.5rem 2rem;
		align-items: center;
	}

	input[type='search'] {
		margin-left: -0.5rem;
		flex: 1;
	}

	section {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: var(--font-size-regular);
		margin: 0.5rem;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-right: 0.5rem;
		border-bottom: 1px solid var(--gray-5);
	}

	menu {
		display: flex;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
	}
</style>
