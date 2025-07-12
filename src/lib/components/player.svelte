<script>
	import {pg} from '$lib/db'
	import ChannelAvatar from './channel-avatar.svelte'
	import YoutubePlayer from '$lib/components/youtube-player.svelte'
	import {
		IconShuffle,
		IconPreviousFill,
		IconNextFill,
		IconPause,
		IconPlayFill
		// IconVolume1Fill,
		// IconVolume2Fill,
		// IconVolumeOffFill
	} from 'obra-icons-svelte'
	import {playTrack, subscribeToAppState, getTrackWithChannel} from '$lib/api'

	/** @typedef {import('$lib/types').Channel} Channel */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').AppState} AppState */

	let autoplay = $state(false)

	let title = $state('')
	let image = $state('')
	let description = $state('')
	let slug = $state('')

	/** @type {AppState} */
	let appState = $state({})

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
		const trackChanged = appState.playlist_track && appState.playlist_track !== state.playlist_track
		const tid = state.playlist_track
		if (tid) {
			await setChannelFromTrack(tid)
		}
		if (trackChanged) {
			console.log('playlist_track changed -> autoplay=true')
			autoplay = true
		}
		appState = state
	})

	/** @param {string} tid} */
	async function setChannelFromTrack(tid) {
		if (!tid || tid === track?.id) return
		const result = await getTrackWithChannel(tid)
		if (result) {
			track = result.track
			title = result.channel.name
			image = result.channel.image
			description = result.channel.description
			slug = result.channel.slug
		}
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

	function previous() {
		if (!track?.id) return
		const idx = activeQueue.indexOf(track.id)
		const prev = activeQueue[idx - 1]
		if (prev) playTrack(prev)
	}

	function next() {
		if (!track?.id) return
		const idx = activeQueue.indexOf(track.id)
		const next = activeQueue[idx + 1]
		if (next) playTrack(next)
	}

	function play() {
		if (!track) {
			console.log('Play called without track')
			return
		}
		yt.play()
		console.log('play() -> autoplay=true')
		autoplay = true
	}

	function handleError(event) {
		const code = event.target.error.code
		if (code === 150) {
			console.log('YouTube player error 150 -> next()')
			next()
		} else {
			console.warn('Unhandled player error', code)
		}
	}

	function handleEndTrack() {
		console.log('Player ended')
		next()
	}
</script>

<article>
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

	<div class="center">
		<menu>
			<button
				onclick={toggleShuffle}
				aria-pressed={appState.shuffle}
				title={appState.shuffle ? 'Disable shuffle' : 'Enable shuffle'}
			>
				<IconShuffle />
			</button>
			<button onclick={previous} title="Go previous track">
				<IconPreviousFill />
			</button>
			<button class="play" onclick={play}>
				<IconPlayFill />
			</button>
			<button class="pause" onclick={() => yt.pause()}>
				<IconPause />
			</button>
			<button onclick={next} title="Go next track">
				<IconNextFill />
			</button>
		</menu>

		<media-control-bar mediacontroller="r5">
			<media-time-range></media-time-range>
			<media-time-display showduration></media-time-display>
		</media-control-bar>
	</div>

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
			<IconVolumeOffFill />
		{:else if volume < 50}
			<IconVolume1Fill />
		{:else}
			<IconVolume2Fill />
		{/if}
		<input type="range" min="0" max="100" name="volume" onchange={setVolume} />
	</label>
 -->
</article>

<style>
	header {
		display: grid;
	}

	.center {
		display: flex;
		flex-flow: column nowrap;
	}

	menu {
		display: flex;
		margin: auto;
		padding: 0;
		place-content: center;
	}

	h2,
	h3,
	p,
	figure {
		margin: 0;
	}

	h3 {
		font-weight: 400;
	}

	/* Fixed bottom */
	:global(footer:not(:has(input:checked))) {
		padding-right: 0.5rem;
	}

	:global(footer:not(:has(input:checked)) > article) {
		display: grid;
		grid-template-columns: 1fr 2fr auto;
		gap: 0.5rem;
		/* justify-items: center; */

		header {
			grid-template-columns: 3rem auto;
			gap: 0.5rem;
			align-items: center;

			div {
				display: flex;
				flex-flow: column wrap;
				gap: 0.25rem;
				line-height: 1;
			}
		}
		.center {
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
		header p:last-of-type {
			margin-top: 1rem;
			max-width: 80ch;
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
