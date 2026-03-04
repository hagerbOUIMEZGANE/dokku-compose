import type { Resource } from '../core/reconcile.js'

type DockerOpts = { build?: string[]; deploy?: string[]; run?: string[] }

export const DockerOptions: Resource<DockerOpts> = {
  key: 'docker_options',
  forceApply: true,
  read: async () => ({} as DockerOpts),
  onChange: async (ctx, target, { after }: { after: DockerOpts }) => {
    for (const phase of ['build', 'deploy', 'run'] as const) {
      const opts = after[phase]
      if (!opts || opts.length === 0) continue
      await ctx.run('docker-options:clear', target, phase)
      for (const opt of opts) {
        await ctx.run('docker-options:add', target, phase, opt)
      }
    }
  },
}
