<script>
	import {pg} from '$lib/db'
	import {pullTracks, dryRun} from '$lib/sync'

	/** @type {import('$lib/types').Channel[]} */
	let channels = $state([])

	// Live query for channels with track counts
	$effect(() => {
		const liveQuery = pg.live.query(
			`
			SELECT * FROM channels
			ORDER BY name
		`,
			[],
			(result) => {
				console.log('channels live query', result)
				channels = result.rows
			}
		)

		// Cleanup function - unsubscribe when effect re-runs or component unmounts
		return () => {
			liveQuery.then(({unsubscribe}) => unsubscribe())
		}
	})

	/**
	 * @param {string} id
	 * @param {string} name
	 */
	async function deleteChannel(id, name) {
		await pg.sql`DELETE FROM channels WHERE id = ${id}`
	}

	/**
	 * @param {string} id
	 * @param {string} name
	 */
	async function deleteTracks(id, name) {
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
		if (channel.busy) return '🔄'
		if (!channel.tracks_synced_at) return '🔴'
		return '🟢'
	}

	/** @param {import('$lib/types').Channel} channel */
	function getStatusText(channel) {
		if (channel.busy) return 'Syncing...'
		if (!channel.tracks_synced_at) return 'Never synced'
		return 'Synced'
	}

	/** @param {import('$lib/types').Channel} channel */
	function getVersionText(channel) {
		return channel.firebase_id ? 'v1' : 'v2'
	}
</script>

<section>
	<h3>
		Sync status ({channels.length} channels)
		<button onclick={dryRun}>Dry run</button>
	</h3>

	{#if channels.length === 0}{:else}
		<section class="list">
			{#each channels as channel (channel.id)}
				<article>
					<div>
						<p>
							<a href={`/${channel.slug}`}>@{channel.slug}</a>
							<span class="track-count">{channel.name}</span>
						</p>
						<p>
							{getStatusIndicator(channel)}
							{getStatusText(channel)}
							<span class="version">({getVersionText(channel)})</span>
							{#if channel.tracks_synced_at}
								{formatDate(channel.tracks_synced_at)}
							{/if}
						</p>
					</div>

					<menu>
						<button onclick={() => pullTracks(channel.slug)}>&darr; Pull tracks</button>
						<button
							onclick={() => deleteTracks(channel.id, channel.name)}
							disabled={!channel.tracks_synced_at}
						>
							&times; Delete tracks
						</button>
						<button onclick={() => deleteChannel(channel.id, channel.name)} class="danger">
							&times; Delete channel
						</button>
					</menu>
				</article>
			{/each}
		</section>
	{/if}
</section>

<style>
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
	.version {
		opacity: 0.6;
		font-size: 0.9em;
	}
</style>
