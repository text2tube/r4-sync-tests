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
		// console.log('volume change', {volume, muted})
		pg.sql`update app_state set muted = ${muted}, volume = ${volume} where id = 1`.then(() => {
			// console.log('persisted volume + muted', volume, muted)
		})
	}
</script>

<media-controller id="r5" autohide="-1">
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
</media-controller>

<style>
	media-controller {
		/* width: 100%; */
		--media-control-height: 2rem;
		--media-background-color: none;
		--media-button-icon-width: 1.5rem;
		--media-button-padding: 0 0.5rem;
		--media-control-padding: 0.5rem;
		--media-control-background: none;
		--media-primary-color: var(--gray-12);
		--media-text-color: var(--gray-12);
		--media-icon-color: var(--gray-12);
		--media-range-track-background: hsla(0, 0%, 0%, 0.2);
		--media-range-track-background: var(--gray-11);
		/* --media-loading-indicator-icon-height: 2rem; */
	}

	youtube-video {
		display: none;
		/* min-width: 100px; */
		min-height: 0;
	}
</style>
