<script>
	import { goto } from '$app/navigation'
	import {page} from '$app/state'
	import {pg} from '$lib/db'
	import {sync} from '$lib/sync'
	import {IconCloudDownloadAlt} from 'obra-icons-svelte'
	import Channels from '$lib/components/channels.svelte'

	const display = $derived(page?.url?.searchParams?.get('display') || 'list')
	const longitude = $derived(page?.url?.searchParams?.get('longitude'))
	const latitude = $derived(Number(page?.url?.searchParams?.get('latitude')))
	const zoom = $derived(Number(page?.url?.searchParams?.get('zoom')))
	console.log("route load", zoom, longitude, latitude, page?.url?.searchParams?.get('longitude'))

	let channelCount = $state(0)
	let syncing = $state(false)

	// Query channel count on load
	pg.live.query('SELECT COUNT(*) as count FROM channels', [], (result) => {
		channelCount = result.rows[0]?.count || 0
	})

	async function pullRadios() {
		syncing = true
		try {
			await sync()
		} finally {
			syncing = false
		}
	}
	function handleMapChange(event) {
		const {latitude, longitude, zoom} = event.detail
		console.log('map changed', latitude, longitude, zoom)
		if (!longitude) {
			const url = new URL(window.location.href)
			url.searchParams.set('latitude', latitude.toFixed(5))
			url.searchParams.set('longitude', longitude.toFixed(5))
			url.searchParams.set('zoom', zoom)
			goto(url, {keepData: true, replaceState: true})
		}
	}
</script>

{#if channelCount === 0}
	<menu>
		<button onclick={pullRadios} disabled={syncing}
			><IconCloudDownloadAlt />{syncing ? 'Pulling radios...' : 'Pull radios from radio4000.com'}
		</button>
	</menu>
{/if}

<Channels {display} {longitude} {latitude} {zoom} {handleMapChange} />

<style>
	menu {
		top: 0;
		z-index: 1;
		padding: 0 0.5rem;
		display: flex;
		gap: 0.5rem;
		margin: 1rem 0 0.6rem;
		> * {
			margin: 0;
		}
	}
	menu :global(svg) {
		width: 1.25em;
		margin-right: 0.2em;
	}
</style>
