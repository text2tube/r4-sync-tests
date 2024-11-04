<script>
	import Channels from '$lib/components/channels.svelte'

	let {data} = $props()

	$inspect(data)
</script>

<Channels />
