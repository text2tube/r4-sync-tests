<script>
	import {subscribeToAppState, queryTrackWithChannel} from '$lib/api'
	import {toggleShuffle, previous, next, toggleVideo, eject} from '$lib/api/player'
	import Icon from '$lib/components/icon.svelte'
	import YoutubePlayer from '$lib/components/youtube-player.svelte'
	import ChannelAvatar from './channel-avatar.svelte'
	import {logger} from '$lib/logger'
	const log = logger.ns('player').seal()

	/** @typedef {import('$lib/types').Channel} Channel */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').AppState} AppState */

	/** @type {{appState: AppState}} */
	let {appState} = $props()

	let autoplay = $state(false)

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
			<button onclick={handleEject} title="Clear queue and stop playback">
				<Icon icon={'eject'} />
			</button>
			<button
				onclick={() => toggleShuffle(appState, trackIds, track)}
				aria-pressed={appState.shuffle}
				title={appState.shuffle ? 'Disable shuffle' : 'Enable shuffle'}
			>
				<Icon icon={'shuffle'} />
			</button>
			<button onclick={() => previous(track, activeQueue, 'user_prev')} title="Go previous track">
				<Icon icon={'previous-fill'} />
			</button>
			{#if appState.is_playing}
				<button class="pause" onclick={pause}>
					<Icon icon={'pause'} />
				</button>
			{:else}
				<button class="play" onclick={play}>
					<Icon icon={'play-fill'} />
				</button>
			{/if}
			<button onclick={() => next(track, activeQueue, 'user_next')} title="Go next track">
				<Icon icon={'next-fill'} />
			</button>
			<button onclick={() => toggleVideo(appState)} title="Show/hide video">
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

	@media (max-width: 600px) {
		media-volume-range {
			display: none;
		}
	}

	/* Fixed bottom */
	:global(footer:not(:has(input:checked)) > article) {
		display: flex;
		gap: 0.5rem;

		@media (min-width: 600px) {
			:global(media-control-bar) {
				margin-right: 0.5rem;
			}
		}

		header {
			width: 40ch;
			@media (min-width: 600px) {
			}

			grid-template-columns: 4rem auto;
			gap: 0.5rem;
			margin-left: 0.5rem;
			align-items: center;

			div {
				display: flex;
				flex-flow: column wrap;
				gap: 0.2rem;
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
