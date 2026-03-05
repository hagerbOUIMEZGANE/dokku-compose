import type { Resource } from '../core/reconcile.js'
import type { Context } from '../core/context.js'
import { parseReport } from './parsers.js'

type BuildConfig = {
  dockerfile?: string
  app_json?: string
  context?: string
  args?: Record<string, string>
}

function parseBuildArgs(dockerOptsBuild: string): Record<string, string> {
  const args: Record<string, string> = {}
  // Options are space-separated on one line: --build-arg K=V --link ... --build-arg K2=V2
  const matches = dockerOptsBuild.matchAll(/--build-arg\s+(\S+?)=(\S+)/g)
  for (const m of matches) args[m[1]] = m[2]
  return args
}

export const Builder: Resource<BuildConfig> = {
  key: 'build',

  async read(ctx: Context, target: string): Promise<BuildConfig> {
    const [builderRaw, dockerfileRaw, appJsonRaw, dockerOptsRaw] = await Promise.all([
      ctx.query('builder:report', target),
      ctx.query('builder-dockerfile:report', target),
      ctx.query('app-json:report', target),
      ctx.query('docker-options:report', target),
    ])
    const config: BuildConfig = {}
    const builderReport = parseReport(builderRaw, 'builder')
    const dockerfileReport = parseReport(dockerfileRaw, 'builder-dockerfile')
    const appJsonReport = parseReport(appJsonRaw, 'app-json')
    const dockerOptsReport = parseReport(dockerOptsRaw, 'docker-options')

    if (dockerfileReport['dockerfile-path'])
      config.dockerfile = dockerfileReport['dockerfile-path']
    if (appJsonReport['selected'])
      config.app_json = appJsonReport['selected']
    if (builderReport['build-dir'])
      config.context = builderReport['build-dir']

    const args = parseBuildArgs(dockerOptsReport['build'] ?? '')
    if (Object.keys(args).length > 0) config.args = args

    return config
  },

  // No readAll — builder-dockerfile:report and docker-options:report
  // don't support bulk mode (no app arg) on all Dokku installations

  async onChange(ctx: Context, target: string, { after }: { after: BuildConfig }): Promise<void> {
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
