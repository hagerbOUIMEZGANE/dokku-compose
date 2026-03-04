import type { Resource } from '../core/reconcile.js'
import type { Change } from '../core/change.js'

export const Proxy: Resource<boolean> = {
  key: 'proxy',
  read: async (ctx, target) => {
    const raw = await ctx.query('proxy:report', target, '--proxy-enabled')
    return raw.trim() === 'true'
  },
  onChange: async (ctx, target, { after }: Change<boolean>) => {
    await ctx.run(after ? 'proxy:enable' : 'proxy:disable', target)
  },
}
