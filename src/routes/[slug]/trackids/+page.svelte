<script>
	let {data} = $props()

	$inspect(data)
</script>

<svelte:head>
	<title>{data.channel.name} - Track URLs</title>
</svelte:head>

<pre>{data.trackUrls.join('\n')}</pre>
