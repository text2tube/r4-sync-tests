<script>
	import {initializeKeyboardShortcuts} from '$lib/shortcuts'

	$effect(() => {
		const cleanup = initializeKeyboardShortcuts()
		return () => {
			cleanup()
		}
	})
</script>
