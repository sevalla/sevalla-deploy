import * as core from '@actions/core'
import { deployApp } from './actions/deployApp.js'
import { promoteApp } from './actions/promoteApp.js'
import { deployStaticSite } from './actions/deployStaticSite.js'

export const run = async () => {
  try {
    const action = core.getInput('action', { required: true })
    const token = core.getInput('sevalla-token')
    if (token) core.setSecret(token)

    if (action === 'deploy-app') {
      await deployApp()
    } else if (action === 'promote-app') {
      await promoteApp()
    } else if (action === 'deploy-static-site') {
      await deployStaticSite()
    } else {
      throw new Error(`Unknown action: ${action}. Use deploy-app, promote-app or deploy-static-site.`)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
