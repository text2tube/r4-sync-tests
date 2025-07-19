import {pg} from '$lib/db'
import {batcher} from '$lib/batcher'
import {logger} from '$lib/logger'

/** @typedef {{status: string, value: {id: string, tags: string[], duration: number, title: string, categoryId: string, description: string, publishedAt: string}}} YouTubeVideo */

const log = logger.ns('pull_track_meta_youtube').seal()

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
			AND ytid(url) IS NOT NULL
	`
	).rows

	if (tracksNeedingUpdate.length === 0) return []

	log.info(`fetching metadata for ${tracksNeedingUpdate.length} tracks`)

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
		log.info('all tracks already have metadata')
		return []
	}

	// Batch fetch YouTube metadata
	/** @type {PromiseSettledResult<YouTubeVideo>[]} */
	const results = await batcher(
		tracksNeedingUpdate,
		async (track) => {
			const response = await fetch('/api/track-meta', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({ids: [track.ytid]}),
			})
			if (!response.ok) throw new Error(`API error: ${response.status}`)
			const videos = await response.json()
			return videos[0]
		},
		{size: 50},
	)

	let totalUpdated = 0

	// Update track_meta and tracks tables
	await pg.transaction(async (tx) => {
		for (const result of results) {
			if (result.status === 'rejected') continue

			const video = result.value
			if (!video?.duration) continue

			try {
				// Upsert track_meta
				await tx.sql`
					INSERT INTO track_meta (ytid, duration, youtube_data, youtube_updated_at, updated_at)
					VALUES (${video.id}, ${video.duration}, ${JSON.stringify(video)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
					ON CONFLICT (ytid) DO UPDATE SET
						duration = EXCLUDED.duration,
						youtube_data = EXCLUDED.youtube_data,
						youtube_updated_at = EXCLUDED.youtube_updated_at,
						updated_at = EXCLUDED.updated_at
				`

				totalUpdated++
			} catch (err) {
				log.error(`failed to update track ${ytid}`, err)
			}
		}
	})

	if (totalUpdated > 0) {
		log.info(`updated ${totalUpdated}/${tracksNeedingUpdate.length} tracks`)
	} else {
		log.warn(`no tracks updated (${tracksNeedingUpdate.length} attempted)`)
	}
	return results
}
