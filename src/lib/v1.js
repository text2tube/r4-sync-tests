import {pg, DEBUG_LIMIT} from '$lib/db'

/** Imports a local export of v1 channels, imports them, and fetches + imports tracks as well */
export async function pullV1Channels() {
	const res = await fetch('/r4-v1-channels.json')
	const items = (await res.json()).slice(0, DEBUG_LIMIT)
	console.log('Pulling v1 channels and tracks', items)

	// remove duplicates (e.g. channels already in the database, be it from v2 or whatever)
	const {rows} = await pg.sql`select slug from channels`
	const notDuplicates = items.filter((item) => !rows.some((row) => row.slug === item.slug))
	// we only want channels with images and at least _some_ tracks
	const channels = notDuplicates.filter((item) => item.image && item.track_count > 0)

	try {
		await pg.transaction(async (tx) => {
			for (const item of channels) {
				await tx.sql`
					insert into channels (created_at, updated_at, slug, name, description, image, firebase_id)
					values (${item.created_at}, ${item.updated_at}, ${item.slug}, ${item.name}, ${item.description}, ${item.image}, ${item.firebase_id}) on conflict (id) do nothing
					`
				const {rows} = await tx.sql`select id from channels where slug = ${item.slug}`
				console.log('Pulled channel', item.slug, rows[0].id, item.firebase_id)
				await pullV1Tracks(rows[0].id, item.firebase_id, tx)
			}
		})
	} catch (err) {
		console.warn('Failed to insert v1 channels', err)
	}

	console.log('Successfully imported v1 channels and tracks')
}

/**
 * Imports tracks from a v1 channel
 * @param {string} channelId
 * @param {string} channelFirebaseId
 * @param {typeof pg} [pg]
 */
export async function pullV1Tracks(channelId, channelFirebaseId, pg) {
	const v1Tracks = await findV1TracksByChannel(channelFirebaseId)
	console.log('Pulling tracks from v1', v1Tracks)
	const tracks = v1Tracks.map((track) => ({
		id: track.id,
		channel_id: channelId,
		url: track.url,
		title: track.title,
		description: track.body || '',
		discogs_url: track.discogsUrl || '',
		created_at: new Date(track.created).toISOString(),
		updated_at: new Date(track.updated || track.created).toISOString()
	}))
	for (const item of tracks) {
		await pg.sql`
			insert into tracks (channel_id, created_at, updated_at, title, description, url, discogs_url)
			values (${channelId}, ${item.created_at}, ${item.updated_at}, ${item.title}, ${item.description}, ${item.url}, ${item.discogs_url}) on conflict (id) do nothing;
		`
	}
	console.log('Inserted tracks v1', tracks)
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
