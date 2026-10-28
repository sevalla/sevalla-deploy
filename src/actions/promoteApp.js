import * as core from '@actions/core'
import { API_URL, request, waitForDeployment } from '../sevalla.js'

export const promoteApp = async () => {
  const token = core.getInput('sevalla-token', { required: true })
  const pipelineId = core.getInput('pipeline-id', { required: true })
  const sourceAppId = core.getInput('source-app-id', { required: true })
  const targetAppIds = core
    .getInput('target-app-ids', { required: true })
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const waitForFinish = core.getBooleanInput('wait-for-finish')

  const data = await request(`${API_URL}/pipelines/${pipelineId}/promote`, {
    token,
    method: 'POST',
    body: { source_app_id: sourceAppId, target_app_ids: targetAppIds },
  })
  const promotions = Array.isArray(data) ? data : []
  const deploymentIds = promotions.map((p) => p.deployment_id)
  core.setOutput('deployment-ids', deploymentIds)
  core.info(`Promotion triggered successfully! Deployment ids: ${deploymentIds.join(', ')}`)

  if (!waitForFinish) return
  // Wait for every target so one failure doesn't hide the others
  const results = await Promise.allSettled(
    promotions.map((p) => waitForDeployment(`/applications/${p.target_app_id}/deployments/${p.deployment_id}`, token)),
  )
  const errors = results.filter((r) => r.status === 'rejected').map((r) => r.reason.message)
  if (errors.length) throw new Error(errors.join('\n'))
}
