<script>
	import {pg} from '$lib/db'
	import {toggleTheme as toggleThemeApi} from '$lib/api'
	import Icon from '$lib/components/icon.svelte'

	let theme = $state()
	const icon = $derived(theme === 'light' ? 'moon' : 'sun')

	// on load, set theme based on uer's preference
	$effect(() => {
		const {matches: prefersLight} = window.matchMedia('(prefers-color-scheme: light)')
		pg.sql`select theme from app_state`
			.then((what) => {
				const initialTheme = what.rows[0]?.theme
				theme = initialTheme ?? (prefersLight ? 'light' : 'dark')
				// console.log('ThemeToggle', {initialTheme, prefersLight, theme})
			})
			.catch(console.warn)
	})

	$effect(() => {
		if (theme === 'dark') {
			document.documentElement.classList.remove('light')
			document.documentElement.classList.add('dark')
		} else {
			document.documentElement.classList.remove('dark')
			document.documentElement.classList.add('light')
		}
		pg.sql`update app_state set theme = ${theme} where id = 1`.catch(console.warn)
	})

	function toggleTheme() {
		toggleThemeApi()
	}
</script>

<button onclick={toggleTheme}>
	<Icon {icon} size={20} />
</button>
