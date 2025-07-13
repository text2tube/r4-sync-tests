<script>
	import {page} from '$app/state'
	//import {initDb} from '$lib/db'
</script>

<p>An error happened.</p>

<h1>{$page.status}: {$page.error.message}</h1>

<menu>
	<a href={window.location.href}>Reload app</a>
	<!--<button onclick={() => initDb(true)}>Reset app (deletes all data)</button>-->
</menu>
