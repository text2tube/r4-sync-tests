<script>
	import {trap} from '$lib/focus'
	import {onMount} from 'svelte'
	import {page} from '$app/state'
	import {goto} from '$app/navigation'
	import {pg} from '$lib/db'
	import {
		subscribeToAppState,
		setPlaylist,
		addToPlaylist,
		toggleTheme,
		toggleQueuePanel
	} from '$lib/api'
	import Icon from '$lib/components/icon.svelte'
	import ChannelCard from '$lib/components/channel-card.svelte'
	import TrackCard from '$lib/components/track-card.svelte'

	/** @type {import('$lib/types.ts').AppState} */
	let appState = $state({})
	subscribeToAppState((state) => {
		appState = state
	})

	/** @type {import('$lib/types.ts').Channel[]} */
	let channels = $state([])

	/** @type {import('$lib/types.ts').Track[]} */
	let tracks = $state([])

	/** @type {import('$lib/types.ts').Channel[]} */
	let allChannels = $state([])

	// Filtered channels for @mention autocomplete
	let filteredChannels = $derived.by(() => {
		if (!searchQuery.includes('@')) return allChannels
		const mentionQuery = searchQuery.slice(searchQuery.lastIndexOf('@') + 1)
		if (mentionQuery.length < 1) return allChannels
		return allChannels
			.filter(
				(c) =>
					c.slug.includes(mentionQuery.toLowerCase()) ||
					c.name.toLowerCase().includes(mentionQuery.toLowerCase())
			)
			.slice(0, 10)
	})

	let searchQuery = $state('')
	let isLoading = $state(false)
	let debounceTimer = $state()

	/** @typedef {{id: string, title: string, type: 'link' | 'command', target?: string, action?: () => void}} Command */

	const commands = $derived.by(() => {
		/** @type {Command[]} */
		return [
			{id: 'settings', title: 'Go to Settings', type: 'link', target: '/settings'},
			{id: 'toggle-theme', title: 'Toggle theme', type: 'command', action: toggleTheme},
			{id: 'toggle-queue', title: 'Toggle queue panel', type: 'command', action: toggleQueuePanel}
		]
	})

	onMount(() => {
		const urlSearch = page.url.searchParams.get('search')
		if (urlSearch) {
			searchQuery = urlSearch
			performSearch()
		}
		queryChannels()
	})

	async function queryChannels() {
		try {
			const result = await pg.query('SELECT id, name, slug FROM channels ORDER BY name')
			allChannels = result.rows
		} catch (error) {
			console.error('Failed to load channels:', error)
		}
	}

	function debouncedSearch() {
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(performSearch, 200)
	}

	function clear() {
		channels = []
		tracks = []
	}

	async function performSearch() {
		if (searchQuery.trim().length < 2) return clear()

		isLoading = true

		// Handle @mention searches
		const isMention = searchQuery.startsWith('@')
		const query = isMention
			? `%${searchQuery.slice(1).toLowerCase()}%` // Remove @ and search slug
			: `%${searchQuery.toLowerCase()}%`

		try {
			// Channel search with fuzzy matching using pg_trgm
			const channelResults = await pg.query(
				`
				SELECT id, name, slug, description, image,
				       GREATEST(
				         similarity(name, $2),
				         similarity(description, $2),
				         similarity(slug, $2)
				       ) as similarity_score
				FROM channels
				WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(slug) LIKE $1
				   OR name % $2 OR description % $2 OR slug % $2
				ORDER BY similarity_score DESC, name
			`,
				[query, isMention ? searchQuery.slice(1) : searchQuery]
			)

			// Track search on title and description
			const trackResults = await pg.query(
				`
				SELECT twm.*, c.name as channel_name, c.slug as channel_slug
				FROM tracks_with_meta twm
				JOIN channels c ON twm.channel_id = c.id
				WHERE LOWER(twm.title) LIKE $1 OR LOWER(twm.description) LIKE $1
				ORDER BY twm.title
			`,
				[query]
			)

			channels = channelResults.rows
			tracks = trackResults.rows
		} catch (error) {
			console.error('search:error', error)
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

<div use:trap>
	<form onsubmit={handleSubmit}>
		<Icon icon="search" size={20} />
		<input
			type="search"
			list="command-suggestions"
			placeholder="Search or jump to…"
			bind:value={searchQuery}
			oninput={debouncedSearch}
		/>
		<datalist id="command-suggestions">
			{#each commands as command (command.id)}
				<option value="/{command.id}">/{command.title}</option>
			{/each}
			{#each filteredChannels as channel (channel.id)}
				<option value="@{channel.slug}">@{channel.slug} - {channel.name}</option>
			{/each}
		</datalist>

		<menu>
			<button type="button" onclick={() => setPlaylist(tracks.map((t) => t.id))}>Play all</button>
			<button type="button" onclick={() => addToPlaylist(tracks.map((t) => t.id))}
				>Add to queue</button
			>
		</menu>
	</form>

	{#if isLoading}
		<p>Searching...</p>
	{/if}

	{#if searchQuery && !isLoading}
		<p><small>Found {channels.length} channels and {tracks.length} tracks</small></p>

		{#if channels.length === 0 && tracks.length === 0}
			<p>No results found for "{searchQuery}"</p>
		{/if}

		{#if channels.length > 0}
			<section>
				<h2>{channels.length} Channels</h2>
				<ul class="grid">
					{#each channels as channel (channel.id)}
						<li>
							<ChannelCard {channel} />
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if tracks.length > 0}
			<section>
				<h2>Tracks ({tracks.length})</h2>

				<ul class="list">
					{#each tracks as track, index (track.id)}
						<li>
							<TrackCard {track} {index} {appState} />
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{:else}
		<p>
			TIP:
			<br /> press cmd/ctrl+k to come here.
			<br /> <code>@</code> to search channels
			<br /><code>/</code> for commands
		</p>
	{/if}
</div>

<style>
	form {
		position: sticky;
		top: 0.5rem;
		z-index: 10;
		display: flex;
		gap: 0.5rem;
		margin: 0.5rem 0.5rem 2rem;
		align-items: center;
		max-width: 100ch;

		& + p {
			margin-top: -1rem;
			margin-left: 0.5rem;
		}
	}

	form > :global(.icon) {
		position: relative;
		z-index: 10;
		left: 0.2em;
		opacity: 0.5;
	}

	input[type='search'] {
		flex: 1;
		margin-left: -2rem;
		padding-left: 2rem;
	}

	section {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: var(--font-size-regular);
		margin: 0.5rem;
	}
</style>
