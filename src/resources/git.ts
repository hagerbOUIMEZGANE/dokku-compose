import type { Resource } from '../core/reconcile.js'

type GitConfig = { deploy_branch?: string }

export const Git: Resource<GitConfig> = {
  key: 'git',
  read: async (ctx, target) => {
    const report = await ctx.query('git:report', target, '--git-deploy-branch')
    return { deploy_branch: report.trim() || undefined }
  },
  onChange: async (ctx, target, { after }: { after: GitConfig }) => {
    if (after.deploy_branch) {
      await ctx.run('git:set', target, 'deploy-branch', after.deploy_branch)
    }
  },
}
