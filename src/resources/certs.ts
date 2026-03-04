import type { Resource } from '../core/reconcile.js'
import type { Change } from '../core/change.js'

type SslValue = false | true | { certfile: string; keyfile: string }

export const Certs: Resource<SslValue> = {
  key: 'ssl',
  read: async (ctx, target) => {
    const raw = await ctx.query('certs:report', target, '--ssl-enabled')
    return raw.trim() === 'true'
  },
  onChange: async (ctx, target, { before, after }: Change<SslValue>) => {
    if (after === false && before) {
      await ctx.run('certs:remove', target)
    }
    if (after && typeof after === 'object') {
      await ctx.run('certs:add', target, after.certfile, after.keyfile)
    }
  },
}
