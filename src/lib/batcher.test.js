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

test('batch API pattern - processing arrays of items', async () => {
	// Simulate YouTube API pattern: send arrays of IDs, get arrays of results
	const items = ['id1', 'id2', 'id3', 'id4', 'id5']

	// Create batches of items
	const batches = []
	for (let i = 0; i < items.length; i += 2) {
		batches.push(items.slice(i, i + 2))
	}

	// Mock API that takes array of IDs and returns array of results
	const mockAPI = async (batch) => {
		return batch.map((id) => ({id, data: `processed-${id}`}))
	}

	const results = await batcher(batches, mockAPI, {size: 1, concurrency: 2})

	// Each result contains an array
	expect(results).toEqual([
		{
			status: 'fulfilled',
			value: [
				{id: 'id1', data: 'processed-id1'},
				{id: 'id2', data: 'processed-id2'}
			]
		},
		{
			status: 'fulfilled',
			value: [
				{id: 'id3', data: 'processed-id3'},
				{id: 'id4', data: 'processed-id4'}
			]
		},
		{status: 'fulfilled', value: [{id: 'id5', data: 'processed-id5'}]}
	])

	// Verify flattening works as expected
	const flattened = results
		.filter((result) => result.status === 'fulfilled')
		.flatMap((result) => result.value)

	expect(flattened).toEqual([
		{id: 'id1', data: 'processed-id1'},
		{id: 'id2', data: 'processed-id2'},
		{id: 'id3', data: 'processed-id3'},
		{id: 'id4', data: 'processed-id4'},
		{id: 'id5', data: 'processed-id5'}
	])
})

test('batch API pattern with errors', async () => {
	const batches = [['id1', 'id2'], ['bad-batch'], ['id3']]

	const mockAPI = async (batch) => {
		if (batch.includes('bad-batch')) {
			throw new Error('API error')
		}
		return batch.map((id) => ({id, data: `processed-${id}`}))
	}

	const results = await batcher(batches, mockAPI, {size: 1})

	expect(results[0]).toEqual({
		status: 'fulfilled',
		value: [
			{id: 'id1', data: 'processed-id1'},
			{id: 'id2', data: 'processed-id2'}
		]
	})
	expect(results[1].status).toBe('rejected')
	expect(results[2]).toEqual({
		status: 'fulfilled',
		value: [{id: 'id3', data: 'processed-id3'}]
	})
})
