<script>
	import {pg} from '$lib/db'
	import {pullChannel} from '$lib/sync'
	import ChannelCard from '$lib/components/channel-card.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	import SearchControls from '$lib/components/search-controls.svelte'
	// import fuzzysort from 'fuzzysort'

	/** @type {{data: {slug: string, search: string, order: string, dir: string}}} */
	let {data} = $props()

	let channel = $state(null)
	let trackIds = $state([])
	let loading = $state(true)
	let error = $state(null)
	let currentSearch = $state(data.search)
	let currentOrder = $state(data.order)
	let currentDir = $state(data.dir)

	async function loadChannel() {
		loading = true
		error = null

		console.log('channel', data.slug)

		try {
			// Check local database first
			const {rows} = await pg.query('SELECT * FROM channels WHERE slug = $1', [data.slug])
			channel = rows[0]

			// If not found locally, pull from SDK
			if (!channel) {
				channel = await pullChannel(data.slug)
			}

			// Load tracks for this channel with search and sorting
			if (channel) {
				await queryTracks()
			}
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
			const order = currentOrder || 'created'
			const dir = currentDir || 'desc'

			// Get all tracks for the channel with searchable fields
			const query = 'SELECT id, title, description, created_at, updated_at FROM tracks WHERE channel_id = $1'
			const {rows} = await pg.query(query, [channel.id])

			// Apply ordering first to all tracks
			const sortComparator = (a, b) => {
				if (order === 'created') {
					return dir === 'asc' 
						? new Date(a.created_at) - new Date(b.created_at)
						: new Date(b.created_at) - new Date(a.created_at)
				} else if (order === 'updated') {
					return dir === 'asc' 
						? new Date(a.updated_at) - new Date(b.updated_at)
						: new Date(b.updated_at) - new Date(a.updated_at)
				} else if (order === 'title') {
					return dir === 'asc' 
						? a.title.localeCompare(b.title)
						: b.title.localeCompare(a.title)
				}
				return 0
			}

			let filteredTracks = [...rows].sort(sortComparator)

			// Apply search if search term exists
			if (search) {
				const searchTerm = search.toLowerCase()
				filteredTracks = filteredTracks.filter(track => {
					const title = (track.title || '').toLowerCase()
					const description = (track.description || '').toLowerCase()
					return title.includes(searchTerm) || description.includes(searchTerm)
				})
			}

			trackIds = filteredTracks.map(track => track.id)
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
		<ChannelCard {channel} />

		<h3>Tracks ({trackIds.length})</h3>
		<section>
			{#if trackIds.length > 0}
				<Tracklist ids={trackIds} />
			{:else}
				<p>No tracks found{currentSearch ? ` for "${currentSearch}"` : ''}</p>
			{/if}
		</section>
	</article>
{:else}
	<p>Channel not found</p>
{/if}
