<script>
	import Channels from '$lib/components/channels.svelte'
	import {pg} from '$lib/db'
	import {sync} from '$lib/sync'
	import {IconCloudDownloadAlt} from 'obra-icons-svelte'

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
</script>

{#if channelCount === 0}
	<menu>
		<button onclick={pullRadios} disabled={syncing}
			><IconCloudDownloadAlt />{syncing ? 'Pulling radios...' : 'Pull radios from radio4000.com'}
		</button>
	</menu>
{/if}

<Channels />

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
