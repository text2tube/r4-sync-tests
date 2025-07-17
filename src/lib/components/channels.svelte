<script>
	import {pg} from '$lib/db'
	import {subscribeToAppState} from '$lib/api'
	import Icon from './icon.svelte'
	import ChannelCard from './channel-card.svelte'
	import MapComponent from './map.svelte'

	const {slug: initialSlug, display: initialDisplay, longitude, latitude, zoom} = $props()

	/** @type {'list' | 'grid' | 'map'}*/
	let display = $state(initialDisplay || 'list')
	let limit = $state(5)
	let perPage = $state(100)
	let onlyChannelsWithImages = $state(false)
	/** @type {import('$lib/types').Channel[]}*/
	let channels = $state([])

	let filteredChannels = $derived(
		channels.filter((c) => (onlyChannelsWithImages ? c.image : true)).slice(0, limit)
	)
	let center = $derived(latitude && longitude ? [latitude, longitude] : null)

	subscribeToAppState((state) => {
		display = state.channels_display || display
	})

	const channelMapMarkers = $derived(
		channels
			.filter((c) => c.longitude && c.latitude)
			.map(({longitude, latitude, slug, name}) => ({
				longitude,
				latitude,
				title: name,
				href: slug,
				isActive: slug === initialSlug
			}))
	)

	$effect(() => {
		let cleanup

		pg.live
			.incrementalQuery('select * from channels order by updated_at desc', [], 'id', (results) => {
				channels = results.rows
			})
			.then(({initialResults, unsubscribe}) => {
				// channels = initialResults.rows
				cleanup = unsubscribe
			})

		return async () => {
			cleanup?.()
		}
	})

	// this doesn't work
	// onDestroy(async() => {
	// await pg.sql`UPDATE app_state SET channels_display = ${display} WHERE id = 1`
	// })

	async function setDisplay(value = 'grid') {
		display = value
		// Fire and forget - don't await
		pg.sql`UPDATE app_state SET channels_display = ${display} WHERE id = 1`
	}
</script>

<div class="layout">
	<menu>
		<label>
			Only images
			<input type="checkbox" title="" bind:checked={onlyChannelsWithImages} />
		</label>
		<button
			title="View as list"
			class:active={display === 'list'}
			onclick={() => setDisplay('list')}
		>
			<Icon icon={'unordered-list'} />
		</button>
		<button
			title="View as grid"
			class:active={display === 'grid'}
			onclick={() => setDisplay('grid')}
		>
			<Icon icon={'grid'} />
		</button>
		<button title="View as map" class:active={display === 'map'} onclick={() => setDisplay('map')}>
			<Icon icon={'map'} />
		</button>
	</menu>

	{#if display === 'map'}
		{#if channelMapMarkers}
			<MapComponent urlMode markers={channelMapMarkers} {center} {zoom}></MapComponent>
		{/if}
	{:else}
		<div class={display}>
			{#each filteredChannels as channel (channel.id)}
				<ChannelCard {channel} />
			{/each}
		</div>
		<footer>
			{#if filteredChannels?.length > 0}
				<p>
					Showing {limit} channels.
					<button onclick={() => (limit = limit + perPage)}>Load {perPage} more</button>
				</p>
			{/if}
		</footer>
	{/if}
</div>

<style>
	.layout {
		position: relative;
	}
	menu {
		position: sticky;
		top: 0.5rem;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin: 0.5rem 0;
		gap: 0.25rem;
		z-index: 1;

		label {
			user-select: none;
		}
	}

	menu :global(svg) {
		width: var(--font-size-large);
		margin-right: 0.2em;
	}

	footer p {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 2rem 0 10rem 0.5rem;
	}
</style>
