<script>
	import {pg} from '$lib/db'
	import {IconGrid, IconUnorderedList} from 'obra-icons-svelte'
	import ChannelCard from './channel-card.svelte'

	/** @type {import('$lib/types').Channel[]}*/
	let channels = $state([])

	/** @type {'list' | 'grid'}*/
	let display = $state('list')

	// hack to render asap
	pg.sql`select * from channels order by name`.then((res) => {
		channels = res.rows
	})

	pg.sql`select channels_display from app_state`.then((res) => {
		display = res.rows[0].channels_display
	})

	$effect(() => {
		console.log('RAN')
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
	{#each channels as channel}
		<li>
			<ChannelCard {channel} />
		</li>
	{/each}
</ul>

<style>
	menu :global(svg) {
		width: 1.5em;
		margin-right: 0.3em;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		/* gap: 1rem; */
		list-style: none;
		padding: 0;

		> * {
			/* border: 1px solid; */
		}

		:global(figure) {
			width: 100%;
			aspect-ratio: 1 / 1;
			background: var(--color-bg-secondary);
			border-radius: var(--border-radius);
		}
	}
</style>
