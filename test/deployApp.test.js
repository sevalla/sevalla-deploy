import { afterEach, test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { deployApp } from '../src/actions/deployApp.js'
import { fetchCall, mockFetch, readOutputs, setInputs } from './helpers.js'

const APP = 'fb5e5168-4281-4bec-94c5-0d1584e9e657'
const HOOK = `https://hook.sevalla.com/apps/${APP}/deploy/secret`

afterEach(() => mock.restoreAll())

test('deploys with the API and sends only the given options', async () => {
  setInputs({ 'sevalla-token': 'tok', 'app-id': APP, branch: 'main' })
  const fetch = mockFetch([200, { id: 'd1' }])
  await deployApp()
  assert.deepEqual(fetchCall(fetch, 0), {
    url: `https://api.sevalla.com/v3/applications/${APP}/deployments`,
    method: 'POST',
    headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
    body: { branch: 'main', is_restart: false },
  })
  assert.deepEqual(readOutputs(), { 'deployment-id': 'd1' })
})

test('deploys a docker image as a restart and waits for it', async () => {
  setInputs({
    'sevalla-token': 'tok',
    'app-id': APP,
    'docker-image': 'nginx:latest',
    'is-restart': 'true',
    'wait-for-finish': 'true',
  })
  const fetch = mockFetch([200, { id: 'd1' }], [200, { status: 'success' }])
  await deployApp()
  assert.deepEqual(fetchCall(fetch, 0).body, { docker_image: 'nginx:latest', is_restart: true })
  assert.equal(fetchCall(fetch, 1).url, `https://api.sevalla.com/v3/applications/${APP}/deployments/d1`)
})

test('fails when the deployment fails', async () => {
  setInputs({ 'sevalla-token': 'tok', 'app-id': APP, 'wait-for-finish': 'true' })
  mockFetch([200, { id: 'd1' }], [200, { status: 'failed' }])
  await assert.rejects(deployApp(), /ended with status: failed/)
})

test('requires a token and app-id without a deploy hook', async () => {
  setInputs({ 'app-id': APP })
  await assert.rejects(deployApp(), /requires sevalla-token and app-id, or deploy-hook-url/)
})

test('deploys with a hook without sending the token', async () => {
  setInputs({ 'sevalla-token': 'tok', 'deploy-hook-url': HOOK })
  const fetch = mockFetch([200, { deployment: { id: 'd1' } }])
  await deployApp()
  assert.deepEqual(fetchCall(fetch, 0), { url: HOOK, method: 'POST', headers: {}, body: undefined })
  assert.deepEqual(readOutputs(), { 'deployment-id': 'd1' })
})

test('waits for a hook deployment using the app ID from the hook URL', async () => {
  setInputs({ 'sevalla-token': 'tok', 'deploy-hook-url': HOOK, 'wait-for-finish': 'true' })
  const fetch = mockFetch([200, { deployment: { id: 'd1' } }], [200, { status: 'success' }])
  await deployApp()
  assert.equal(fetchCall(fetch, 1).url, `https://api.sevalla.com/v3/applications/${APP}/deployments/d1`)
})

test('refuses to wait without a token, before triggering', async () => {
  setInputs({ 'deploy-hook-url': HOOK, 'wait-for-finish': 'true' })
  const fetch = mockFetch()
  await assert.rejects(deployApp(), /wait-for-finish requires sevalla-token and app-id/)
  assert.equal(fetch.mock.callCount(), 0)
})

test('succeeds when the hook returns no deployment ID', async () => {
  setInputs({ 'deploy-hook-url': HOOK })
  mockFetch([200])
  await deployApp()
  assert.deepEqual(readOutputs(), {})
})

test('fails when asked to wait but the hook returns no deployment ID', async () => {
  setInputs({ 'sevalla-token': 'tok', 'deploy-hook-url': HOOK, 'wait-for-finish': 'true' })
  mockFetch([200])
  await assert.rejects(deployApp(), /no deployment ID was returned/)
})

test('rejects non-boolean inputs', async () => {
  setInputs({ 'sevalla-token': 'tok', 'app-id': APP, 'wait-for-finish': 'yes' })
  await assert.rejects(deployApp(), /YAML 1.2 "Core Schema"/)
})
