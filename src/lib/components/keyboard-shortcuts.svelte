<script>
	import {initializeKeyboardShortcuts} from '$lib/keyboard'

	$effect(() => {
		const cleanup = initializeKeyboardShortcuts()
		return () => {
			cleanup()
		}
	})
</script>
