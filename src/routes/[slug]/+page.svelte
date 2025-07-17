<script>
	import {onMount} from 'svelte'
	import {page} from '$app/state'
	import {goto} from '$app/navigation'
	import {pg} from '$lib/db'
	import {setPlaylist, addToPlaylist} from '$lib/api'
	import {relativeDate, relativeDateSolar} from '$lib/utils'
	import Icon from '$lib/components/icon.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import ButtonPlay from '$lib/components/button-play.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'

	let {data} = $props()

	let channel = $state(data.channel)

	/** @type {string[]} */
	let trackIds = $state([])
	let searchQuery = $state(data.search || '')
	let debounceTimer = $state()

	function debouncedSearch() {
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(performSearch, 200)
	}

	async function performSearch() {
		if (!channel?.id) return
		const search = searchQuery?.trim() || ''
		try {
			if (!search) {
				// Use live query for all tracks
				pg.live.query(
					'SELECT id FROM tracks WHERE channel_id = $1 ORDER BY created_at DESC',
					[channel.id],
					(res) => {
						trackIds = res.rows.map((row) => row.id)
					}
				)
			} else {
				// Search tracks within this channel
				const query = `%${search.toLowerCase()}%`
				pg.live.query(
					`
					SELECT id FROM tracks
					WHERE channel_id = $1
					  AND (LOWER(title) LIKE $2
					       OR LOWER(description) LIKE $2
					       OR LOWER(url) LIKE $2)
					ORDER BY created_at DESC
				`,
					[channel.id, query],
					(res) => {
						trackIds = res.rows.map((row) => row.id)
					}
				)
			}
		} catch (err) {
			console.error('Error searching tracks:', err)
			trackIds = []
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
		const urlSearch = page.url.searchParams.get('search')
		if (urlSearch) {
			searchQuery = urlSearch
		}
		if (channel) {
			performSearch()
		}
	})
</script>

<header>
	<form onsubmit={handleSubmit}>
		<Icon icon="search" />
		<input
			type="search"
			placeholder="Search tracks in {channel?.name || 'channel'}..."
			bind:value={searchQuery}
			oninput={debouncedSearch}
		/>
	</form>
</header>

<article>
	<header>
		<ChannelAvatar id={channel.image} alt={channel.name} />
		<h1>
			{channel.name}
			<ButtonPlay {channel} />
			{#if channel.longitude && channel.latitude}
				<a
					href={`/?display=map&slug=${channel.slug}&longitude=${channel.longitude}&latitude=${channel.latitude}&zoom=15`}
				>
					<Icon icon="map" />
				</a>
			{/if}
		</h1>
		<p>{channel.description}</p>
		<p>
			<small>
				Last updated {relativeDate(channel.updated_at)}. Broadcasting since {relativeDateSolar(
					channel.created_at
				)}.
			</small>
		</p>
	</header>
	<section>
		{#if trackIds.length > 0}
			{#if searchQuery}
				<header>
					<h2>Tracks ({trackIds.length})</h2>
					<menu>
						<button onclick={() => setPlaylist(trackIds)}>Play All</button>
						<button onclick={() => addToPlaylist(trackIds)}>Add to queue</button>
					</menu>
				</header>
			{/if}
			<Tracklist ids={trackIds} />
		{:else}
			<p>No tracks found{searchQuery ? ` for "${searchQuery}"` : ''}</p>
		{/if}
	</section>
</article>

<style>
	header {
		margin-bottom: 1rem;
	}

	header:has(form) {
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

	article header :global(img) {
		margin: 1rem 1rem 0.5rem 0.5rem;
		max-width: calc(100vw - 2rem);
		border-radius: var(--border-radius);
		float: left;

		@media (min-width: 600px) {
			max-width: 13rem;
		}
	}

	h1,
	h1 + p {
		margin: 0 1rem;
		font-size: var(--font-size-title2);
		line-height: 1.3;
		max-width: 60ch;
	}

	h1 {
		padding-top: 1rem;
	}

	section {
		clear: both;
	}

	section header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-right: 0.5rem;
		border-bottom: 1px solid var(--gray-5);
	}

	section h2 {
		font-size: var(--font-size-regular);
		margin: 0.5rem;
	}

	section menu {
		display: flex;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
	}
</style>
