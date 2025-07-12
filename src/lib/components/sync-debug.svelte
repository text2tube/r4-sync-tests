<script>
	import {pg} from '$lib/db'
	import {pullTracks} from '$lib/sync'

	/** @type {import('$lib/types').Channel[]} */
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

	/**
	 * @param {string} id
	 * @param {string} name
	 */
	async function deleteChannel(id, name) {
		if (!confirm(`Delete channel "${name}" and all its tracks?`)) return
		await pg.sql`DELETE FROM channels WHERE id = ${id}`
	}

	/**
	 * @param {string} id
	 * @param {string} name
	 */
	async function deleteTracks(id, name) {
		if (!confirm(`Delete all tracks for "${name}"?`)) return
		await pg.sql`DELETE FROM tracks WHERE channel_id = ${id}`
		await pg.sql`UPDATE channels SET tracks_synced_at = NULL WHERE id = ${id}`
	}

	/** @param {string | null} dateStr */
	function formatDate(dateStr) {
		if (!dateStr) return 'Never'
		return new Date(dateStr).toLocaleString()
	}

	/** @param {import('$lib/types').Channel} channel */
	function getStatusIndicator(channel) {
		if (channel.firebase_id) return '🟡'
		if (!channel.tracks_synced_at) return '🔴'
		if (channel.track_count === 0) return '🔴'
		return '🟢'
	}

	/** @param {import('$lib/types').Channel} channel */
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
		<section class="list">
			{#each channels as channel (channel.id)}
				<article>
					<div>
						<p>
							<span>@{channel.slug}</span>
							<span class="track-count">{channel.track_count} tracks</span>
						</p>
						<p>
							{getStatusIndicator(channel)}
							{getStatusText(channel)}
							{#if channel.tracks_synced_at}
								{formatDate(channel.tracks_synced_at)}
							{/if}
							{#if channel.busy}
								🔄 Syncing...
							{/if}
						</p>
					</div>

					<menu>
						<button onclick={() => pullTracks(channel.slug)}>Pull tracks</button>
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
		</section>
	{/if}
</section>

<style>
	section {
		margin: 1rem 0.5rem;
	}

	.list {
		article {
			display: flex;
			align-items: center;
			padding: 0.2rem 0;
		}
		p,
		menu {
			margin: 0;
		}
		menu {
			margin-left: auto;
		}
	}
</style>
