<script>
	import {sdk} from '@radio4000/sdk'
	import {pg} from '$lib/db'
	import {joinBroadcast} from '$lib/services/broadcast'

	/** @type {any[]} */
	let activeBroadcasts = $state([])

	pg.live.query(`
		SELECT 
			b.channel_id,
			b.track_id,
			b.track_played_at,
			c.name as channel_name,
			c.slug as channel_slug
		FROM broadcasts b
		LEFT JOIN channels c ON b.channel_id = c.id
		ORDER BY b.track_played_at DESC
	`, [], (res) => {
		activeBroadcasts = res.rows
	})

	async function syncRemoteBroadcasts() {
		try {
			console.log('🔄 Syncing remote broadcasts...')
			const {data, error} = await sdk.supabase.from('broadcast').select(`
				channel_id,
				track_id,
				track_played_at
			`)
			if (error) throw error
			
			console.log('📡 Got remote broadcasts:', data?.length || 0, data)
			
			await pg.sql`DELETE FROM broadcasts`
			
			for (const broadcast of data || []) {
				await pg.sql`
					INSERT INTO broadcasts (channel_id, track_id, track_played_at)
					VALUES (${broadcast.channel_id}, ${broadcast.track_id}, ${broadcast.track_played_at})
				`
			}

			const localCount = await pg.sql`SELECT COUNT(*) as count FROM broadcasts`
			console.log('💾 Local broadcasts after sync:', localCount.rows[0].count)

		} catch (error) {
			console.error('Failed to sync remote broadcasts:', error)
		}
	}

	$effect(() => {
		console.log('here')
		syncRemoteBroadcasts()

		const broadcastChannel = sdk.supabase
			.channel('live-broadcasts')
			.on('postgres_changes', {event: '*', schema: 'public', table: 'broadcast'}, () => {
				console.log('remote broadcast change detected -> syncing to local')
				syncRemoteBroadcasts()
			})
			.subscribe()

		return () => broadcastChannel.unsubscribe()
	})
</script>

{#if activeBroadcasts.length > 0}
	<div class="live-broadcasts">
		<span>🔴 Live:</span>
		{#each activeBroadcasts as broadcast (broadcast.channel_id)}
			<button onclick={() => joinBroadcast(broadcast.channel_id)}>
				{broadcast.channel_name}
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

	.live-broadcasts button {
		background: var(--red-2);
		color: var(--red-11);
		border: 1px solid var(--red-6);
		padding: 0.25rem 0.5rem;
		border-radius: var(--border-radius);
		font-size: var(--font-size-small);
		cursor: pointer;
	}

	.live-broadcasts button:hover {
		background: var(--red-3);
		border-color: var(--red-7);
	}
</style>
