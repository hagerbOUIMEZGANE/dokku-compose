import type { Resource } from '../core/reconcile.js'
import type { Context } from '../core/context.js'
import { parseReport } from './parsers.js'

type DockerOpts = { build?: string[]; deploy?: string[]; run?: string[] }

const PHASES = ['build', 'deploy', 'run'] as const

// These are managed by other resources (services, builder) — filter them out
function filterManagedOpts(opts: string[]): string[] {
  return opts.filter(o => !o.startsWith('--link ') && !o.startsWith('--build-arg '))
}

function parsePhaseOpts(raw: string): string[] {
  if (!raw) return []
  // Options are space-separated but may contain values with spaces (e.g. "--shm-size 256m")
  // Split on " --" boundaries, keeping the "--" prefix
  const opts = raw.match(/--\S+(?:\s+(?!--)\S+)*/g) ?? []
  return filterManagedOpts(opts)
}

function dockerOptsFromReport(report: Record<string, string>): DockerOpts {
  const result: DockerOpts = {}
  for (const phase of PHASES) {
    const opts = parsePhaseOpts(report[phase] ?? '')
    if (opts.length > 0) result[phase] = opts
  }
  return result
}

export const DockerOptions: Resource<DockerOpts> = {
  key: 'docker_options',

  async read(ctx: Context, target: string): Promise<DockerOpts> {
    const raw = await ctx.query('docker-options:report', target)
    return dockerOptsFromReport(parseReport(raw, 'docker-options'))
  },

  // No readAll — docker-options:report doesn't support bulk mode (no app arg)
  // on all Dokku installations due to basher environment issues

  async onChange(ctx: Context, target: string, { before, after }: { before: DockerOpts; after: DockerOpts }): Promise<void> {
    for (const phase of PHASES) {
      const prev = new Set(before[phase] ?? [])
      const desired = new Set(after[phase] ?? [])
      for (const opt of desired) {
        if (!prev.has(opt)) await ctx.run('docker-options:add', target, phase, opt)
      }
      for (const opt of prev) {
        if (!desired.has(opt)) await ctx.run('docker-options:remove', target, phase, opt)
      }
    }
  },
}
