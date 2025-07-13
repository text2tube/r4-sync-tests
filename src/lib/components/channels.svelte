<script>
	import {pg} from '$lib/db'
	import {subscribeToAppState, getChannelsWithTrackCounts} from '$lib/api'
	import {IconGrid, IconUnorderedList} from 'obra-icons-svelte'
	import ChannelCard from './channel-card.svelte'

	/** @type {import('$lib/types').Channel[]}*/
	let channels = $state([])

	/** @type {'list' | 'grid'}*/
	let display = $state('list')

	subscribeToAppState((state) => {
		display = state.channels_display || display
	})

	// Load channels with track counts
	$effect(() => {
		const liveQuery = pg.live.incrementalQuery('select * from channels', [], 'id', (results) => {
			channels = results.rows
		})
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
	<button onclick={() => setDisplay('list')}><IconUnorderedList /> List</button>
	<button onclick={() => setDisplay('grid')}><IconGrid /> Grid</button>
</menu>

<ul class={display}>
	{#each channels as channel (channel.id)}
		<li>
			<ChannelCard {channel} />
		</li>
	{/each}
</ul>

<style>
	menu {
		top: 0;
		z-index: 1;
		padding: 0 0.5rem;
		display: flex;
		gap: 0.5rem;
		margin: 1rem 0 0.6rem;
		> * {
			margin: 0;
		}
	}

	menu :global(svg) {
		width: 1.25em;
		margin-right: 0.2em;
	}
</style>
