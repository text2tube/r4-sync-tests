import {pg} from '$lib/db'
import {batcher} from '$lib/batcher'

/**
 * Pulls track metadata (duration, etc.) from YouTube API
 * Updates the local track_meta table with duration and youtube_data
 * @param {string} channelId */
export async function pullTrackYouTubeMeta(channelId) {
	// Find tracks in a channel without youtube_data
	const tracksNeedingUpdate = (
		await pg.sql`
			SELECT id, url, ytid(url) as ytid
			FROM tracks_with_meta 
			WHERE channel_id = ${channelId} 
			AND youtube_data IS NULL
	`
	).rows
	if (tracksNeedingUpdate.length === 0) return {updated: 0, total: 0}
	console.log('pull_track_durations', {channelId, total: tracksNeedingUpdate.length})

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
			channelId
		}
	)
	return {updated: totalUpdated, total: tracksNeedingUpdate.length}
}
