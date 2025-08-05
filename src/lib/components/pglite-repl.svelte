<script>
	/**
	 * Load the repl web component async so it doesn't slow us down.
	 * Connect our `pg` client to the element.
	 */

	import {pg} from '$lib/db'

	let el = $state()
	let enabled = $state(false)

	function enable() {
		enabled = true
		import('@electric-sql/pglite-repl/webcomponent').then(() => {
			el.pg = pg
		})
	}
</script>

{#if enabled}
	<p>Try querying channels, tracks or app_state using SQL.</p>
	<pglite-repl bind:this={el}></pglite-repl>
{:else}
	<button onclick={enable}>Enter PGlite REPL</button>
{/if}

<style>
</style>
