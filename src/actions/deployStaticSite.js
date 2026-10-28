import * as core from '@actions/core'
import { API_URL, request, waitForDeployment } from '../sevalla.js'

export const deployStaticSite = async () => {
  const token = core.getInput('sevalla-token', { required: true })
  const staticSiteId = core.getInput('static-site-id', { required: true })
  const waitForFinish = core.getBooleanInput('wait-for-finish')

  const data = await request(`${API_URL}/static-sites/${staticSiteId}/deployments`, {
    token,
    method: 'POST',
    body: { branch: core.getInput('branch') || undefined },
  })
  const deploymentId = data?.id
  if (!deploymentId) throw new Error('Sevalla API did not return a deployment ID')
  core.setOutput('deployment-id', deploymentId)
  core.info(`Deployment (id: ${deploymentId}) triggered successfully!`)

  if (waitForFinish) await waitForDeployment(`/static-sites/${staticSiteId}/deployments/${deploymentId}`, token)
}
