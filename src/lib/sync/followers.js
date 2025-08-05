import {sdk} from '@radio4000/sdk'
import {pg} from '$lib/db'
import {logger} from '$lib/logger'
const log = logger.ns('sync:followers').seal()

/**
 * Pull user's remote follows into local database
 * @param {string} userChannelId - ID of the user's channel
 */
export async function pullFollowers(userChannelId) {
	try {
		const {data: remoteFollows, error} = await sdk.channels.readFollowings(userChannelId)
		if (error) throw error

		await pg.transaction(async (tx) => {
			// Clear existing synced follows for this user
			await tx.sql`DELETE FROM followers WHERE follower_id = ${userChannelId} AND synced_at IS NOT NULL`

			// Insert all remote follows
			if (remoteFollows?.length) {
				for (const followedChannel of remoteFollows) {
					// Insert/update follower relationship
					await tx.sql`
						INSERT INTO followers (follower_id, channel_id, created_at, synced_at)
						VALUES (${userChannelId}, ${followedChannel.id}, ${followedChannel.created_at}, CURRENT_TIMESTAMP)
						ON CONFLICT (follower_id, channel_id) DO UPDATE SET
							created_at = ${followedChannel.created_at},
							synced_at = CURRENT_TIMESTAMP
					`

					// Insert/update channel metadata (readFollowings returns full channel objects)
					await tx.sql`
						INSERT INTO channels (id, name, slug, description, image, created_at, updated_at, latitude, longitude, url)
						VALUES (
							${followedChannel.id}, ${followedChannel.name}, ${followedChannel.slug},
							${followedChannel.description}, ${followedChannel.image},
							${followedChannel.created_at}, ${followedChannel.updated_at},
							${followedChannel.latitude}, ${followedChannel.longitude},
							${followedChannel.url}
						)
						ON CONFLICT (id) DO UPDATE SET
							name = EXCLUDED.name,
							slug = EXCLUDED.slug,
							description = EXCLUDED.description,
							image = EXCLUDED.image,
							updated_at = EXCLUDED.updated_at,
							latitude = EXCLUDED.latitude,
							longitude = EXCLUDED.longitude,
							url = EXCLUDED.url
					`
				}
			}
		})

		log.log('pull_followers', {userChannelId, count: remoteFollows?.length || 0})
	} catch (err) {
		log.error('pull_followers_error', err)
		throw err
	}
}

/**
 * Push local 'local-user' followers to remote for authenticated user
 * @param {string} userChannelId - ID of the user's channel
 */
async function pushFollowers(userChannelId) {
	const {rows: localFollowers} = await pg.sql`
		SELECT channel_id FROM followers WHERE follower_id = 'local-user'
	`

	if (localFollowers.length === 0) return

	await pg.transaction(async (tx) => {
		for (const {channel_id} of localFollowers) {
			// Add to user's local follows
			await tx.sql`
				INSERT INTO followers (follower_id, channel_id, created_at, synced_at)
				VALUES (${userChannelId}, ${channel_id}, CURRENT_TIMESTAMP, NULL)
				ON CONFLICT (follower_id, channel_id) DO NOTHING
			`

			// Push to remote
			try {
				await sdk.channels.followChannel(userChannelId, channel_id)
				await tx.sql`
					UPDATE followers 
					SET synced_at = CURRENT_TIMESTAMP 
					WHERE follower_id = ${userChannelId} AND channel_id = ${channel_id}
				`
			} catch (err) {
				log.error('push_follower_error', err)
			}
		}

		// Clear local-user followers
		await tx.sql`DELETE FROM followers WHERE follower_id = 'local-user'`
	})

	log.log('push_followers', {userChannelId, count: localFollowers.length})
}

/**
 * Migrate local followers and sync with remote on user authentication
 * @param {string} userChannelId - ID of the user's channel
 */
export async function migrateAndSyncFollowers(userChannelId) {
	await pushFollowers(userChannelId)
	await pullFollowers(userChannelId)
}
