<script>
	import {sdk} from '@radio4000/sdk'
	import {pg} from '$lib/db'
	import {joinBroadcast} from '$lib/services/broadcast'
	import ChannelAvatar from './channel-avatar.svelte'

	/** @type {any[]} */
	let activeBroadcasts = $state([])

	async function loadBroadcasts() {
		try {
			const {data, error} = await sdk.supabase.from('broadcast').select(`
				channel_id,
				track_id,
				track_played_at,
				channels (
					id,
					name,
					slug,
					image,
					description
				)
			`)
			if (error) throw error
			
			activeBroadcasts = data || []
			console.log('loaded broadcasts', {count: activeBroadcasts.length})
		} catch (error) {
			console.log('failed loading broadcasts', {error: error.message})
		}
	}

	$effect(() => {
		loadBroadcasts()

		const broadcastChannel = sdk.supabase
			.channel('live-broadcasts')
			.on('postgres_changes', {event: '*', schema: 'public', table: 'broadcast'}, async (payload) => {
				console.log('detected remote broadcast change', {event: payload.eventType, channelId: payload.new?.channel_id || payload.old?.channel_id})
				
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
				
				loadBroadcasts()
			})
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
		font-weight: 500;
	}

	.bbroadcast-button {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		background: var(--red-2);
		color: var(--red-11);
		border: 1px solid var(--red-6);
		padding: 0.25rem 0.5rem;
		border-radius: var(--border-radius);
		font-size: var(--font-size-small);
		cursor: pointer;
	}

	.broadcast-button:hover {
		background: var(--red-3);
		border-color: var(--red-7);
	}
</style>
