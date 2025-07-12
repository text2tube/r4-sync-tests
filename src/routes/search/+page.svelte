<!--
TODO: Future search features
- Track-only search toggle
- Channel mentions: search @channel-name 
- Hashtag search: #funk #80s across channels
- Advanced filters (date, duration, etc.)
-->

<script>
	import {onMount} from 'svelte'
	import {page} from '$app/stores'
	import {goto} from '$app/navigation'
	import {IconSearch} from 'obra-icons-svelte'
	import {pg} from '$lib/db.ts'
	import {playTrack} from '$lib/api'
	import ChannelCard from '$lib/components/channel-card.svelte'

	/** @type {import('$lib/types.ts').Channel[]} */
	let channels = $state([])

	/** @type {import('$lib/types.ts').Track[]} */
	let tracks = $state([])

	let searchQuery = $state('')
	let isLoading = $state(false)
	let debounceTimer = $state()

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
			return
		}

		isLoading = true
		const query = `%${searchQuery.toLowerCase()}%`

		console.log('querying', query)

		try {
			const channelResults = await pg.query(
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

			const trackResults = await pg.query(
				`
				SELECT t.id, t.title, t.description, t.url, t.channel_id,
				       c.name as channel_name, c.slug as channel_slug
				FROM tracks t
				JOIN channels c ON t.channel_id = c.id
				WHERE LOWER(t.title) LIKE $1 
				   OR LOWER(t.description) LIKE $1 
				   OR LOWER(t.url) LIKE $1
				ORDER BY t.title
			`,
				[query]
			)

			channels = channelResults.rows
			tracks = trackResults.rows
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
		placeholder="Search channels and tracks..."
		bind:value={searchQuery}
		oninput={debouncedSearch}
	/>
</form>

{#if isLoading}
	<p>Searching...</p>
{/if}

{#if searchQuery && !isLoading}
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

	{#if tracks.length > 0}
		<section>
			<h2>Tracks ({tracks.length})</h2>
			<ul class="list">
				{#each tracks as track, index}
					<li ondblclick={() => playTrack(track.id)}>
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

	{#if channels.length === 0 && tracks.length === 0}
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
</style>
