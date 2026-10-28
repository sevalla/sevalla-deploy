import * as core from '@actions/core'
import { API_URL, request, waitForDeployment } from '../sevalla.js'

// Deploy hook URLs look like https://hook.sevalla.com/apps/<app-id>/deploy/<secret>
const appIdFromHook = (url) => url.match(/\/apps\/([^/]+)\/deploy\//)?.[1]

const triggerDeployment = async (token, appId, hookUrl) => {
  if (hookUrl) {
    const data = await request(hookUrl, { method: 'POST' })
    return data?.deployment?.id
  }
  const data = await request(`${API_URL}/applications/${appId}/deployments`, {
    token,
    method: 'POST',
    body: {
      branch: core.getInput('branch') || undefined,
      docker_image: core.getInput('docker-image') || undefined,
      is_restart: core.getBooleanInput('is-restart'),
    },
  })
  return data?.id
}

export const deployApp = async () => {
  const token = core.getInput('sevalla-token')
  const hookUrl = core.getInput('deploy-hook-url')
  const waitForFinish = core.getBooleanInput('wait-for-finish')
  if (hookUrl) core.setSecret(hookUrl)
  const appId = core.getInput('app-id') || (hookUrl && appIdFromHook(hookUrl))

  if (!hookUrl && (!token || !appId))
    throw new Error('deploy-app requires sevalla-token and app-id, or deploy-hook-url')
  if (waitForFinish && (!token || !appId)) throw new Error('wait-for-finish requires sevalla-token and app-id')

  const deploymentId = await triggerDeployment(token, appId, hookUrl)
  if (!deploymentId) {
    if (waitForFinish) throw new Error('Deployment was triggered, but no deployment ID was returned to wait for')
    core.info('Deployment triggered successfully!')
    return
  }
  core.setOutput('deployment-id', deploymentId)
  core.info(`Deployment (id: ${deploymentId}) triggered successfully!`)

  if (waitForFinish) await waitForDeployment(`/applications/${appId}/deployments/${deploymentId}`, token)
}
