import gsap from 'gsap'
import {uuid} from '$lib/utils'

export function createEventFromMutation(mutation) {
	return {
		id: uuid(),
		name: mutation.name,
		args: mutation.args,
		sql: mutation.sql,
		metadata: {
			parentId: null,
			timestamp: new Date().getTime()
		}
	}
}
function defineMutation(name, schema, sql, options = {localOnly: false}) {
	console.log('defined mutation')
	const mutation = {name, schema, sql, options}
	return mutation //MutationDef<TName, TFrom, TTo>
}

export const createTrack = defineMutation(
	'addTrack',
	{schema: '@todo'}, //Schema.Struct({id: Schema.String, title: Schema.String}),
	`INSERT INTO tracks (id, title) values ($id, $title)`
)

class ExperimentalUnusedStore {
	constructor() {
		this.mutations = {}
		this.events = []
		console.log('store construct', this.events)
	}

	mutate(mutation) {
		// Add entry to the history
		const event = createEventFromMutation(mutation)
		this.events.push(event)
		console.log('store mutate', this.events, {mutation, event})
		// Actually run it, for now we fake it
		// db.sql.query(mutation.sql, mutation.args)
		// this.items.push(mutation.args)
	}
}

export function visualizeChange(fromEl, toEl, delay = 0) {
	// Create the floating element
	const floater = document.createElement('div')
	floater.style.cssText = `
    position: fixed;
    width: 12px;
    height: 12px;
    background: #4CAF50;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
  `

	// Get positions
	const fromRect = fromEl.getBoundingClientRect()
	const toRect = toEl.getBoundingClientRect()

	// Start position at fromEl
	// const start = {x: fromRect.left, y: fromRect.top}
	floater.style.left = `${fromRect.left}px`
	floater.style.top = `${fromRect.top}px`
	const end = {x: toRect.left - fromRect.left, y: toRect.top - fromRect.top}

	document.body.appendChild(floater)

	console.log('ran', floater)

	gsap
		.timeline()
		// Scale up with bounce
		.fromTo(
			floater,
			{
				autoAlpha: 0,
				scale: 0
			},
			{
				delay,
				scale: 1,
				autoAlpha: 1,
				duration: 0.5,
				ease: 'bounce.out'
			}
		)
		// Fly to target
		.to(floater, {
			x: end.x,
			y: end.y,
			duration: 1,
			ease: 'power3.inOut'
		})
		// Wait and remove
		.to(
			floater,
			{
				scale: 0,
				duration: 0.5,
				ease: 'ease.in',
				onComplete: () => {
					document.body.removeChild(floater)
				}
			},
			'-=0.25'
		)
}
