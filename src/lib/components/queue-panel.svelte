<script>
	import {pg} from '$lib/db'
	import {liveQuery, incrementalLiveQuery} from '$lib/live-query'
	import {appState} from '$lib/app-state.svelte'
	import Tracklist from './tracklist.svelte'
	import TrackCard from './track-card.svelte'
	import Modal from './modal.svelte'

	let view = $state('queue') // 'queue' or 'history'
	let showClearHistoryModal = $state(false)

	/** @type {string[]} */
	let trackIds = $derived(appState.playlist_tracks || [])

	/** @type {import('$lib/types').Track[]} */
	let queueTracks = $state([])

	/** @type {(import('$lib/types').Track & import('$lib/types').PlayHistory)[]} */
	let playHistory = $state([])

	$effect(() => {
		if (trackIds.length === 0) {
			queueTracks = []
			return
		}

		const uniqueIds = [...new Set(trackIds)]
		return incrementalLiveQuery(
			`SELECT twm.*
			 FROM tracks_with_meta twm
			 WHERE twm.id IN (select unnest($1::uuid[]))`,
			[uniqueIds],
			'id',
			(res) => {
				const trackMap = new Map(res.rows.map((track) => [track.id, track]))
				queueTracks = trackIds.map((id) => trackMap.get(id)).filter(Boolean)
			}
		)
	})

	$effect(() => {
		return liveQuery(
			`SELECT twm.*, h.started_at, h.ended_at, h.ms_played, h.reason_start, h.reason_end, h.skipped
			 FROM play_history h
			 JOIN tracks_with_meta twm ON h.track_id = twm.id
			 ORDER BY h.started_at ASC LIMIT 50`,
			[],
			(res) => {
				playHistory = res.rows
			}
		)
	})

	function clearQueue() {
		appState.playlist_tracks = []
		appState.playlist_track = undefined
	}

	async function clearHistory() {
		await pg.sql`DELETE FROM play_history`
		showClearHistoryModal = false
	}
</script>

<aside>
	<header>
		<div class="view-buttons">
			<button onclick={() => (view = 'queue')} class:active={view === 'queue'}
				>Queue ({queueTracks.length})</button
			>
			<button onclick={() => (view = 'history')} class:active={view === 'history'}
				>History ({playHistory.length})</button
			>
		</div>
		{#if view === 'queue' && trackIds.length > 0}
			<button onclick={clearQueue}>Clear</button>
		{:else if view === 'history' && playHistory.length > 0}
			<button onclick={() => (showClearHistoryModal = true)} title="Clear playlist history"
				>Clear</button
			>
		{/if}
	</header>
	<main class="scroll">
		{#if view === 'queue'}
			{#if trackIds.length > 0}
				<Tracklist tracks={queueTracks} />
			{:else}
				<div class="empty-state">
					<p>No tracks in queue</p>
					<p><small>Select a channel to start playing</small></p>
				</div>
			{/if}
		{:else if playHistory.length > 0}
			<ul class="list tracks">
				{#each playHistory as entry, index (index)}
					<li>
						<TrackCard track={entry} {index}>
							<p class="history">
								<small>
									{new Date(entry.started_at).toLocaleTimeString()}
									{#if entry.reason_start}• {entry.reason_start}{/if}
									{#if entry.reason_end}→ {entry.reason_end}{/if}
									{#if entry.ms_played}• {Math.round(entry.ms_played / 1000)}s{/if}
								</small>
							</p>
						</TrackCard>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="empty-state">
				<p>No play history</p>
				<p><small>Start playing tracks to see history</small></p>
			</div>
		{/if}
	</main>
</aside>

<Modal bind:showModal={showClearHistoryModal}>
	{#snippet header()}
		<h2>Clear listening history</h2>
	{/snippet}
	<p>Are you sure you want to clear your listening history? This cannot be undone.</p>
	<menu>
		<button onclick={() => (showClearHistoryModal = false)}>Cancel</button>
		<button onclick={clearHistory} class="danger">Clear History</button>
	</menu>
</Modal>

<style>
	aside {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: light-dark(var(--gray-1), var(--gray-2));
		border-left: 1px solid var(--gray-5);

		/* perf trick! */
		contain: layout size;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem;
		border-bottom: 1px solid var(--gray-5);
		background: light-dark(var(--gray-2), var(--gray-3));
		font-size: var(--font-size-regular);
	}

	p.history {
		margin: 0 0 0 0.5rem;
	}

	.view-buttons {
		display: flex;
		gap: 0.25rem;
	}

	.view-buttons button.active {
		background: var(--gray-4);
	}

	main {
		flex: 1;
		padding-bottom: 12rem;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;

		p {
			margin: 0;
		}

		small {
			color: var(--gray-9);
		}
	}

	.tracks :global(.slug) {
		display: none;
	}
</style>
