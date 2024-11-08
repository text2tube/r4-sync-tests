<script>
	import 'media-chrome'
	import 'youtube-video-element'

	// https://www.media-chrome.org/docs/en/get-started
	// https://www.media-chrome.org/docs/en/media-elements/youtube-video

	let {url, yt = $bindable()} = $props()
</script>

<media-controller id="r5">
	<youtube-video
		playsinline
		src={url}
		bind:this={yt}
		slot="media"
		crossorigin
		muted
		onplay={() => console.log('play')}
		onpause={() => console.log('pause')}
		onended={() => console.log('ended')}
		onerror={(a) => console.log('error', a)}
	></youtube-video>
	<media-loading-indicator slot="centered-chrome" noautohide></media-loading-indicator>
	<media-control-bar>
		<!-- <media-play-button></media-play-button> -->
		<media-time-range></media-time-range>
		<media-time-display showduration remaining></media-time-display>
		<!-- <media-playback-rate-button></media-playback-rate-button> -->
		<!-- <media-fullscreen-button></media-fullscreen-button> -->
		<!-- <media-mute-button mediacontroller="r5"></media-mute-button> -->
		<!-- <media-volume-range mediacontroller="r5"></media-volume-range> -->
	</media-control-bar>
</media-controller>

<style>
	media-controller {
		width: 100%;
		border: 1px solid var(--color-border-primary);
	}
	youtube-video {
		min-width: 100px;
	}
</style>
