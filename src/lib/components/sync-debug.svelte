<script>
	import {pg} from '$lib/db'
	import {needsUpdate} from '$lib/sync'

	let channels = $state([])

	// Live query for channels with track counts
	pg.live.query(
		`
		SELECT 
			c.*,
			COUNT(t.id) as track_count
		FROM channels c
		LEFT JOIN tracks t ON c.id = t.channel_id
		GROUP BY c.id
		ORDER BY c.name
	`,
		[],
		(result) => {
			channels = result.rows
		}
	)

	async function deleteChannel(channelId, channelName) {
		if (!confirm(`Delete channel "${channelName}" and all its tracks?`)) return
		await pg.sql`DELETE FROM channels WHERE id = ${channelId}`
	}

	async function deleteTracks(channelId, channelName) {
		if (!confirm(`Delete all tracks for "${channelName}"?`)) return
		await pg.sql`DELETE FROM tracks WHERE channel_id = ${channelId}`
		await pg.sql`UPDATE channels SET tracks_synced_at = NULL WHERE id = ${channelId}`
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'Never'
		return new Date(dateStr).toLocaleString()
	}

	function getStatusIndicator(channel) {
		if (channel.firebase_id) return '🟡' // v1 channel
		if (!channel.tracks_synced_at) return '🔴' // Never synced
		if (channel.track_count === 0) return '🔴' // No tracks
		return '🟢' // Synced with tracks
	}

	function getStatusText(channel) {
		if (channel.firebase_id) return 'v1 (read-only)'
		if (!channel.tracks_synced_at) return 'Never synced'
		if (channel.track_count === 0) return 'No tracks'
		return 'Synced'
	}
</script>

<section>
	<h3>Sync Debug ({channels.length} channels)</h3>

	{#if channels.length === 0}
		<p>No channels found. Run sync to populate.</p>
	{:else}
		<details>
			<summary>Legend</summary>
			<ul>
				<li>🟢 Up to date</li>
				<li>🟠 Needs update</li>
				<li>🔴 Never synced</li>
				<li>🟡 v1 channel (read-only)</li>
			</ul>
		</details>

		<div class="channel-list">
			{#each channels as channel (channel.id)}
				<article>
					<div>
						<span>{getStatusIndicator(channel)}</span>
						<strong>{channel.name} </strong>
						<span>/{channel.slug}</span>
						<span class="track-count">{channel.track_count} tracks</span>
					</div>

					<p>
						{getStatusText(channel)}
						{#if channel.tracks_synced_at}
							synced: {formatDate(channel.tracks_synced_at)}
						{/if}
						{#if channel.busy}
							🔄 Syncing...
						{/if}
					</p>

					<menu class="channel-actions">
						<button
							onclick={() => deleteTracks(channel.id, channel.name)}
							disabled={channel.track_count === 0}
						>
							Delete tracks
						</button>
						<button onclick={() => deleteChannel(channel.id, channel.name)} class="danger">
							Delete channel
						</button>
					</menu>
				</article>
			{/each}
		</div>
	{/if}
</section>

<style>
	section {
		margin: 1rem 0.5rem;
	}

	.channel-list {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		margin: 2rem 0;

		article {
			display: flex;
			flex-direction: column;
			gap: 0rem;
		}

		p,
		menu {
			margin: 0;
		}

		p {
			margin: 0.2rem 0 0.5rem;
		}
	}
</style>
