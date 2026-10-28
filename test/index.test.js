import { afterEach, test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mockFetch, setInputs } from './helpers.js'

// index.js runs on import, so give it inputs first
setInputs({ action: 'nope' })
const { run } = await import('../src/index.js')

afterEach(() => {
  mock.restoreAll()
  process.exitCode = 0
})

test('fails on an unknown action', () => {
  assert.equal(process.exitCode, 1)
})

for (const [action, inputs, response] of [
  ['deploy-app', { 'sevalla-token': 'tok', 'app-id': 'a1' }, { id: 'd1' }],
  ['deploy-static-site', { 'sevalla-token': 'tok', 'static-site-id': 's1' }, { id: 'd1' }],
  ['promote-app', { 'sevalla-token': 'tok', 'pipeline-id': 'p1', 'source-app-id': 's', 'target-app-ids': 't' }, []],
]) {
  test(`runs ${action}`, async () => {
    setInputs({ action, ...inputs })
    mockFetch([200, response])
    await run()
    assert.equal(process.exitCode ?? 0, 0)
  })
}

test('marks the step failed when the action throws', async () => {
  setInputs({ action: 'deploy-app' })
  await run()
  assert.equal(process.exitCode, 1)
})

test('the bundled dist/index.cjs runs', () => {
  const { stdout, status } = spawnSync(process.execPath, ['dist/index.cjs'], { env: { INPUT_ACTION: 'nope' } })
  assert.equal(status, 1)
  assert.match(stdout.toString(), /::error::Unknown action: nope/)
})
