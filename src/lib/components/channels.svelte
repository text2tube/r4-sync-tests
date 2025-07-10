<script>
	import {pg} from '$lib/db'
	import {sdk} from '@radio4000/sdk'
	import {IconGrid, IconUnorderedList} from 'obra-icons-svelte'
	import ChannelCard from './channel-card.svelte'
	import {getActiveBroadcasts} from '$lib/services/broadcast'

	/** @type {import('$lib/types').Channel[]}*/
	let channels = $state([])

	/** @type {Array}*/
	let activeBroadcasts = $state([])

	/** @type {'list' | 'grid'}*/
	let display = $state('list')

	pg.sql`select channels_display from app_state`.then((res) => {
		display = res.rows[0].channels_display || display
	})

	// Double query to render asap, before the "live" query below.
	pg.sql`select * from channels order by name`.then((res) => {
		channels = res.rows
	})

	$effect(() => {
		pg.live.incrementalQuery(
			`
			SELECT
				channels.*,
				COUNT(tracks.id) AS track_count
			FROM channels
			LEFT JOIN tracks ON tracks.channel_id = channels.id
			GROUP BY channels.id
			ORDER BY channels.name
		`,
			[],
			'id',
			(res) => {
				channels = res.rows
			}
		)

		// Load active broadcasts initially
		getActiveBroadcasts().then(broadcasts => {
			activeBroadcasts = broadcasts
		})

		// Listen for real-time changes to the broadcast table
		const broadcastChannel = sdk.supabase
			.channel('channels-broadcast-changes')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'broadcast'
				},
				() => {
					getActiveBroadcasts().then(broadcasts => {
						activeBroadcasts = broadcasts
					})
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'DELETE',
					schema: 'public',
					table: 'broadcast'
				},
				() => {
					getActiveBroadcasts().then(broadcasts => {
						activeBroadcasts = broadcasts
					})
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'broadcast'
				},
				() => {
					getActiveBroadcasts().then(broadcasts => {
						activeBroadcasts = broadcasts
					})
				}
			)
			.subscribe()

		// Cleanup function
		return () => {
			broadcastChannel.unsubscribe()
		}
	})

	async function setDisplay(value) {
		display = value
		await pg.sql`update app_state set channels_display = ${value} where id = 1`
	}
</script>

<menu>
	<button onclick={() => setDisplay('list')}><IconUnorderedList /> List</button>
	<button onclick={() => setDisplay('grid')}><IconGrid /> Grid</button>
</menu>

<ul class={display}>
	{#each channels as channel (channel.id)}
		<li>
			<ChannelCard {channel} {activeBroadcasts} />
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
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem 0;
		list-style: none;
		padding: 0;

		:global(figure) {
			width: 100%;
			aspect-ratio: 1 / 1;
			background: var(--gray-2);
			border-radius: var(--border-radius);
		}
	}
</style>
