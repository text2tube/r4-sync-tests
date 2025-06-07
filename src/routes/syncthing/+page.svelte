<script>
	import './syncthing.js'
	import './syncthing.css'
	import './sync-backend.js'

	import Device from './device.svelte'

	let devices = $state([{id: 0}])

	function addDevice() {
		const device = {id: devices.length}
		devices.push(device)
	}
	function reset() {
		devices = []
	}
</script>

<main class="syncthing">
	<p>
		This demos a local-first sync engine scenario. Monitor your browser console, click the buttons. It has nothing to do do with the rest of the app.
	</p>

	<menu>
		<button onclick={addDevice}>Add Device</button>
		<button onclick={reset}>Reset</button>
	</menu>

	<div class="layout">
		<div class="panel">
			<div class="devices">
				{#each devices as device}
					<Device id={device.id} />
				{/each}
			</div>
		</div>
		<div class="panel">
			<sync-backend></sync-backend>
		</div>
	</div>

	<article>
		<p>
			Devices represent physical items, like a phone or a laptop. A device can have several
			(software) clients.
		</p>
		<p>Clients each get their own store.</p>
		<p>UI actions mutate the local store, and appends to the local (mutation) event log.</p>
		<p>
			The event log describes the changes in your app and data state. Events can synced to a
			backend.
		</p>
		<p>
			When you regain internet connection, any local changes are stashed, new remote events are
			pulled, and your local ones applied and pushed again.
		</p>
		<p>Live sync enables background polling of the above mentioned strategy.</p>
	</article>
</main>

<style>
	main {
		margin: 0 1rem;
	}
	.layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	article {
		margin-top: 5vh;
		color: #666;
	}
	article p {
		margin: 0;
	}
</style>
