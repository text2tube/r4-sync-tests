<script>
	import {sdk} from '@radio4000/sdk'
	import {pg} from '$lib/db'
	import {joinBroadcast, leaveBroadcast} from '$lib/broadcast'
	import {readBroadcastsWithChannel} from '$lib/api'

	const {appState} = $props()

	/** @type {import('$lib/types').BroadcastWithChannel[]} */
	let activeBroadcasts = $state([])

	/**
	 * Set channel.broadcasting on local channels from the remote broadcasts
	 * @param {import('$lib/types').BroadcastWithChannel[]} broadcasts
	 */
	async function updateChannelBroadcastStatus(broadcasts) {
		const broadcastingChannelIds = broadcasts.map((b) => b.channel_id)

		// Reset all channels to not broadcasting
		await pg.sql`UPDATE channels SET broadcasting = false`

		// Set broadcasting channels to true
		if (broadcastingChannelIds.length > 0) {
			await pg.sql`
				UPDATE channels 
				SET broadcasting = true 
				WHERE id = ANY(${broadcastingChannelIds})
			`
		}

		// Sync local broadcast state: if user's channel is broadcasting remotely, ensure local state matches
		const {rows} =
			await pg.sql`SELECT broadcasting_channel_id, channels FROM app_state WHERE id = 1`
		const state = rows[0]
		const userChannelId = state?.channels?.[0]

		if (userChannelId) {
			const isUserBroadcasting = broadcastingChannelIds.includes(userChannelId)
			const hasLocalBroadcastState = !!state?.broadcasting_channel_id

			if (isUserBroadcasting && !hasLocalBroadcastState) {
				await pg.sql`UPDATE app_state SET broadcasting_channel_id = ${userChannelId} WHERE id = 1`
				console.log('synced local broadcast state', {channelId: userChannelId})
			} else if (!isUserBroadcasting && hasLocalBroadcastState) {
				await pg.sql`UPDATE app_state SET broadcasting_channel_id = NULL WHERE id = 1`
				console.log('cleared stale local broadcast state')
			}
		}
	}

	$effect(() => {
		// Initial load.
		readBroadcastsWithChannel().then(async (data) => {
			activeBroadcasts = data
			await updateChannelBroadcastStatus(data)
		})

		// Listen for remote changes.
		const broadcastChannel = sdk.supabase
			.channel('live-broadcasts')
			.on(
				'postgres_changes',
				{event: '*', schema: 'public', table: 'broadcast'},
				async (payload) => {
					console.log('detected remote broadcast change', payload)

					// If broadcast was deleted, clear listening state for that channel
					if (payload.eventType === 'DELETE' && payload.old?.channel_id) {
						const deletedChannelId = payload.old.channel_id
						const {rows} = await pg.sql`SELECT listening_to_channel_id FROM app_state WHERE id = 1`
						const currentListeningTo = rows[0]?.listening_to_channel_id
						if (currentListeningTo === deletedChannelId) {
							await pg.sql`UPDATE app_state SET listening_to_channel_id = NULL WHERE id = 1`
							console.log('cleared listening state', {channelId: deletedChannelId})
						}
					}

					// If track was updated and we're listening to this channel, sync to new track
					if (
						payload.eventType === 'UPDATE' &&
						payload.new?.track_id &&
						payload.old?.track_id !== payload.new.track_id
					) {
						const {rows} = await pg.sql`SELECT listening_to_channel_id FROM app_state WHERE id = 1`
						const currentListeningTo = rows[0]?.listening_to_channel_id
						if (currentListeningTo === payload.new.channel_id) {
							const {syncToBroadcast} = await import('$lib/api.js')
							const synced = await syncToBroadcast(payload.new)
							if (synced) {
								console.log('synced to broadcast track change', {
									channelId: payload.new.channel_id,
									trackId: payload.new.track_id
								})
							}
						}
					}
					activeBroadcasts = await readBroadcastsWithChannel()
					await updateChannelBroadcastStatus(activeBroadcasts)
				}
			)
			.subscribe()

		return () => broadcastChannel.unsubscribe()
	})
</script>

{#if activeBroadcasts.length > 0}
	<div class="live-broadcasts">
		<span>🔴 Live &rarr;</span>
		{#each activeBroadcasts as broadcast (broadcast.channel_id)}
			{@const isActive = broadcast.channel_id === appState.listening_to_channel_id}
			<button
				class={[{active: isActive}]}
				onclick={() => {
					if (isActive) {
						leaveBroadcast()
					} else {
						joinBroadcast(broadcast.channel_id)
					}
				}}
			>
				@{broadcast.channels.slug}
			</button>
		{/each}
	</div>
{/if}

<style>
	.live-broadcasts {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--font-size-small);
		line-height: 1;
	}
	button.active {
		background-color: var(--color-lavender);
	}
</style>
