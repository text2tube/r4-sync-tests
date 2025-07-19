import {pg} from '$lib/db'
import {batcher} from '$lib/batcher'

/**
 * Pulls track metadata from YouTube API for all tracks in a channel
 * @param {string} channelId */
export async function pullTrackMetaYouTubeFromChannel(channelId) {
	// Find tracks in channel that need YouTube metadata
	const tracksNeedingUpdate = (
		await pg.sql`
			SELECT ytid(url) as ytid
			FROM tracks_with_meta 
			WHERE channel_id = ${channelId} 
			AND youtube_data IS NULL
	`
	).rows

	if (tracksNeedingUpdate.length === 0) return {updated: 0, total: 0}

	console.log('pulling yt meta for tracks in channel', {
		channelId,
		total: tracksNeedingUpdate.length
	})

	const ytids = tracksNeedingUpdate.map((t) => t.ytid)
	return pullTrackMetaYouTube(ytids)
}

/**
 * Pulls track metadata from YouTube API for specific ytids
 * @param {string[]} ytids */
export async function pullTrackMetaYouTube(ytids) {
	const tracksNeedingUpdate = (
		await pg.sql`
			SELECT id, url, ytid(url) as ytid
			FROM tracks_with_meta 
			WHERE ytid(url) = ANY(${ytids})
			AND youtube_data IS NULL
	`
	).rows

	if (tracksNeedingUpdate.length === 0) {
		console.log('no tracks_with_meta to update')
		return {updated: 0, total: 0}
	}

	// Batch fetch YouTube metadata
	const results = await batcher(
		tracksNeedingUpdate,
		async (track) => {
			const response = await fetch('/api/track-meta', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({ids: [track.ytid]})
			})
			if (!response.ok) throw new Error(`API error: ${response.status}`)
			const videos = await response.json()
			return {ytid: track.ytid, video: videos[0]}
		},
		{size: 50}
	)

	let totalUpdated = 0

	// Update track_meta and tracks tables
	await pg.transaction(async (tx) => {
		for (const result of results) {
			if (result.status === 'rejected') continue

			const {ytid, video} = result.value
			if (!video?.duration) continue

			try {
				// Upsert track_meta
				await tx.sql`
					INSERT INTO track_meta (ytid, duration, title, youtube_data, youtube_updated_at, updated_at)
					VALUES (${ytid}, ${video.duration}, ${video.title}, ${JSON.stringify(video)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
					ON CONFLICT (ytid) DO UPDATE SET
						duration = EXCLUDED.duration,
						title = EXCLUDED.title,
						youtube_data = EXCLUDED.youtube_data,
						youtube_updated_at = EXCLUDED.youtube_updated_at,
						updated_at = EXCLUDED.updated_at
				`

				totalUpdated++
			} catch (err) {
				console.error('pull_track_durations:error', {ytid, err})
			}
		}
	})

	console.log(
		`pull_track_durations:complete ${totalUpdated}/${tracksNeedingUpdate.length} videos processed`,
		{
			ytids
		}
	)
	return {updated: totalUpdated, total: tracksNeedingUpdate.length}
}
