<script>
	import {checkUser} from '$lib/api'
	import {sdk} from '@radio4000/sdk'

	const captchaKey = 'b0a493f2-49df-486b-bdee-b8459f7b1c21'

	let user = $state()
	let loading = $state(true)

	$effect(() => {
		checkUser().then((u) => {
			user = u
			loading = false
		})
	})

	async function signIn(event) {
		user = event.detail.data.user
		await checkUser()
	}

	async function signOut() {
		await sdk.auth.signOut()
	}
</script>

{#if loading}
	<p>&nbsp;</p>
{:else if user}
	<r4-sign-out onsubmit={signOut}></r4-sign-out>
{:else}
	<r4-sign-in onsubmit={signIn} hcaptcha-site-key={captchaKey}></r4-sign-in>
{/if}

<style>
	:global(fieldset) {
		border: 0;
		padding: 0;
		margin-bottom: 0.75rem;
	}
	:global input[name='token'] {
		display: none;
	}
	:global input {
		/* width: 100%; */
	}
</style>
