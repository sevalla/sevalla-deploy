import { afterEach, test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { request, waitForDeployment } from '../src/sevalla.js'
import { fetchCall, mockFetch } from './helpers.js'

const fast = { intervalMs: 0 }

afterEach(() => mock.restoreAll())

test('request sends token and JSON body, and returns parsed JSON', async () => {
  const fetch = mockFetch([200, { id: 'd1' }])
  assert.deepEqual(await request('https://x/y', { token: 'tok', method: 'POST', body: { a: 1 } }), { id: 'd1' })
  assert.deepEqual(fetchCall(fetch, 0), {
    url: 'https://x/y',
    method: 'POST',
    headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
    body: { a: 1 },
  })
})

test('request without token or body sends neither', async () => {
  const fetch = mockFetch([200])
  assert.equal(await request('https://x/y'), undefined)
  assert.deepEqual(fetchCall(fetch, 0).headers, {})
})

test('request error includes the API message', async () => {
  mockFetch([404, { message: 'App not found' }])
  await assert.rejects(request('https://x/y'), { message: 'GET https://x/y failed: 404 App not found', status: 404 })
})

test('request error falls back to status text when body is not JSON', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('<html>', { status: 502, statusText: 'Bad Gateway' }))
  await assert.rejects(request('https://x/y'), { message: 'GET https://x/y failed: 502 Bad Gateway' })
})

test('waitForDeployment polls until success', async () => {
  const fetch = mockFetch([200, { status: 'waiting' }], [200, { status: 'inProgress' }], [200, { status: 'success' }])
  await waitForDeployment('/applications/a/deployments/d', 'tok', fast)
  assert.equal(fetch.mock.callCount(), 3)
  assert.equal(fetchCall(fetch, 0).url, 'https://api.sevalla.com/v3/applications/a/deployments/d')
})

for (const status of ['failed', 'cancelled', 'skipped']) {
  test(`waitForDeployment fails on ${status}`, async () => {
    mockFetch([200, { status }])
    await assert.rejects(waitForDeployment('/p', 'tok', fast), {
      message: `Deployment /p ended with status: ${status}`,
    })
  })
}

test('waitForDeployment retries network errors, 429 and 5xx', async () => {
  const fetch = mockFetch(new Error('ECONNRESET'), [429], [503], [200, { status: 'success' }])
  await waitForDeployment('/p', 'tok', fast)
  assert.equal(fetch.mock.callCount(), 4)
})

test('waitForDeployment fails fast on 4xx', async () => {
  const fetch = mockFetch([401, { message: 'Unauthorized' }])
  await assert.rejects(waitForDeployment('/p', 'tok', fast), { status: 401 })
  assert.equal(fetch.mock.callCount(), 1)
})

test('waitForDeployment gives up after maxAttempts', async () => {
  mockFetch([200, { status: 'waiting' }], [200, { status: 'waiting' }])
  await assert.rejects(waitForDeployment('/p', 'tok', { intervalMs: 0, maxAttempts: 2 }), {
    message: 'Deployment /p did not finish after 2 status checks',
  })
})
