<script>
	import {pg} from '$lib/db'
	import {subscribeToAppState, getChannelsWithTrackCounts} from '$lib/api'
	import {IconGrid, IconUnorderedList, IconMap} from 'obra-icons-svelte'
	import ChannelCard from './channel-card.svelte'
	import Map from './map.svelte'

	/** @type {import('$lib/types').Channel[]}*/
	let channels = $state([])
	const mapChannels = $derived(
		channels.filter((c) => c.longitude && c.latitude)
			.map(({longitude, latitude, slug, name}) => ({
				longitude,
				latitude,
				title: name,
				href: `${slug}`,
			}))
	)

	/** @type {'list' | 'grid'}*/
	let display = $state('list')

	subscribeToAppState((state) => {
		display = state.channels_display || display
	})

	// Load channels with track counts
	$effect(() => {
		const liveQuery = pg.live.incrementalQuery(
			'select * from channels order by updated_at desc',
			[],
			'id',
			(results) => {
				channels = results.rows
			}
		)
		return () => {
			liveQuery.then(({unsubscribe}) => unsubscribe())
		}
	})

	async function setDisplay(value) {
		display = value
		await pg.sql`UPDATE app_state SET channels_display = ${value} WHERE id = 1`
	}
</script>

<menu>
	<button titl="View as list" class:active={display === 'list'} onclick={() => setDisplay('list')}
		><IconUnorderedList /></button
	>
	<button title="View as grid" class:active={display === 'grid'} onclick={() => setDisplay('grid')}
		><IconGrid /></button
	>
	<button title="View as map" class:active={display === 'map'} onclick={() => setDisplay('map')}
		><IconMap /></button
	>
</menu>

{#if display === 'map'}
	<Map markers={mapChannels}></Map>
{:else}
	<ul class={display}>
		{#each channels as channel (channel.id)}
			<li>
				<ChannelCard {channel} />
			</li>
		{/each}
	</ul>
{/if}

<style>
	menu {
		top: 0;
		z-index: 1;
		display: flex;
		justify-content: flex-end;
		gap: 0.25rem;
		margin: 0.5rem;
	}

	menu :global(svg) {
		width: var(--font-size-large);
		margin-right: 0.2em;
	}
</style>
