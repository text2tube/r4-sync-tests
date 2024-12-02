<script>
	import './syncthing.js'
	import './syncthing.css'
</script>

<p>
	This demos a local-first sync engine scenario. Monitor your browser console, click the buttons.
</p>

<sync-backend></sync-backend>
<scenario-element></scenario-element>

<article>
	<p>
		Devices represent physical items, like a phone or a laptop. A device can have several (software)
		clients.
	</p>
	<p>Clients each get their own store.</p>
	<p>UI actions mutate the local store, and appends to the local (mutation) event log.</p>
	<p>
		The event log describes the changes in your app and data state. Events can synced to a backend.
	</p>
	<p>
		When you regain internet connection, any local changes are stashed, new remote events are
		pulled, and your local ones applied and pushed again.
	</p>
	<p>Live sync enables background polling of the above mentioned strategy.</p>
</article>
