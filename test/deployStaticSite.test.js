import { afterEach, test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { deployStaticSite } from '../src/actions/deployStaticSite.js'
import { fetchCall, mockFetch, readOutputs, setInputs } from './helpers.js'

afterEach(() => mock.restoreAll())

test('deploys the default branch when none is given', async () => {
  setInputs({ 'sevalla-token': 'tok', 'static-site-id': 's1' })
  const fetch = mockFetch([201, { id: 'd1' }])
  await deployStaticSite()
  assert.equal(fetchCall(fetch, 0).url, 'https://api.sevalla.com/v3/static-sites/s1/deployments')
  assert.deepEqual(fetchCall(fetch, 0).body, {})
  assert.deepEqual(readOutputs(), { 'deployment-id': 'd1' })
})

test('deploys a branch and waits for it', async () => {
  setInputs({ 'sevalla-token': 'tok', 'static-site-id': 's1', branch: 'main', 'wait-for-finish': 'true' })
  const fetch = mockFetch([201, { id: 'd1' }], [200, { status: 'success' }])
  await deployStaticSite()
  assert.deepEqual(fetchCall(fetch, 0).body, { branch: 'main' })
  assert.equal(fetchCall(fetch, 1).url, 'https://api.sevalla.com/v3/static-sites/s1/deployments/d1')
})

test('requires a token and static-site-id', async () => {
  setInputs({ 'sevalla-token': 'tok' })
  await assert.rejects(deployStaticSite(), /Input required and not supplied: static-site-id/)
})

test('fails when the API returns no deployment ID', async () => {
  setInputs({ 'sevalla-token': 'tok', 'static-site-id': 's1' })
  mockFetch([201, {}])
  await assert.rejects(deployStaticSite(), /did not return a deployment ID/)
})
