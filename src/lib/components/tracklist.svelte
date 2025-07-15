<script>
	import {pg} from '$lib/db'
	import {subscribeToAppState, playTrack} from '$lib/api'
	import {formatDate} from '$lib/dates'

	/** @type {{tracks?: import('$lib/types').Track[], ids?: string[], footer?: (props: {track: import('$lib/types').Track}) => any}} */
	const {tracks: tracksProp, ids, footer} = $props()

	/** @type {import('$lib/types').Track[]}*/
	let tracks = $state([])

	/** @type {import('$lib/types').AppState} */
	let appState = $state({})
	subscribeToAppState((state) => {
		appState = state
	})

	$effect(() => {
		if (tracksProp) {
			tracks = tracksProp
			return
		}

		if (!ids || ids.length === 0) {
			tracks = []
			return
		}

		// Turn the list of ids into real tracks.
		pg.live.incrementalQuery(
			`
		SELECT t.id, t.title, t.description, t.url, t.channel_id, t.created_at, t.updated_at, c.name as channel_name, c.slug as channel_slug
		FROM tracks t
		JOIN channels c on t.channel_id = c.id
		WHERE t.id IN (select unnest($1::uuid[]))
		ORDER BY t.created_at desc


	`,
			[ids],
			'id',
			(res) => {
				tracks = res.rows
			}
		)
	})
</script>

<ul class="list tracks">
	{#each tracks as item, index (index)}
		<li
			class={item.id === appState.playlist_track ? 'current' : ''}
			ondblclick={() => playTrack(item.id, null, 'user_click')}
		>
			<span>{index + 1}.</span>
			<div class="title">
				{item.title}
				<a href={`/${item.channel_slug}/tracks/${item.id}`}>{formatDate(item.created_at)}</a>
			</div>
			<div class="description">
				<small>{item.description}</small>
			</div>
			{@render footer?.({track: item})}
			<!--<p>{formatDate(item.created_at)}</p>-->
		</li>
	{/each}
</ul>

<style>
	.title {
		display: flex;
		justify-content: space-between;
	}
	</style>
