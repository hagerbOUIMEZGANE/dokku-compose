import type { Resource } from '../core/reconcile.js'
import type { Change } from '../core/change.js'

export const Apps: Resource<boolean> = {
  key: '_app',
  read: async (ctx, target) => {
    return ctx.check('apps:exists', target)
  },
  onChange: async (ctx, target, { after }: Change<boolean>) => {
    if (after) {
      await ctx.run('apps:create', target)
    } else {
      await ctx.run('apps:destroy', target, '--force')
    }
  },
}
