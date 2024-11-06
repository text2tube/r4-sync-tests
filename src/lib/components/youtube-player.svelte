<script>
	import 'media-chrome'
	import 'youtube-video-element'

	// https://www.media-chrome.org/docs/en/get-started
	// https://www.media-chrome.org/docs/en/media-elements/youtube-video

	let {url} = $props()
</script>

<media-controller>
	<youtube-video src={url} slot="media" crossorigin muted></youtube-video>
	<media-loading-indicator slot="centered-chrome" noautohide></media-loading-indicator>
	<media-control-bar>
		<media-play-button></media-play-button>
		<media-time-range></media-time-range>
		<media-time-display showduration remaining></media-time-display>
		<media-playback-rate-button></media-playback-rate-button>
		<media-fullscreen-button></media-fullscreen-button>
		<media-mute-button></media-mute-button>
		<media-volume-range></media-volume-range>
	</media-control-bar>
</media-controller>

<style>
	media-controller {
	}
</style>
