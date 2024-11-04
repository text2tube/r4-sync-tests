<script>
	import {pg} from '$lib/db'
	import ChannelCard from './channel-card.svelte'

	/** @type {import('$lib/types').Channel[]}*/
	let channels = $state([])

	// hack to render asap
	pg.sql`select * from channels order by name`.then((res) => {
		channels = res.rows
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
</script>

<ul class="list">
	{#each channels as channel}
		<li>
			<ChannelCard {channel} />
		</li>
	{/each}
</ul>
