<script>
	import {pg} from '$lib/db'
	import {IconSun, IconMoon} from 'obra-icons-svelte'

	let theme = $state()
	const Icon = $derived(theme === 'light' ? IconMoon : IconSun)

	// on load, set theme based on uer's preference
	$effect(() => {})

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
		theme = theme === 'light' ? 'dark' : 'light'
	}
</script>

<button onclick={toggleTheme}>
	<Icon size={20} />
</button>
