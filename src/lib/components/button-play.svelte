<script>
	import {playChannel} from '$lib/api'
	import Icon from '$lib/components/icon.svelte'

	/** @type {{channel: import('$lib/types').Channel}} */
	let {channel} = $props()

	let loading = $state(false)

	async function play() {
		loading = true
		await playChannel(channel)
		loading = false
	}
</script>

<button data-loading={loading} disabled={loading} onclick={play} title={`Play ${channel.name}`}>
	<Icon icon="play-fill" size={32} />
</button>
