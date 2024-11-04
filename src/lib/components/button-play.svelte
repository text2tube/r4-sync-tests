<script>
	import {playChannel} from '$lib/api'
	import {IconPlayFill} from 'obra-icons-svelte'

	/** @type {{channel: import('$lib/types').Channel}} */
	let {channel} = $props()

	let loading = $state(false)

	async function play() {
		loading = true
		await playChannel(channel)
		loading = false
	}
</script>

<button
	class="IconBtn"
	data-loading={loading}
	disabled={loading}
	onclick={play}
	title={`Play ${channel.name}`}
>
	<IconPlayFill size={32} />
</button>
