<script>
	import {pg} from '$lib/db'
	import {pullTracks} from '$lib/sync'
	import SvelteVirtualList from '@humanspeak/svelte-virtual-list'
	import {logger} from '$lib/logger'
	const log = logger.ns('sync-debug').seal()

	/** @type {import('$lib/types').Channel[]} */
	let channels = $state([])

	// Live query for channels with track counts
	$effect(() => {
		log.info('create_live_query')
		let cleanup

		pg.live
			.query(
				`
			SELECT * FROM channels
			ORDER BY name
		`,
				[],
				(result) => {
					log.info('query_result', result)
					// @ts-expect-error rows are not typed
					channels = result.rows
				}
			)
			.then(({initialResults, unsubscribe}) => {
				// @ts-expect-error rows are not typed
				channels = initialResults.rows
				cleanup = unsubscribe
			})

		return () => cleanup?.()
	})

	/** * @param {string} id */
	async function deleteChannel(id) {
		await pg.sql`DELETE FROM channels WHERE id = ${id}`
	}

	/** * @param {string} id */
	async function deleteTracks(id) {
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
		if (!channel.tracks_synced_at) return '🟡'
		return '🟢'
	}

	/** @param {import('$lib/types').Channel} channel */
	function getStatusText(channel) {
		if (channel.busy) return 'Syncing...'
		if (!channel.tracks_synced_at) return 'Synced without tracks'
		return 'Synced'
	}
</script>

<section style="height: 500px">
	<h3>
		Sync debug ({channels.length} channels)
	</h3>

	{#if channels.length === 0}{:else}
		<SvelteVirtualList items={channels} itemsClass="list">
			{#snippet renderItem(channel)}
				<article class="item">
					<p>
						{getStatusIndicator(channel)}
						<span class="version">({channel.firebase_id ? 'v1' : 'v2'})</span>
						<a href={`/${channel.slug}`}>
							@{channel.slug}
							{channel.name}
						</a>
						<br />
						{getStatusText(channel)}
						{#if channel.tracks_synced_at}
							{formatDate(channel.tracks_synced_at)}
						{/if}
					</p>

					<menu>
						<button onclick={() => pullTracks(channel.slug)}>&darr; Pull tracks</button>
						<button onclick={() => deleteTracks(channel.id)} disabled={!channel.tracks_synced_at}>
							&times; Delete tracks
						</button>
						<button onclick={() => deleteChannel(channel.id)} class="danger">
							&times; Delete channel
						</button>
					</menu>
				</article>
			{/snippet}
		</SvelteVirtualList>
	{/if}
</section>

<style>
	.item {
		padding: 0.5rem 0;
		display: flex;
		align-items: center;
		menu {
			margin-left: auto;
		}
	}
</style>
