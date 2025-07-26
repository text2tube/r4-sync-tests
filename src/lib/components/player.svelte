<script>
	import 'media-chrome'
	import 'youtube-video-element'
	import {subscribeToAppState, queryTrackWithChannel} from '$lib/api'
	import {pg} from '$lib/db'
	import {logger} from '$lib/logger'

	import {
		togglePlay,
		next,
		previous,
		toggleShuffle,
		toggleVideo,
		eject,
		play
	} from '$lib/api/player'
	import {extractYouTubeId} from '$lib/utils'
	import ChannelAvatar from './channel-avatar.svelte'
	import Icon from '$lib/components/icon.svelte'

	const log = logger.ns('youtube_player').seal()

	/** @typedef {import('$lib/types').AppState} AppState */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').Channel} Channel */

	/** @type {{appState: AppState, expanded: boolean}} */
	let {appState, expanded = $bindable()} = $props()

	let yt = $state()

	/** @type {Track|undefined} */
	let track = $state()

	/** @type {Channel|undefined} */
	let channel = $state()

	// Volume persistence
	let savedVolume = $state()
	let savedMuted = $state()
	let hasAppliedInitialValues = $state(false)

	// Reactive playing state that updates when YouTube events fire
	let isPlaying = $state(false)

	/** @type {string[]} */
	let trackIds = $derived(appState.playlist_tracks || [])

	/** @type {string[]} */
	let activeQueue = $derived(appState.shuffle ? appState.playlist_tracks_shuffled || [] : trackIds)

	/** @type {boolean} */
	let canPlay = $derived(Boolean(channel && track))

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
			const wasPlaying = track && yt && !yt.paused
			await setChannelFromTrack(tid)
			// Only auto-play if we were already playing when track changed
			if (wasPlaying && yt) {
				play(yt)
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
			console.log('applied initial values', savedVolume, savedMuted)
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
</script>

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
	<button onclick={() => togglePlay(yt)} disabled={!canPlay}>
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

{#snippet btnEject()}
	<button onclick={() => eject()}>
		<Icon icon="eject" />
	</button>
{/snippet}

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
				<a href={`/${channel.slug}/tracks/${track.id}`}>{track.title}</a>
			</h3>
			{#if track.description}<p><small>{track.description}</small></p>{/if}
		</div>
	{/if}
{/snippet}

<div class={['player', expanded ? 'expanded' : 'compact']}>
	{@render channelHeader()}

	{#if !channel}
		<p style="margin-left: 0.5rem">Find some sweet music</p>
	{/if}

	{#if channel}
		{@render trackContent()}
	{/if}

	<media-controller id="r5">
		<youtube-video
			bind:this={yt}
			src={track?.url}
			autoplay={false}
			playsinline={1}
			onloadcomplete={applyInitialVolume}
			onvolumechange={handleVolumeChange}
			onplay={() => {
				isPlaying = true
				pg.sql`UPDATE app_state SET is_playing = true WHERE id = 1`
			}}
			onpause={() => {
				isPlaying = false
				pg.sql`UPDATE app_state SET is_playing = false WHERE id = 1`
			}}
			onended={handleEndTrack}
			onerror={handleError}
		/>
		<media-control-bar>
			<media-time-range></media-time-range>
			<media-time-display showduration></media-time-display>
			<!-- <media-playback-rate-button></media-playback-rate-button> -->
			<!-- <media-mute-button></media-mute-button> -->
			<!-- <media-volume-range></media-volume-range> -->
			<media-loading-indicator slot="centered-chrome"></media-loading-indicator>
		</media-control-bar>
	</media-controller>

	<menu>
		{@render btnShuffle()}
		{@render btnPrev()}
		{@render btnPlay()}
		{@render btnNext()}
		{@render btnToggleVideo()}
	</menu>
</div>
