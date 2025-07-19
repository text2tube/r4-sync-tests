<script>
	import {pullMusicBrainz} from '$lib/sync/musicbrainz'
	import {pullTrackMetaYouTube} from '$lib/sync/youtube'
	import {logger} from '$lib/logger'
	import {extractYouTubeId} from '$lib/utils'
	import {invalidate, invalidateAll} from '$app/navigation'
	const log = logger.ns('<TrackMeta>').seal()

	/**
	 * This component updates the track_meta table for this track
	 * with youtube_data and musicbrainz_data
	 */

	const {track} = $props()

	let loading = $state(false)
	let error = $state()

	let hasMeta = $derived(track.youtube_data || track.musicbrainz_data)

	const ytid = $derived(track?.youtube_data?.id || extractYouTubeId(track?.url) || null)

	let result = $state()

	$effect(async () => {
		if (!ytid || hasMeta) return
		loading = true
		const musicbrainz_data = await pullMusicBrainz(ytid, track.title)
		const youtube_data = await pullTrackMetaYouTube([ytid])
		loading = false
		console.log({musicbrainz_data, youtube_data})
		result = {musicbrainz_data, youtube_data}
	})
</script>

{#if loading}
	<p>Loading meta data from YouTube and MusicBrainz...</p>
{:else if error}
	<p>Error: {error}</p>
{/if}

{#if result}
	<pre><code>{JSON.stringify(result, null, 2)}</code></pre>
{/if}
