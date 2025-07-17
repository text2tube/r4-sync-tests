<script>
	import {pg} from '$lib/db'
	import {playTrack, subscribeToAppState, queryTrackWithChannel} from '$lib/api'
	import Icon from '$lib/components/icon.svelte'
	import YoutubePlayer from '$lib/components/youtube-player.svelte'
	import ChannelAvatar from './channel-avatar.svelte'

	/** @typedef {import('$lib/types').Channel} Channel */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').AppState} AppState */

	/** @type {{appState: AppState}} */
	let {appState} = $props()

	let autoplay = $state(false)
	let isPlaying = $state(false)

	let title = $state('')
	let image = $state('')
	let description = $state('')
	let slug = $state('')

	/** @type {string[]} */
	let trackIds = $derived(appState.playlist_tracks || [])

	/** @type {string[]} */
	let activeQueue = $derived(appState.shuffle ? appState.playlist_tracks_shuffled || [] : trackIds)

	/** @type {Track|undefined} */
	let track = $state()

	let yt = $state()

	/** @type {boolean} */
	let isListeningToBroadcast = $derived(!!appState.listening_to_channel_id)

	subscribeToAppState(async (state) => {
		const tid = state.playlist_track
		const trackChanged = tid && tid !== track?.id
		if (tid) await setChannelFromTrack(tid)
		if (trackChanged) autoplay = true
		if (state.is_playing) isPlaying = true
	})

	/** @param {string} tid} */
	async function setChannelFromTrack(tid) {
		if (!tid || tid === track?.id) return
		const result = await queryTrackWithChannel(tid)
		if (!result) return
		track = result.track
		title = result.channel.name
		image = result.channel.image
		description = result.channel.description
		slug = result.channel.slug
	}

	function generateShuffleQueue() {
		const shuffled = [...trackIds].sort(() => Math.random() - 0.5)

		// If current track exists, put it first in shuffle queue
		if (track?.id && shuffled.includes(track.id)) {
			const filtered = shuffled.filter((id) => id !== track.id)
			return [track.id, ...filtered]
		}
		return shuffled
	}

	function toggleShuffle() {
		const newShuffleState = !appState.shuffle

		if (newShuffleState) {
			// Turning shuffle ON - generate new shuffle queue
			const shuffledQueue = generateShuffleQueue()
			pg.sql`UPDATE app_state SET shuffle = true, playlist_tracks_shuffled = ${shuffledQueue} WHERE id = 1`
		} else {
			// Turning shuffle OFF - clear shuffle queue
			pg.sql`UPDATE app_state SET shuffle = false, playlist_tracks_shuffled = ${[]} WHERE id = 1`
		}
	}

	function previous(reason) {
		if (!track?.id) return
		const idx = activeQueue.indexOf(track.id)
		const prev = activeQueue[idx - 1]
		if (prev) playTrack(prev, reason, reason)
	}

	function next(reason) {
		if (!track?.id) return
		const idx = activeQueue.indexOf(track.id)
		const next = activeQueue[idx + 1]
		if (next) {
			const startReason =
				reason === 'track_completed' || reason === 'youtube_error' ? 'auto_next' : reason
			playTrack(next, reason, startReason)
		}
	}

	function play() {
		if (!track) {
			console.log('Play called without track')
			return
		}
		yt.play()
		pg.sql`UPDATE app_state SET is_playing = true`
		autoplay = true
	}
	function pause() {
		yt.pause()
		pg.sql`UPDATE app_state SET is_playing = false`
		autoplay = false
	}

	function handleError(event) {
		const code = event.target.error.code
		if (code === 150) {
			console.log('YouTube player error 150 -> next()')
			next('youtube_error')
		} else {
			console.warn('Unhandled player error', code)
		}
	}

	function handleEndTrack() {
		console.log('player track_completed')
		next('track_completed')
	}

	function eject() {
		yt?.pause()
		image = null
		title = null
		slug = null
		track = null
		pg.sql`UPDATE app_state SET
			playlist_tracks = ${[]},
			playlist_track = null,
			playlist_tracks_shuffled = ${[]},
			show_video_player = false,
			shuffle = false,
			is_playing = false
			WHERE id = 1`
	}

	function toggleVideo() {
		pg.sql`UPDATE app_state SET show_video_player = ${!appState.show_video_player}`
	}
	function togglePlay() {
		pg.sql`UPDATE app_state SET is_playing = ${!appState.is_playing}`
	}
</script>

