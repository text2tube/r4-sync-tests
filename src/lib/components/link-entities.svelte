<script>
	const {track, text} = $props()

	const linked = $derived(
		text.replace(/(^|\s)([#@][a-z\d-]+)/gi, (match, prefix, entity) => {
			const url = entity.startsWith('@')
				? `/search?search=@${entity.substring(1)}`
				: `/search?search=@${track.channel_slug} ${entity}`
			return `${prefix}<a href="${url}">${entity}</a>`
		})
	)
</script>

{@html linked}
