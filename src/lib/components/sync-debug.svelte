<script>
	import {pg} from '$lib/db'
	import {pullTracks} from '$lib/sync'
	import InternetIndicator from '$lib/components/internet-indicator.svelte'

	/** @type {import('$lib/types').Channel[]} */
	let channels = $state([])

	// Live query for channels with track counts
	$effect(() => {
		console.log('new sync-debug live query')
		const liveQuery = pg.live.query(
			`
			SELECT * FROM channels
			ORDER BY name
		`,
			[],
			(result) => {
				console.log('sync-debug query callback', result)
				// @ts-expect-error rows are not typed
				channels = result.rows
			}
		)

		return () => {
			liveQuery.then(({unsubscribe}) => unsubscribe())
		}
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

<section>
	<h3>
		Sync debug ({channels.length} channels)
	</h3>

	<menu>
		<button>Channels that were synced</button>
	</menu>

	{#if channels.length === 0}{:else}
		<div class="list">
			{#each channels as channel (channel.id)}
				<article>
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
						<button
							onclick={() => deleteTracks(channel.id)}
							disabled={!channel.tracks_synced_at}
						>
							&times; Delete tracks
						</button>
						<button onclick={() => deleteChannel(channel.id)} class="danger">
							&times; Delete channel
						</button>
					</menu>
				</article>
			{/each}
		</div>
	{/if}
</section>

<InternetIndicator />

<style>
	.list > article {
		padding: 0.5rem 0;
		display: flex;
		align-items: center;
		menu {
			margin-left: auto;
		}
	}
</style>
