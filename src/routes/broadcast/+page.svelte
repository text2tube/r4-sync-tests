<script>
	import {pg} from '$lib/db'
	import {sdk} from '@radio4000/sdk'
	import {
		startBroadcasting,
		stopBroadcasting,
		updateBroadcast,
		joinBroadcast,
		leaveBroadcast,
		isBroadcasting,
		isListeningToBroadcast,
		getActiveBroadcasts
	} from '$lib/services/broadcast'

	/** @type {import('$lib/types').AppState} */
	let appState = $state({})

	/** @type {import('$lib/types').Track|undefined} */
	let currentTrack = $state()

	/** @type {import('$lib/types').Channel|undefined} */
	let currentChannel = $state()

	let broadcasting = $state(false)
	let listening = $state(false)
	let testChannelId = $state('')
	let activeBroadcasts = $state([])
	let loadingBroadcasts = $state(false)
	let channelId = $state()

	// Live query for app state
	pg.live.query(`SELECT * FROM app_state WHERE id = 1`, [], async (res) => {
		appState = res.rows[0]
		broadcasting = !!appState.broadcasting_channel_id
		listening = !!appState.listening_to_channel_id
		channelId = appState.channels ? appState.channels[0] : undefined

		console.log('App state updated:', {
			broadcasting_channel_id: appState.broadcasting_channel_id,
			broadcasting,
			listening_to_channel_id: appState.listening_to_channel_id,
			listening
		})

		// Get current track info
		if (appState.playlist_track) {
			const trackRes = await pg.sql`SELECT * FROM tracks WHERE id = ${appState.playlist_track}`
			currentTrack = trackRes.rows[0]

			if (currentTrack) {
				const channelRes =
					await pg.sql`SELECT * FROM channels WHERE id = ${currentTrack.channel_id}`
				currentChannel = channelRes.rows[0]
			}
		}
	})

	async function handleStartBroadcast() {
		if (!currentChannel || !currentTrack) {
			alert(
				'You need to be playing a track to start broadcasting. Go to the home page and start playing music first.'
			)
			return
		}

		try {
			// Auto-start player if it's paused
			const player = document.querySelector('youtube-video')
			if (player && player.paused) {
				player.play()
			}

			await startBroadcasting(currentChannel.id, currentTrack.id)
		} catch (error) {
			console.error('Failed to start broadcast:', error)
			alert('Failed to start broadcast')
		}
	}

	async function handleStopBroadcast() {
		try {
			await stopBroadcasting()
		} catch (error) {
			console.error('Failed to stop broadcast:', error)
		}
	}

	async function handleJoinBroadcast() {
		if (!testChannelId) {
			alert('Please enter a channel ID to join')
			return
		}

		try {
			await joinBroadcast(testChannelId)
		} catch (error) {
			console.error('Failed to join broadcast:', error)
			alert('Failed to join broadcast')
		}
	}

	async function handleLeaveBroadcast() {
		try {
			await leaveBroadcast()
		} catch (error) {
			console.error('Failed to leave broadcast:', error)
		}
	}

	async function refreshBroadcasts() {
		loadingBroadcasts = true
		try {
			activeBroadcasts = await getActiveBroadcasts()
		} catch (error) {
			console.error('Failed to load broadcasts:', error)
		} finally {
			loadingBroadcasts = false
		}
	}

	async function handleJoinActiveBroadcast(channelId) {
		try {
			await joinBroadcast(channelId)
		} catch (error) {
			console.error('Failed to join broadcast:', error)
			alert('Failed to join broadcast')
		}
	}

	// Load broadcasts on mount and set up real-time listeners
	$effect(() => {
		refreshBroadcasts()

		// Listen for real-time changes to the broadcast table
		const broadcastChannel = sdk.supabase
			.channel('broadcast-changes')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'broadcast'
				},
				(payload) => {
					console.log('New broadcast started:', payload)
					refreshBroadcasts()
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'DELETE',
					schema: 'public',
					table: 'broadcast'
				},
				(payload) => {
					console.log('Broadcast ended:', payload)
					refreshBroadcasts()
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'broadcast'
				},
				(payload) => {
					console.log('Broadcast updated:', payload)
					refreshBroadcasts()
				}
			)
			.subscribe()

		// Cleanup function to unsubscribe when component unmounts
		return () => {
			broadcastChannel.unsubscribe()
		}
	})
