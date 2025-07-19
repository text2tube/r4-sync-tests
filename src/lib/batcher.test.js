import {test, expect} from 'vitest'
import {batcher} from './batcher.js'

test('basic batching with default options', async () => {
	const items = [1, 2, 3, 4, 5]
	const results = await batcher(items, (x) => Promise.resolve(x * 2))
	expect(results).toEqual([
		{status: 'fulfilled', value: 2},
		{status: 'fulfilled', value: 4},
		{status: 'fulfilled', value: 6},
		{status: 'fulfilled', value: 8},
		{status: 'fulfilled', value: 10}
	])
})

test('custom batch size', async () => {
	const items = [1, 2, 3, 4, 5]
	const fn = (x) => Promise.resolve(x * 2)
	const results = await batcher(items, fn, {size: 2})
	expect(results).toEqual([
		{status: 'fulfilled', value: 2},
		{status: 'fulfilled', value: 4},
		{status: 'fulfilled', value: 6},
		{status: 'fulfilled', value: 8},
		{status: 'fulfilled', value: 10}
	])
})

test('unbounded concurrency', async () => {
	const items = [1, 2, 3]
	const results = await batcher(items, (x) => Promise.resolve(x * 2), {concurrency: 'unbounded'})
	expect(results).toEqual([
		{status: 'fulfilled', value: 2},
		{status: 'fulfilled', value: 4},
		{status: 'fulfilled', value: 6}
	])
})

test('limited concurrency', async () => {
	const items = [1, 2, 3, 4, 5]
	const results = await batcher(items, (x) => Promise.resolve(x * 2), {concurrency: 2})
	expect(results).toEqual([
		{status: 'fulfilled', value: 2},
		{status: 'fulfilled', value: 4},
		{status: 'fulfilled', value: 6},
		{status: 'fulfilled', value: 8},
		{status: 'fulfilled', value: 10}
	])
})

test('error handling with unbounded concurrency', async () => {
	const items = [1, 2, 3]
	const fn = (x) => (x === 2 ? Promise.reject(new Error('fail')) : Promise.resolve(x * 2))

	const results = await batcher(items, fn, {concurrency: 'unbounded'})
	expect(results[0]).toEqual({status: 'fulfilled', value: 2})
	expect(results[1].status).toBe('rejected')
	expect(results[2]).toEqual({status: 'fulfilled', value: 6})
})

test('sequential processing with error', async () => {
	const items = [1, 2, 3]
	const fn = (x) => (x === 2 ? Promise.reject(new Error('fail')) : Promise.resolve(x * 2))

	const results = await batcher(items, fn, {concurrency: 1})
	expect(results).toEqual([
		{status: 'fulfilled', value: 2},
		{status: 'rejected', reason: expect.any(Error)},
		{status: 'fulfilled', value: 6}
	])
})

test('empty items array', async () => {
	const results = await batcher([], (x) => Promise.resolve(x))
	expect(results).toEqual([])
})

test('batch size larger than item count', async () => {
	const items = [1, 2, 3]
	const results = await batcher(items, (x) => Promise.resolve(x * 2), {size: 100})
	expect(results).toEqual([
		{status: 'fulfilled', value: 2},
		{status: 'fulfilled', value: 4},
		{status: 'fulfilled', value: 6}
	])
})

test('concurrency equals batch size', async () => {
	const items = [1, 2, 3]
	const results = await batcher(items, (x) => Promise.resolve(x * 2), {size: 3, concurrency: 3})
	expect(results).toEqual([
		{status: 'fulfilled', value: 2},
		{status: 'fulfilled', value: 4},
		{status: 'fulfilled', value: 6}
	])
})
