<script>
	import {incrementalLiveQuery} from '$lib/live-query'
	import {subscribeToAppState} from '$lib/api'
	import TrackCard from '$lib/components/track-card.svelte'

	/** @typedef {import('$lib/types').Track} Track */

	/** @type {{tracks?: Track[], ids?: string[], footer?: (props: {track: Track}) => any}} */
	const {tracks: tracksProp, ids, footer} = $props()

	/** @type {Track[]}*/
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
		return incrementalLiveQuery(
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

{#if tracks.length}
	<ul class="list tracks">
		{#each tracks as track, index (index)}
			<li>
				<TrackCard {track} {index} {appState} />
				{@render footer?.({track})}
			</li>
		{/each}
	</ul>
{/if}
