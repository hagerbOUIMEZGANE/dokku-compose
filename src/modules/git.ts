import type { Runner } from '../core/dokku.js'
import type { GitConfig } from '../core/schema.js'
import { logAction, logDone } from '../core/logger.js'

export async function ensureAppGit(
  runner: Runner,
  app: string,
  git: GitConfig
): Promise<void> {
  logAction(app, 'Ensuring git')
  await runner.run('git:initialize', app)
  if (git.deploy_branch) {
    await runner.run('git:set', app, 'deploy-branch', git.deploy_branch)
  }
  logDone()
}
