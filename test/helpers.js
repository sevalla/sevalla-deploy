import { mock } from 'node:test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Defaults that action.yml would supply on a real runner
const DEFAULTS = { 'is-restart': 'false', 'wait-for-finish': 'false' }

export const setInputs = (inputs) => {
  for (const key of Object.keys(process.env)) if (key.startsWith('INPUT_')) delete process.env[key]
  for (const [name, value] of Object.entries({ ...DEFAULTS, ...inputs })) {
    process.env[`INPUT_${name.toUpperCase()}`] = value
  }
  process.env.GITHUB_OUTPUT = join(mkdtempSync(join(tmpdir(), 'sevalla-')), 'output')
  writeFileSync(process.env.GITHUB_OUTPUT, '')
}

export const readOutputs = () =>
  Object.fromEntries(
    [...readFileSync(process.env.GITHUB_OUTPUT, 'utf8').matchAll(/^(.+)<<(.+)\n([\s\S]*?)\n\2$/gm)].map((m) => [
      m[1],
      m[3],
    ]),
  )

const json = (status, body) => new Response(body === undefined ? '' : JSON.stringify(body), { status })

// Each call to fetch consumes the next response; an Error is thrown instead of returned
export const mockFetch = (...responses) =>
  mock.method(globalThis, 'fetch', async () => {
    const next = responses.shift()
    if (!next) throw new Error('Unexpected fetch call')
    if (next instanceof Error) throw next
    return json(...next)
  })

export const fetchCall = (fetchMock, i) => {
  const [url, init] = fetchMock.mock.calls[i].arguments
  return { url, method: init.method, headers: init.headers, body: init.body && JSON.parse(init.body) }
}
