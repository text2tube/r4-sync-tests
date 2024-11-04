<script>
	/**
	 * Load the repl web component async so it doesn't slow us down.
	 * Connect our `pg` client to the element.
	 */

	import {pg} from '$lib/db'

	let el = $state()

	$effect(() => {
		import('@electric-sql/pglite-repl/webcomponent').then(() => {
			el.pg = pg
		})
	})
</script>

<pglite-repl bind:this={el}></pglite-repl>

<style>
	pglite-repl {
	}
</style>
