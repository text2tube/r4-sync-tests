<script>
	import {IconWifi, IconWifiOff} from 'obra-icons-svelte'

	let online = $state(navigator.onLine)
	$effect(() => {
		window.addEventListener('offline', () => {
			online = false
		})
		window.addEventListener('online', () => {
			online = true
		})
	})
</script>

<div data-online={online}>
	{#if online}
		<!-- <IconWifi /> -->
		<!-- <p>Online</p> -->
	{:else}
		<IconWifiOff />
		<p>Offline</p>
	{/if}
</div>

<style>
	div {
		display: flex;
		gap: 0.3em;
		align-items: center;
		color: var(--color-red);
	}
	p {
		margin: 0;
	}
	div[data-online='true'] {
		color: var(--color-green);
	}
	div :global(svg) {
		position: relative;
		top: -1px;
		width: 1rem;
	}
</style>
