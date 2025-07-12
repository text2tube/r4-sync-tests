<script>
	import {pg} from '$lib/db'
	import {pullChannel} from '$lib/sync'
	import ChannelCard from '$lib/components/channel-card.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	import SearchControls from '$lib/components/search-controls.svelte'
	// import fuzzysort from 'fuzzysort'

	/** @type {{data: {slug: string, search: string, order: string, dir: string}}} */
	let {data} = $props()

	/** @type {import('$lib/types').Channel|null} */
	let channel = $state(null)
	/** @type {string[]} */
	let trackIds = $state([])
	let loading = $state(true)
	let error = $state(null)
	let currentSearch = $state(data.search)
	let currentOrder = $state(data.order)
	let currentDir = $state(data.dir)

	/** @type {import('$lib/types').AppState} */
	let appState = $state({})
	pg.live.query('select * from app_state where id = 1', [], (res) => {
		appState = res.rows[0] || {}
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

			// Load tracks for this channel with search and sorting
			if (channel) await queryTracks()
		} catch (err) {
			console.error('Error fetching channel:', err)
			error = err
		} finally {
			loading = false
		}
	}

	async function queryTracks() {
		if (!channel?.id) return

		try {
			const search = currentSearch?.trim() || ''
			// const order = currentOrder || 'created'
			// const dir = currentDir || 'desc'

			// Get all tracks for the channel with searchable fields
			const query =
				'SELECT id, title, description, created_at, updated_at FROM tracks WHERE channel_id = $1'
			const {rows} = await pg.query(query, [channel.id])
			let filteredTracks = [...rows]
			// Apply search if search term exists
			if (search) {
				const searchTerm = search.toLowerCase()
				filteredTracks = filteredTracks.filter((track) => {
					const title = (track.title || '').toLowerCase()
					const description = (track.description || '').toLowerCase()
					return title.includes(searchTerm) || description.includes(searchTerm)
				})
			}
			trackIds = filteredTracks.map((track) => track.id)
		} catch (err) {
			console.error('Error loading tracks:', err)
			trackIds = []
		}
	}

	async function handleSearchChange(search) {
		currentSearch = search
		await queryTracks()
	}

	async function handleOrderChange(order, dir) {
		currentOrder = order
		currentDir = dir
		await queryTracks()
	}

	// Load channel when slug changes
	$effect(() => {
		if (data.slug) {
			loadChannel()
		}
	})

	// Update search/order when URL params change
	$effect(() => {
		currentSearch = data.search || ''
		currentOrder = data.order || 'created'
		currentDir = data.dir || 'desc'
		if (channel) {
			queryTracks()
		}
	})
</script>

<header>
	<SearchControls
		search={currentSearch}
		order={currentOrder}
		dir={currentDir}
		onSearchChange={handleSearchChange}
		onOrderChange={handleOrderChange}
	/>
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
				<p>No tracks found{currentSearch ? ` for "${currentSearch}"` : ''}</p>
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

	:global(article img) {
		max-width: 250px;
	}
	h1,
	h1 + p {
		margin: 0;
		font-size: var(--font-size-title2);
	}
</style>
