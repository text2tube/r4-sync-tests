<script>
	import {page} from '$app/state'
</script>

<article>
	<p>An error happened.</p>
	<h1>{page.status}: {page.error?.message || 'Unknown error'}</h1>
	<p><a href={window.location.href}>Reload app</a></p>
	<p><a href="/settings">Go to settings to reset the application.</a></p>
</article>

<style>
	article {
		margin: 0 0.5rem;
	}
</style>
