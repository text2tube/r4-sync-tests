<script>
	/** @typedef {import('$lib/types').AppState} AppState */

	/** @type {{appState: AppState}} */
	let {appState} = $props()
</script>

<div class="normal">
<p>Normal state</p>
</div>
<div class="expanded">
<p>Expanded state</p>
</div>

<style>
	:global(footer.expanded) .normal {
		display: none;
	}
	:global(footer:not(.expanded)) .expanded {
		display: none;
	}
</style>
