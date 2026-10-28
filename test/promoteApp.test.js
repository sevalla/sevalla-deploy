import { afterEach, test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { promoteApp } from '../src/actions/promoteApp.js'
import { fetchCall, mockFetch, readOutputs, setInputs } from './helpers.js'

const inputs = {
  'sevalla-token': 'tok',
  'pipeline-id': 'p1',
  'source-app-id': 'src',
  'target-app-ids': ' a1, a2 ,',
}
const promotions = [
  { target_app_id: 'a1', deployment_id: 'd1' },
  { target_app_id: 'a2', deployment_id: 'd2' },
]

afterEach(() => mock.restoreAll())

test('promotes to every target app', async () => {
  setInputs(inputs)
  const fetch = mockFetch([200, promotions])
  await promoteApp()
  assert.equal(fetchCall(fetch, 0).url, 'https://api.sevalla.com/v3/pipelines/p1/promote')
  assert.deepEqual(fetchCall(fetch, 0).body, { source_app_id: 'src', target_app_ids: ['a1', 'a2'] })
  assert.deepEqual(readOutputs(), { 'deployment-ids': '["d1","d2"]' })
})

test('waits for every target deployment', async () => {
  setInputs({ ...inputs, 'wait-for-finish': 'true' })
  const fetch = mockFetch([200, promotions], [200, { status: 'success' }], [200, { status: 'success' }])
  await promoteApp()
  const urls = [1, 2].map((i) => fetchCall(fetch, i).url).sort()
  assert.deepEqual(urls, [
    'https://api.sevalla.com/v3/applications/a1/deployments/d1',
    'https://api.sevalla.com/v3/applications/a2/deployments/d2',
  ])
})

test('reports every failed target', async () => {
  setInputs({ ...inputs, 'wait-for-finish': 'true' })
  mockFetch([200, promotions], [200, { status: 'failed' }], [200, { status: 'cancelled' }])
  await assert.rejects(promoteApp(), {
    message:
      'Deployment /applications/a1/deployments/d1 ended with status: failed\n' +
      'Deployment /applications/a2/deployments/d2 ended with status: cancelled',
  })
})

test('handles an unexpected response shape', async () => {
  setInputs(inputs)
  mockFetch([200, {}])
  await promoteApp()
  assert.deepEqual(readOutputs(), { 'deployment-ids': '[]' })
})

test('requires pipeline-id', async () => {
  setInputs({ ...inputs, 'pipeline-id': '' })
  await assert.rejects(promoteApp(), /Input required and not supplied: pipeline-id/)
})
