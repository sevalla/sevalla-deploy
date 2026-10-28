import * as core from '@actions/core'
import { setTimeout as sleep } from 'node:timers/promises'

export const API_URL = 'https://api.sevalla.com/v3'
const TERMINAL_STATUSES = ['success', 'failed', 'cancelled', 'skipped']

const parseJson = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export const request = async (url, { token, method = 'GET', body } = {}) => {
  const res = await fetch(url, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  const data = parseJson(await res.text())
  if (!res.ok) {
    const message = `${method} ${url} failed: ${res.status} ${data?.message ?? res.statusText}`
    throw Object.assign(new Error(message), { status: res.status })
  }
  return data
}

// Fails fast on 4xx (bad token or ID), retries network errors, timeouts, 429 and 5xx.
const getStatus = async (path, token) => {
  try {
    return (await request(`${API_URL}${path}`, { token }))?.status
  } catch (err) {
    if (err.status >= 400 && err.status < 500 && err.status !== 429) throw err
    core.warning(`Could not fetch deployment status, retrying: ${err.message}`)
  }
}

export const waitForDeployment = async (
  path,
  token,
  { intervalMs = 5000, maxAttempts = 1000, okStatuses = ['success'] } = {},
) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getStatus(path, token)
    if (status) core.info(`${path}: ${status}`)
    if (okStatuses.includes(status)) return
    if (TERMINAL_STATUSES.includes(status)) throw new Error(`Deployment ${path} ended with status: ${status}`)
    await sleep(intervalMs)
  }
  throw new Error(`Deployment ${path} did not finish after ${maxAttempts} status checks`)
}
