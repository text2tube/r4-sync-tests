<script>
	import {onMount} from 'svelte'
	import {page} from '$app/stores'
	import {goto} from '$app/navigation'
	import {IconSearch} from 'obra-icons-svelte'
	import {pg} from '$lib/db'
	import {pullChannel} from '$lib/sync'
	import {subscribeToAppState} from '$lib/api'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	// import fuzzysort from 'fuzzysort'

	/** @type {{data: {slug: string, search: string, order: string, dir: string}}} */
	let {data} = $props()

	/** @type {import('$lib/types').Channel|null} */
	let channel = $state(null)
	/** @type {string[]} */
	let trackIds = $state([])
	let loading = $state(true)
	let error = $state(null)
	let searchQuery = $state(data.search || '')
	let isSearching = $state(false)
	let debounceTimer = $state()

	/** @type {import('$lib/types').AppState} */
	let appState = $state({})
	subscribeToAppState((state) => {
		appState = state
	})

	async function loadChannel() {
		loading = true
		error = null

		console.log('channel', data.slug)

		try {
			// Check local database first
			const {rows} = await pg.query('SELECT * FROM channels WHERE slug = $1', [data.slug])
			channel = rows[0]

			// If not found locally, pull from SDK
			if (!channel) channel = await pullChannel(data.slug)

			// Load tracks for this channel
			if (channel) await performSearch()
		} catch (err) {
			console.error('Error fetching channel:', err)
			error = err
		} finally {
			loading = false
		}
	}

	function debouncedSearch() {
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(performSearch, 200)
	}

	async function performSearch() {
		if (!channel?.id) return

		isSearching = true
		const search = searchQuery?.trim() || ''

		try {
			if (!search) {
				// Load all tracks if no search query
				const {rows} = await pg.query(
					`SELECT id FROM tracks WHERE channel_id = $1 ORDER BY created_at DESC`,
					[channel.id]
				)
				trackIds = rows.map((row) => row.id)
			} else {
				// Search tracks within this channel
				const query = `%${search.toLowerCase()}%`
				const {rows} = await pg.query(
					`
					SELECT id FROM tracks 
					WHERE channel_id = $1 
					  AND (LOWER(title) LIKE $2 
					       OR LOWER(description) LIKE $2
					       OR LOWER(url) LIKE $2)
					ORDER BY created_at DESC
				`,
					[channel.id, query]
				)
				trackIds = rows.map((row) => row.id)
			}
		} catch (err) {
			console.error('Error searching tracks:', err)
			trackIds = []
		} finally {
			isSearching = false
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
		const newUrl = `/${data.slug}${queryString ? `?${queryString}` : ''}`
		goto(newUrl, {replaceState: true})
	}

	onMount(() => {
		const urlSearch = $page.url.searchParams.get('search')
		if (urlSearch) {
			searchQuery = urlSearch
			if (channel) {
				performSearch()
			}
		}
	})

	// Load channel when slug changes
	$effect(() => {
		if (data.slug) {
			loadChannel()
		}
	})
</script>

<header>
	<form onsubmit={handleSubmit}>
		<IconSearch />
		<input
			type="search"
			placeholder="Search tracks in {channel?.name || 'channel'}..."
			bind:value={searchQuery}
			oninput={debouncedSearch}
		/>
	</form>
</header>

{#if loading}
	<p>Loading...</p>
{:else if error}
	<p>Error loading channel: {error.message}</p>
{:else if channel}
	<article>
		<h1>{channel.name}</h1>
		<p>{channel.description}</p>
		<ChannelAvatar id={channel.image} alt={channel.name} />
		<section>
			{#if trackIds.length > 0}
				<Tracklist ids={trackIds} currentId={appState.playlist_track} />
			{:else}
				<p>No tracks found{searchQuery ? ` for "${searchQuery}"` : ''}</p>
			{/if}
		</section>
	</article>
{:else}
	<p>Channel not found</p>
{/if}

<style>
	header {
		position: sticky;
		top: 0.5rem;
		margin: 0 0.5rem;
	}

	form {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		align-items: center;
	}

	input[type='search'] {
		margin-left: -0.5rem;
		flex: 1;
	}

	:global(article img) {
		max-width: 250px;
	}
	h1,
	h1 + p {
		margin: 0;
		font-size: var(--font-size-title2);
	}
</style>
