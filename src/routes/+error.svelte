<script>
	import {page} from '$app/stores'
	import {initDb} from '$lib/db'
</script>

<h1>{$page.status}: {$page.error.message}</h1>

<menu>
	<a href={window.location.href}>Reload app</a>
	<button onclick={() => initDb(true)}>Reset app (deletes all data)</button>
</menu>
