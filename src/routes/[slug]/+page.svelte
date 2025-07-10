<script>
	import {pg} from '$lib/db'
	import {pullChannel} from '$lib/sync'
	import ChannelCard from '$lib/components/channel-card.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	import SearchControls from '$lib/components/search-controls.svelte'

	/** @type {{data: {slug: string, search: string, order: string}}} */
	let {data} = $props()

	let channel = $state(null)
	let trackIds = $state([])
	let loading = $state(true)
	let error = $state(null)
	let currentSearch = $state(data.search)
	let currentOrder = $state(data.order)

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
				await loadTracks()
			}
		} catch (err) {
			console.error('Error fetching channel:', err)
			error = err
		} finally {
			loading = false
		}
	}

	async function loadTracks() {
		if (!channel?.id) return

		try {
			// Validate parameters
			const search = currentSearch?.trim() || ''
			const order = currentOrder || 'created'

			let query = 'SELECT id FROM tracks WHERE channel_id = $1'
			let params = [channel.id]

			if (search) {
				query += ' AND (title ILIKE $2 OR description ILIKE $2)'
				params.push(`%${search}%`)
			}

			if (order === 'created_asc') {
				query += ' ORDER BY created_at ASC'
			} else if (order === 'title') {
				query += ' ORDER BY title ASC'
			} else {
				query += ' ORDER BY created_at DESC'
			}

			const {rows} = await pg.query(query, params)
			trackIds = rows.map((row) => row.id)
		} catch (err) {
			console.error('Error loading tracks:', err)
			trackIds = []
		}
	}

	async function handleSearchChange(search) {
		currentSearch = search
		await loadTracks()
	}

	async function handleOrderChange(order) {
		currentOrder = order
		await loadTracks()
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
		if (channel) {
			loadTracks()
		}
	})
</script>

<SearchControls
	search={currentSearch}
	order={currentOrder}
	onSearchChange={handleSearchChange}
	onOrderChange={handleOrderChange}
/>

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
