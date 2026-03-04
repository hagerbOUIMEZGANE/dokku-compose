import type { Resource } from '../core/reconcile.js'
import type { Change } from '../core/change.js'

type ChecksConfig = false | {
  disabled?: string[]
  skipped?: string[]
  [key: string]: string | number | boolean | string[] | undefined
}

export const Checks: Resource<ChecksConfig> = {
  key: 'checks',
  forceApply: true,
  read: async () => ({} as ChecksConfig),
  onChange: async (ctx, target, { after }: Change<ChecksConfig>) => {
    if (after === false) {
      await ctx.run('checks:disable', target)
      return
    }
    if (after.disabled && after.disabled.length > 0) {
      await ctx.run('checks:disable', target, ...after.disabled)
    }
    if (after.skipped && after.skipped.length > 0) {
      await ctx.run('checks:skip', target, ...after.skipped)
    }
    for (const [key, value] of Object.entries(after)) {
      if (key === 'disabled' || key === 'skipped') continue
      await ctx.run('checks:set', target, key, String(value))
    }
  },
}
