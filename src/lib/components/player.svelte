<script>
	import 'media-chrome'
	import 'youtube-video-element'
	import {subscribeToAppState, queryTrackWithChannel} from '$lib/api'
	import {pg} from '$lib/db'
	import {logger} from '$lib/logger'
	import ChannelAvatar from './channel-avatar.svelte'
	import Icon from '$lib/components/icon.svelte'

	import {
		togglePlay,
		next,
		previous,
		toggleShuffle,
		toggleVideo,
		play,
		pause
	} from '$lib/api/player'
	import {extractYouTubeId} from '$lib/utils'
	import {tick} from 'svelte'

	const log = logger.ns('youtube_player').seal()

	/** @typedef {import('$lib/types').AppState} AppState */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').Channel} Channel */

	/** @type {{appState: AppState, expanded: boolean}} */
	let {appState, expanded = $bindable()} = $props()

	// The YouTube player element
	let yt = $state()

	/** @type {Track|undefined} */
	let track = $state()

	/** @type {Channel|undefined} */
	let channel = $state()

	// Volume persistence
	let savedVolume = $state()
	let savedMuted = $state()
	let hasAppliedInitialValues = $state(false)

	// mirror of app_state.is_playing
	let isPlaying = $state(false)

	/** @type {string[]} */
	let trackIds = $derived(appState.playlist_tracks || [])

	/** @type {string[]} */
	let activeQueue = $derived(appState.shuffle ? appState.playlist_tracks_shuffled || [] : trackIds)

	let didPlay = $state(false)
	const canPlay = $derived(Boolean(channel && track))
	const autoplay = $derived(didPlay ? 1 : 0)

	const isListeningToBroadcast = $derived(Boolean(appState.listening_to_channel_id))

	/** @type {string} */
	let trackImage = $derived.by(() => {
		if (!track?.url) return ''
		const ytid = extractYouTubeId(track.url)
		return ytid ? `https://i.ytimg.com/vi/${ytid}/mqdefault.jpg` : '' // default, mqdefault, hqdefault, sddefault, maxresdefault
	})

	// Load saved volume values from DB
	$effect(() => {
		pg.query('select volume, muted from app_state where id = 1').then((res) => {
			const row = res.rows[0]
			savedVolume = row
				? typeof row.volume === 'string'
					? Number.parseFloat(row.volume)
					: row.volume
				: 0.1
			savedMuted = row ? row.muted : true
			console.log('loaded from db', savedVolume, savedMuted)
		})
	})

	subscribeToAppState(async (state) => {
		const tid = state.playlist_track
		const trackChanged = tid && tid !== track?.id
		if (trackChanged) {
			// debugger
			const ytplayer = yt || document.querySelector('youtube-video')
			const paused = ytplayer.paused
			// const wasPlaying = track && yt && !paused
			await setChannelFromTrack(tid)
			console.log('track changed', {track: track?.title, yt, paused, didPlay, autoplay})
			// Only auto-play if we were already playing when track changed
			if (didPlay && yt) {
				console.log('Auto-playing next track, yt ready:', !!yt, 'didPlay:', didPlay)
				// Wait for YouTube element to be ready before playing
				yt.loadComplete.then(() => {
					console.log('YouTube loadComplete, calling play')
					play(yt)
				})
			}
		}
	})

	/** @param {string} tid */
	async function setChannelFromTrack(tid) {
		if (!tid || tid === track?.id) return
		const result = await queryTrackWithChannel(tid)
		if (!result) return
		track = result.track
		channel = result.channel
	}

	async function handlePlay() {
		console.log('handlePlay')
		isPlaying = true
		didPlay = true
		await pg.sql`UPDATE app_state SET is_playing = true WHERE id = 1`
	}

	async function handlePause() {
		console.log('handlePause')
		isPlaying = false
		await pg.sql`UPDATE app_state SET is_playing = false WHERE id = 1`
	}

	/** @param {any} event */
	function handleError(event) {
		const code = event.target.error.code
		const msg = `youtube_error_${code}`
		console.warn(msg)
		next(track, activeQueue, msg)
	}

	function handleEndTrack() {
		next(track, activeQueue, 'track_completed')
	}

	function togglePlayerMode() {
		expanded = !expanded
		toggleVideo(appState)
	}

	function applyInitialVolume() {
		if (savedVolume !== undefined && savedMuted !== undefined && !hasAppliedInitialValues) {
			hasAppliedInitialValues = true
			yt.volume = savedVolume
			yt.muted = savedMuted
			// console.log('applied initial volume', savedVolume, savedMuted)
		}
	}

	function handleVolumeChange(e) {
		// Ignore events until we've applied initial values
		if (!hasAppliedInitialValues) return
		const {volume, muted} = e.target
		const different = volume !== savedVolume || muted !== savedMuted
		if (!different) return
		console.log('user changed volume to', volume, muted)
		pg.sql`update app_state set muted = ${muted}, volume = ${volume} where id = 1`.then(() => {
			log.log({volume, muted})
		})
	}

	// Pre-buffer video if it's in cued state for smooth playback
	async function prebuffer() {
		await tick()
		const playerState = yt?.api?.getPlayerState?.()
		if (playerState === 5 && !didPlay) {
			console.log('prebuffering')
			play(yt)
			setTimeout(() => {
				pause(yt)
				isPlaying = false
				console.log('prebuffering complete')
			}, 200)
		}
	}
