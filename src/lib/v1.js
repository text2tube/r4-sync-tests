import {pg, debugLimit} from '$lib/db'

/**
	Imports a local export of v1 channels, imports them
	It will not overwrite existing channels when slug exists.
*/
export async function pullV1Channels() {
	const res = await fetch('/r5-channels.json')
	const items = (await res.json()).slice(0, debugLimit)

	// remove duplicates - skip v1 channels if ANY channel with same slug already exists
	const {rows} = await pg.sql`select slug from channels`
	// we only want channels with images and at least _some_ tracks
	const channels = items.filter(
		(item) => !rows.some((r) => r.slug === item.slug) && item.image && item.track_count > 9
	)
	try {
		await pg.transaction(async (tx) => {
			for (const item of channels) {
				try {
					await tx.sql`
					insert into channels (created_at, updated_at, slug, name, description, image, firebase_id)
					values (${item.created_at}, ${item.updated_at || item.created_at}, ${item.slug}, ${item.name}, ${item.description}, ${item.image}, ${item.firebase_id}) on conflict (slug) do nothing
					`
				} catch (err) {
					console.warn('Failed to insert v1 channel', item.slug, err)
				}
				// const {rows} = await tx.sql`select id from channels where slug = ${item.slug}`
				// console.log('Pulled channel. Now tracks...', item.slug, rows[0].id, item.firebase_id)
				// await pullV1Tracks(rows[0].id, item.firebase_id, tx)
			}
		})
	} catch (err) {
		console.warn('Failed to insert v1 channels', err)
	}
	console.log('Pulled v1 channels', channels)
}

/**
 * Imports tracks from a v1 channel
 * @param {string} channelId
 * @param {string} channelFirebaseId
 * @param {typeof pg} [pg]
 */
export async function pullV1Tracks(channelId, channelFirebaseId, pg) {
	const {rows: existingTracks} =
		await pg.sql`select firebase_id from tracks where channel_id = ${channelId}`
	const v1Tracks = await findV1TracksByChannel(channelFirebaseId)
	const tracks = v1Tracks.map((track) => ({
		firebase_id: track.id,
		channel_id: channelId,
		url: track.url,
		title: track.title,
		description: track.body || '',
		discogs_url: track.discogsUrl || '',
		created_at: new Date(track.created).toISOString(),
		updated_at: new Date(track.updated || track.created).toISOString()
	}))
	const x = tracks.filter((t) => !existingTracks.some((x) => x.firebase_id === t.firebase_id))
	for (const item of x) {
		try {
			await pg.sql`
				insert into tracks (firebase_id, channel_id, created_at, updated_at, title, description, url, discogs_url)
				values (${item.firebase_id}, ${channelId}, ${item.created_at}, ${item.updated_at}, ${item.title}, ${item.description}, ${item.url}, ${item.discogs_url}) on conflict (firebase_id) do nothing;
			`
			// Mark as successfully synced
			await pg.sql`update channels set busy = false, tracks_synced_at = CURRENT_TIMESTAMP where id = ${channelId}`
		} catch (error) {
			// console.error(`Failed to insert track ${item.firebase_id}`, error)
			// On error, just mark as not busy (tracks_synced_at stays NULL for retry)
			await pg.sql`update channels set busy = false where slug = ${slug}`
			throw error
		}
	}

	console.log(`Pulled v1 tracks (${existingTracks.length} existing skipped)`, x.length)
}

/**
 * Fetches all v1 tracks from a v1 channel id
 * Firebase queries through REST are not sorted.
 * @param {string} id
 */
async function findV1TracksByChannel(id) {
	const toObject = (value, id) => ({...value, id})
	const toArray = (data) => Object.keys(data).map((id) => toObject(data[id], id))
	const url = `https://radio4000.firebaseio.com/tracks.json?orderBy="channel"&startAt="${id}"&endAt="${id}"`
	return fetch(url)
		.then((res) => res.json())
		.then(toArray)
		.then((arr) => arr.sort((a, b) => a.created - b.created))
}