</script>

<h1>Broadcast Testing</h1>

<section>
	<h2>My Broadcast</h2>

	{#if channelId}
		{#if currentTrack && currentChannel}
			<div>
				<p><strong>Current Track:</strong> {currentTrack.title}</p>
				<p><strong>Channel:</strong> {currentChannel.name}</p>
				<p><strong>Channel ID:</strong> {currentChannel.id}</p>
			</div>

			<menu>
				{#if broadcasting}
					<button onclick={handleStopBroadcast}> 🔴 Stop Broadcasting </button>
					<p>Broadcasting to room: {currentChannel.id}</p>
				{:else}
					<button onclick={handleStartBroadcast}> 📡 Start Broadcasting </button>
				{/if}
			</menu>
		{:else}
			<p>No track currently playing. Go to the <a href="/">home page</a> to start a track first.</p>
		{/if}
	{:else}
		<p><a href="/login">Sign in</a> to start broadcasting.</p>
	{/if}
</section>

<section>
	<h2>Join Broadcast</h2>

	<div>
		<label for="channelId">Channel ID to join:</label>
		<input id="channelId" type="text" bind:value={testChannelId} placeholder="Enter channel ID" />
	</div>

	<menu>
		{#if listening}
			<button onclick={handleLeaveBroadcast}> 📻 Leave Broadcast </button>
			<p>Listening to: {appState.listening_to_channel_id}</p>
		{:else}
			<button onclick={handleJoinBroadcast}> 🎧 Join Broadcast </button>
		{/if}
	</menu>
</section>

<section>
	<h2>Active Broadcasts</h2>

	<menu>
		<button onclick={refreshBroadcasts} disabled={loadingBroadcasts}>
			{loadingBroadcasts ? '🔄 Loading...' : '🔄 Refresh'}
		</button>
	</menu>

	{#if activeBroadcasts.length > 0}
		<ul>
			{#each activeBroadcasts as broadcast (broadcast.channel_id)}
				<li>
					<div>
						<strong>{broadcast.channel_name}</strong>
						<p>👥 {broadcast.listener_count} listener{broadcast.listener_count !== 1 ? 's' : ''}</p>
						<p>🎵 Track: {broadcast.track_id}</p>
						<small>Started: {new Date(broadcast.track_played_at).toLocaleTimeString()}</small>
					</div>
					<button onclick={() => handleJoinActiveBroadcast(broadcast.channel_id)}> 🎧 Join </button>
				</li>
			{/each}
		</ul>
	{:else if !loadingBroadcasts}
		<p>No active broadcasts found.</p>
	{/if}
</section>

<section>
	<h2>Debug Info</h2>
	<details>
		<summary>App State</summary>
		<pre>{JSON.stringify(appState, null, 2)}</pre>
	</details>

	<details>
		<summary>Current Track</summary>
		<pre>{JSON.stringify(currentTrack, null, 2)}</pre>
	</details>

	<details>
		<summary>Current Channel</summary>
		<pre>{JSON.stringify(currentChannel, null, 2)}</pre>
	</details>
</section>

<style>
	section {
		margin: 2rem 0;
		padding: 1rem;
		border: 1px solid var(--gray-5);
		border-radius: var(--border-radius);
	}

	menu {
		display: flex;
		gap: 1rem;
		margin: 1rem 0;
		padding: 0;
	}

	input {
		padding: 0.5rem;
		border: 1px solid var(--gray-5);
		border-radius: var(--border-radius);
		margin-left: 0.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
	}

	pre {
		background: var(--gray-2);
		padding: 1rem;
		border-radius: var(--border-radius);
		overflow-x: auto;
	}
</style>
