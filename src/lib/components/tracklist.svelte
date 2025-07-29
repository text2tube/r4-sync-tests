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
		SELECT *
		FROM tracks_with_meta
		WHERE id IN (select unnest($1::uuid[]))
		ORDER BY created_at desc
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

<style>
	li {
		contain: content;
    content-visibility: auto;
    contain-intrinsic-height: auto 3rem;
	}
</style>
