/** @type {import('./$types').PageLoad} */
export async function load({params, url}) {
	const {slug} = params
	const search = url.searchParams.get('search') || ''
	const order = url.searchParams.get('order') || 'created'
	
	return {
		slug,
		search,
		order
	}
}