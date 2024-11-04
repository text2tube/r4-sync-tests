<script>
	import {pg} from '$lib/db'
	import ChannelCard from './channel-card.svelte'
	import {syncChannels, syncChannelTracks} from '$lib/sync'

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
				// console.log('Channel query update', res)
				channels = res.rows
			}
		)
	})

	let busyChannels = $state(false)
	function csync() {
		busyChannels = true
		syncChannels().finally(() => (busyChannels = false))
	}

	let busyTracks = $state(false)
	function tsync() {
		busyTracks = true
		syncChannelTracks().finally(() => (busyTracks = false))
	}
</script>

<menu>
	<button data-loading={busyChannels} disabled={busyChannels} onclick={csync}>Pull channels</button>
	<button data-loading={busyTracks} disabled={busyTracks} onclick={tsync}>Pull tracks</button>
</menu>

<ul class="list">
	{#each channels as channel}
		<li>
			<ChannelCard {channel} />
		</li>
	{/each}
</ul>
