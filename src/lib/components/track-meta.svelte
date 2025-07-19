<script>
	import {pg} from '$lib/db'
	import {searchMusicBrainz} from '$lib/sync/musicbrainz'
	import {logger} from '$lib/logger'
	const log = logger.ns('<TrackMeta>').seal()

	/**
	 * This component updates the track_meta table for this track
	 * with youtube_data and musicbrainz_data
	 */

	const {track} = $props()

	let loading = $state(false)
	let error = $state('')
	let musicbrainz_data = $state(null)

	const ytid = $derived(track?.youtube_data.id)

	$effect(async () => {
		if (!ytid) return
		loading = true

		musicbrainz_data = await searchMusicBrainz(track.title)
		if (musicbrainz_data) {
			error = null
			await pg.sql`
					update track_meta 
					set updated_at = CURRENT_TIMESTAMP,
					musicbrainz_updated_at = CURRENT_TIMESTAMP,
					musicbrainz_data = ${JSON.stringify(musicbrainz_data)}
					where ytid = ${ytid}`
			log.log('musicbrainz_data:updated', track.title, musicbrainz_data)
		} else {
			error = 'No matches found'
			musicbrainz_data = null
		}
		loading = false
	})

	$effect(async () => {
		if (!ytid) return
		loading = true
		// update track_meta with youtube_data
		const res = await fetch(`/api/track-meta`, {
			method: 'POST',
			body: JSON.stringify({ids: [ytid]})
		})
		const data = await res.json()
		console.log('youtube_data:updated', data[0])
		pg.sql`update track_meta set updated_at = CURRENT_TIMESTAMP, youtube_updated_at = CURRENT_TIMESTAMP, youtube_data = ${JSON.stringify(data[0])} where ytid = ${ytid}`
		loading = false
	})
</script>

{#if loading}
	<p>Loading meta data from YouTube and MusicBrainz...</p>
{:else if error}
	<p>Error: {error}</p>
{:else if results}
	<p>found soemthing</p>
	<pre>{JSON.stringify(results, null, 2)}</pre>
{:else}
	<p>No MusicBrainz metadata found for "{track.title}"</p>
{/if}
