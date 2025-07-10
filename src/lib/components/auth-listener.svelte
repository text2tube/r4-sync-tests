<script>
	import {sdk} from '@radio4000/sdk'
	import {pg} from '$lib/db'

	$effect(() => {
		sdk.supabase.auth.onAuthStateChange(change)
	})

	async function change(detail) {
		console.log(detail)
		if (detail === 'signed out') {
			try {
				await pg.sql`update app_state set channels = null where id = 1`
				console.log('okok')
			} catch (err) {
				console.error(err)
			}
		}

			/*

		this.listeners.addEventListener('auth', async ({detail}) => {
			const sameUser = (this.user && this.user.id) === (detail.user && detail.user.id)
			if (
				detail.eventType === 'INITIAL_SESSION' ||
				(detail.eventType === 'SIGNED_IN' && !sameUser) ||
				detail.eventType === 'SIGNED_OUT'
			) {
				this.user = detail.user
				this.refreshUserData()
				this.refreshUserAccount()
			} else {
				// same user, no need to update
			}

			if (detail === 'PASSWORD_RECOVERY') {
				this.passwordRecovery()
			}
		})
		this.listeners.addEventListener('user-channels', ({detail}) => {
			if (['INSERT', 'DELETE', 'UPDATE'].includes(detail.eventType)) {
				this.refreshUserData()
			}
		})
		this.listeners.addEventListener('followers', ({detail}) => {
			if (['INSERT', 'DELETE', 'UPDATE'].includes(detail.eventType)) {
				this.refreshUserData()
			}
		})
		this.listeners.addEventListener('user-account', ({detail}) => {
			if (['INSERT', 'DELETE', 'UPDATE'].includes(detail.eventType)) {
				this.refreshUserAccount(detail.new)
			}
		})

			 */
	}
</script>