</script>

<div class={['player', expanded ? 'expanded' : 'compact']}>
	{@render channelHeader()}

	{#if !channel}
		<p style="margin-left: 0.5rem">Find some sweet music</p>
	{/if}

	{#if channel}
		{@render trackContent()}
	{/if}

	<media-controller id="r5" data-clickable="true">
		<youtube-video
			slot="media"
			bind:this={yt}
			src={track?.url}
			{autoplay}
			playsinline={1}
			onloadcomplete={() => {
				applyInitialVolume()
				prebuffer()
			}}
			onvolumechange={handleVolumeChange}
			onplay={handlePlay}
			onpause={handlePause}
			onended={handleEndTrack}
			onerror={handleError}
		></youtube-video>
		<media-loading-indicator slot="centered-chrome"></media-loading-indicator>
	</media-controller>

	<menu>
		<media-control-bar mediacontroller="r5">
			{@render btnShuffle()}
			{@render btnPrev()}
			<!-- <media-play-button class="btn"></media-play-button> -->
			{@render btnPlay()}
			{@render btnNext()}
			<media-mute-button class="btn"></media-mute-button>
			<!-- <media-volume-range></media-volume-range> -->
			<media-time-range></media-time-range>
			<media-time-display showduration></media-time-display>
			{@render btnToggleVideo()}
		</media-control-bar>
	</menu>

	<media-control-bar class="timebar" mediacontroller="r5">
		<media-time-range></media-time-range>
		<media-time-display showduration></media-time-display>
	</media-control-bar>
</div>

{#snippet btnPrev()}
	<button onclick={() => previous(track, activeQueue, 'user_prev')} class="prev">
		<Icon icon="previous-fill" />
	</button>
{/snippet}

{#snippet btnNext()}
	<button onclick={() => next(track, activeQueue, 'user_next')} disabled={!canPlay} class="next">
		<Icon icon="next-fill" />
	</button>
{/snippet}

{#snippet btnPlay()}
	<button onclick={() => togglePlay(yt)} disabled={!canPlay} class="play">
		<Icon icon={isPlaying ? 'pause' : 'play-fill'} />
	</button>
{/snippet}

{#snippet btnShuffle()}
	<button
		onclick={(e) => {
			e.preventDefault()
			e.stopPropagation()
			toggleShuffle(appState, trackIds)
		}}
		class={['shuffle', {active: appState.shuffle}]}
	>
		<Icon icon="shuffle" />
	</button>
{/snippet}

<!-- {#snippet btnEject()}
	<button onclick={() => eject()}>
		<Icon icon="eject" />
	</button>
{/snippet} -->

{#snippet btnToggleVideo()}
	<button onclick={() => togglePlayerMode()} title="Show/hide video" class="expand">
		<Icon icon="fullscreen" />
		<!-- <Icon icon="video" /> -->
	</button>
{/snippet}

{#snippet channelHeader()}
	{#if channel}
		<header class="channel">
			<a href={`/${channel.slug}`}>
				<ChannelAvatar id={channel.image} alt={channel.name} />
			</a>
			<h2><a href={`/${channel.slug}`}>{channel.name}</a></h2>
		</header>
	{/if}
{/snippet}

{#snippet trackContent()}
	{#if channel && track}
		<img class="artwork" src={trackImage} alt={track.title} />
		<div class="text">
			<h3>
				{#if isListeningToBroadcast}
					<span class="broadcast-indicator">🔴 LIVE</span>
				{/if}
				<a href={`/${channel.slug}/tracks/${track.id}`}>{track.title}</a>
			</h3>
			{#if track.description}<p><small>{track.description}</small></p>{/if}
		</div>
	{/if}
{/snippet}
