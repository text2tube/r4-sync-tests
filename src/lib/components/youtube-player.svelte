<script>
	import 'media-chrome'
	import 'youtube-video-element'
	// import '$lib/youtube-video-element-custom.js'
	import {pg} from '$lib/db'

	// https://www.media-chrome.org/docs/en/get-started
	// https://www.media-chrome.org/docs/en/media-elements/youtube-video

	let {autoplay = false, url, yt = $bindable(), onerror, onended} = $props()

	function check(e) {
		const {volume, muted} = e.target
		console.log('volume change', {volume, muted})
		pg.sql`update app_state set muted = ${muted}, volume = ${volume} where id = 1`.then(() => {
			console.log('persisted volume + muted', volume, muted)
		})
	}
</script>

<media-controller id="r5">
	<youtube-video
		src={url}
		bind:this={yt}
		slot="media"
		crossorigin
		muted
		{autoplay}
		playsinline={1}
		onplay={() => console.log('play')}
		onpause={() => console.log('pause')}
		{onended}
		{onerror}
		onvolumechange={check}
	></youtube-video>
	<media-loading-indicator slot="centered-chrome" noautohide></media-loading-indicator>
	<media-control-bar>
		<!-- <media-play-button></media-play-button> -->
		<media-time-range></media-time-range>
		<media-time-display showduration remaining></media-time-display>
		<!-- <media-playback-rate-button></media-playback-rate-button> -->
		<!-- <media-fullscreen-button></media-fullscreen-button> -->
		<media-mute-button mediacontroller="r5"></media-mute-button>
		<media-volume-range mediacontroller="r5"></media-volume-range>
	</media-control-bar>
</media-controller>

<style>
	media-controller {
		/* width: 100%; */
		--media-control-height: 2rem;
		--media-background-color: none;
		--media-button-icon-width: 1.5rem;
		--media-button-padding: 0 0.5rem;
		/* --media-loading-indicator-icon-height: 2rem; */
	}
	media-mute-button {
		border: 1px solid var(--color-border-tertiary);
		border-radius: var(--border-radius);
	}
	youtube-video {
		min-width: 100px;
		min-height: 0;
	}
</style>
