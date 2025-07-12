<script>
	import {sdk} from '@radio4000/sdk'
	import {pg} from '$lib/db'
	import {joinBroadcast} from '$lib/broadcast'
	import {readBroadcastsWithChannel} from '$lib/api'

	let activeBroadcasts = $state([])

	async function updateChannelBroadcastStatus(broadcasts) {
		const broadcastingChannelIds = broadcasts.map(b => b.channel_id)

		console.log(broadcastingChannelIds )
		
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

					// Refresh from remote.
					readBroadcastsWithChannel().then(async (data) => {
						activeBroadcasts = data
						await updateChannelBroadcastStatus(data)
					})
				}
			)
			.subscribe()

		return () => broadcastChannel.unsubscribe()
	})
</script>

{#if activeBroadcasts.length > 0}
	<div class="live-broadcasts">
		<span>Live radios 🔴</span>
		{#each activeBroadcasts as broadcast (broadcast.channel_id)}
			<button onclick={() => joinBroadcast(broadcast.channel_id)} class="broadcast-button">
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
	}

	.live-broadcasts span {
		color: var(--red-9);
	}
</style>
