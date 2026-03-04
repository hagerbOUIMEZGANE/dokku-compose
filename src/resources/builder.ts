import type { Resource } from '../core/reconcile.js'

type BuildConfig = {
  dockerfile?: string
  app_json?: string
  context?: string
  args?: Record<string, string>
}

export const Builder: Resource<BuildConfig> = {
  key: 'build',
  forceApply: true,
  read: async () => ({} as BuildConfig),
  onChange: async (ctx, target, { after }: { after: BuildConfig }) => {
    if (after.dockerfile)
      await ctx.run('builder-dockerfile:set', target, 'dockerfile-path', after.dockerfile)
    if (after.app_json)
      await ctx.run('app-json:set', target, 'appjson-path', after.app_json)
    if (after.context)
      await ctx.run('builder:set', target, 'build-dir', after.context)
    if (after.args) {
      for (const [key, value] of Object.entries(after.args)) {
        await ctx.run('docker-options:add', target, 'build', `--build-arg ${key}=${value}`)
      }
    }
  },
}
