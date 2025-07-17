<script>
	import {page} from '$app/state'
	import {pg} from '$lib/db'
	import {sync} from '$lib/sync'
	import {IconCloudDownloadAlt} from 'obra-icons-svelte'
	import Channels from '$lib/components/channels.svelte'

	const {data} = $props()

	const slug = $derived(page?.url?.searchParams?.get('slug'))
	const display = $derived(page?.url?.searchParams?.get('display') || 'list')
	const longitude = $derived(Number(page?.url?.searchParams?.get('longitude')))
	const latitude = $derived(Number(page?.url?.searchParams?.get('latitude')))
	const zoom = $derived(Number(page?.url?.searchParams?.get('zoom')))

	let channelCount = $state(0)
	let syncing = $state(false)

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
</script>

{#if channelCount === 0}
	<menu>
		<button onclick={pullRadios} disabled={syncing}
			><IconCloudDownloadAlt />{syncing ? 'Pulling radios...' : 'Pull radios from radio4000.com'}
		</button>
	</menu>
{/if}

<Channels {slug} {display} {longitude} {latitude} {zoom} />

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