<article class={['player', {showVideo: appState.show_video_player}]}>
	<header>
		<figure>
			<ChannelAvatar id={image} alt={title} />
		</figure>
		<div>
			<h2>
				<a href={`/${slug}`}>{title}</a>
				{#if isListeningToBroadcast}
					<span class="broadcast-indicator">🔴 LIVE</span>
				{/if}
			</h2>
			<h3>{track?.title}</h3>
		</div>
	</header>

	<main class="center">
		<menu>
			<button onclick={eject} title="Clear queue and stop playback">
				<Icon icon={'eject'} />
			</button>
			<button
				onclick={toggleShuffle}
				aria-pressed={appState.shuffle}
				title={appState.shuffle ? 'Disable shuffle' : 'Enable shuffle'}
			>
				<Icon icon={'shuffle'} />
			</button>
			<button onclick={() => previous('user_prev')} title="Go previous track">
				<Icon icon={'previous-fill'} />
			</button>
			{#if !isPlaying}
				<button class="play" onclick={play}>
					<Icon icon={'play-fill'} />
				</button>
			{:else}
				<button class="pause" onclick={pause}>
					<Icon icon={'pause'} />
				</button>
			{/if}
			<button onclick={() => next('user_next')} title="Go next track">
				<Icon icon={'next-fill'} />
			</button>
			<button onclick={toggleVideo} title="Show/hide video">
				<Icon icon={'video'} />
			</button>
		</menu>

		<media-control-bar mediacontroller="r5">
			<media-time-range></media-time-range>
			<media-time-display showduration></media-time-display>
		</media-control-bar>
	</main>

	<media-control-bar mediacontroller="r5">
		<!-- <media-play-button></media-play-button> -->
		<!-- <media-time-range></media-time-range> -->
		<!-- <media-playback-rate-button></media-playback-rate-button> -->
		<!-- <media-fullscreen-button></media-fullscreen-button> -->
		<media-mute-button></media-mute-button>
		<media-volume-range></media-volume-range>
	</media-control-bar>

	<YoutubePlayer
		url={track?.url}
		bind:yt
		{autoplay}
		onerror={handleError}
		onended={handleEndTrack}
	/>

	<!-- <label class="volume">
		{#if volume < 1}
			<Icon icon={"volume-off-fill"} />
		{:else if volume < 50}
			<Icon icon={"volume1-fill"} />
		{:else}
			<Icon icon={"volume2-fill"} />
		{/if}
		<input type="range" min="0" max="100" name="volume" onchange={setVolume} />
	</label>
 -->
</article>

<style>
	header {
		display: grid;
		margin-left: 0.5rem;
	}

	main {
		flex: 2;
		display: flex;
		flex-flow: column nowrap;
		margin: 0 auto;
		max-width: 640px;
	}

	menu {
		display: flex;
		margin: auto;
		padding: 0;
		place-content: center;
	}

	h3 {
		font-weight: 400;
	}

	/* Fixed bottom */
	:global(footer:not(:has(input:checked)) > article) {
		display: grid;
		gap: 0.5rem;

		@media (min-width: 600px) {
			display: flex;

			:global(media-control-bar) {
				margin-right: 0.5rem;
			}
		}

		header {
			width: 40ch;
			/* flex: 1; */
			grid-template-columns: 4rem auto;
			gap: 0.5rem;
			margin-left: 0.5rem;
			align-items: center;

			div {
				display: flex;
				flex-flow: column wrap;
				gap: 0.25rem;
				line-height: 1;
			}
		}
		main {
			flex: 1;
		}
		menu {
			margin-top: 0.5rem;
		}
		h2,
		h3 {
			font-size: var(--font-size-regular);
		}
	}

	/* Full overlay */
	:global(footer:has(input:checked) > article) {
		height: 100%;
		header {
			margin: 3rem auto auto;
			grid-template-columns: auto;
			place-items: center;
			text-align: center;
		}
		figure {
			margin-bottom: 2vh;
		}
		menu {
			padding: 0;
			margin-top: 1rem;
		}
		:global(youtube-video) {
			min-height: 300px;
		}
	}

	[aria-pressed='false'] :global(svg) {
		opacity: 0.2;
	}

	.broadcast-indicator {
		font-size: 1em;
		margin-left: 0.2rem;
		color: red;
	}

	media-control-bar {
		--media-control-height: 2rem;
		--media-background-color: transparent;
		--media-control-hover-background: transparent;
		--media-button-icon-width: 1.5rem;
		--media-button-padding: 0 0.5rem;
		--media-control-padding: 0.5rem;
		--media-control-background: none;
		--media-primary-color: var(--gray-12);
		--media-text-color: var(--gray-12);
		--media-icon-color: var(--gray-12);
		--media-range-track-background: hsla(0, 0%, 0%, 0.2);
		--media-range-track-background: var(--gray-11);
		--media-range-track-background: hsla(0, 0%, 0%, 0.2);
	}
</style>
