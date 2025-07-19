<script>
	import {pg} from '$lib/db'
	import {searchMusicBrainz} from '$lib/sync/musicbrainz'
	import {logger} from '$lib/logger'
	import {onMount} from 'svelte'
	const log = logger.ns('<TrackMeta>').seal()

	/**
	 * This component updates the track_meta table for this track
	 * with youtube_data and musicbrainz_data
	 */

	const {track} = $props()

	let loading = $state(false)
	let error = $state(null)
	let results = $state(null)

	const ytid = $derived(track?.youtube_data.id)

	$effect(() => {
		if (!ytid) return
		loading = true
		error = null
		results = null

		searchMusicBrainz(track.title).then(async (result) => {
			if (result) {
				results = result
				await pg.sql`update track_meta set updated_at = CURRENT_TIMESTAMP, musicbrainz_updated_at = CURRENT_TIMESTAMP, musicbrainz_data = ${JSON.stringify(result)} where ytid = ${ytid}`
				log.log('musicbrainz_data:updated', track.title, result)
			} else {
				error = 'No matches found'
				results = null
			}
			loading = false
		})
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
	<p>Loading MusicBrainz metadata...</p>
{:else if error}
	<p>Error: {error}</p>
{:else if results}
	{@const recording = results.recording}
	{@const artist = recording['artist-credit']?.map((ac) => ac.name).join(', ')}
	{@const duration = recording.length
		? `${Math.floor(recording.length / 60000)}:${String(Math.floor((recording.length % 60000) / 1000)).padStart(2, '0')}`
		: null}
	{@const releaseDate = recording['first-release-date']}

	{@const primaryRelease =
		recording.releases?.find(
			(r) =>
				r.status === 'Official' &&
				r['release-group']?.['primary-type'] === 'Album' &&
				!r['release-group']?.['secondary-types']?.includes('Compilation')
		) ||
		recording.releases?.find(
			(r) => r.status === 'Official' && r['release-group']?.['primary-type'] === 'EP'
		) ||
		recording.releases?.[0]}

	<div>
		<p>
			Please note, we searched MusicBrainz for the track title. This might not be the track you are
			looking for. But it also might be.
		</p>
		<p>
			MusicBrainz ID: {recording.id}<br />
			recording title: {recording.title}<br />
			artist: {artist}<br />
			duration: {duration}<br />
			primary release: {primaryRelease.title}<br />
			release date: {releaseDate}<br />
			release date: {new Date(releaseDate).toLocaleDateString()}<br />
			tags: {recording.tags?.map((tag) => tag.name).join(', ')}<br />
		</p>

		{#if recording.releases && recording.releases.length > 1}
			<details>
				<summary><strong>All Releases ({recording.releases.length})</strong></summary>
				<ul>
					{#each recording.releases as release (release.id)}
						<li>
							<strong>{release.title}</strong>
							{#if release.date}({release.date}){/if}
							- {release.status}
							{#if release['release-group']?.['primary-type']}
								{release['release-group']['primary-type']}
							{/if}
							{#if release['release-group']?.['secondary-types']}
								({release['release-group']['secondary-types'].join(', ')})
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/if}

		<details>
			<summary><strong>Search Debug</strong></summary>
			<p>
				original: {results.originalTitle}<br />
				cleaned: {results.parsed.cleaned}<br />
				strategy: {results.searchDescription}<br />
				score: {recording.score}%
			</p>
		</details>
	</div>
{:else}
	<p>No MusicBrainz metadata found for "{track.title}"</p>
{/if}
