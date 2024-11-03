<script>
	import {pg} from '$lib/db'
	import ChannelCard from './channel-card.svelte'
	import {syncAllTracks} from '$lib/sync'

	/** @type {import('$lib/types').Channel[]}*/
	let channels = $state([])

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
				console.log('channel query updated', res)
				channels = res.rows
			}
		)
	})
</script>

<button onclick={syncAllTracks}>sync</button>

<ul>
	{#each channels as channel}
		<li>
			<ChannelCard {channel} />
		</li>
	{/each}
</ul>

<style>
	ul {
		padding: 0;
		list-style: none;
	}
	li {
		border-bottom: 1px solid var(--color-border-secondary);
	}
	li:hover {
		background: var(--color-bg-quaternary);
	}
</style>
