<script>
	import {initializeKeyboardShortcuts} from '$lib/shortcuts'

	let cleanup = () => {}

	$effect(() => {
		initializeKeyboardShortcuts().then((cleanupFn) => {
			cleanup = cleanupFn
		})

		return () => {
			cleanup()
		}
	})
</script>
