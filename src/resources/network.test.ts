import { describe, it, expect, vi } from 'vitest'
import { createRunner } from '../core/dokku.js'
import { createContext } from '../core/context.js'
import { Networks } from './network.js'

describe('Networks.readAll (bulk)', () => {
  function makeCtx(queryResult: string) {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue(queryResult)
    runner.run = vi.fn()
    return createContext(runner)
  }

  it('returns per-app network arrays from bulk report', async () => {
    const ctx = makeCtx(
      '=====> app1 network information\n' +
      '       Network attach post deploy:   my-net\n' +
      '=====> app2 network information\n' +
      '       Network attach post deploy:   net-a net-b\n'
    )
    const result = await Networks.readAll!(ctx)
    expect(result.get('app1')).toEqual(['my-net'])
    expect(result.get('app2')).toEqual(['net-a', 'net-b'])
  })

  it('returns empty array for apps with no networks', async () => {
    const ctx = makeCtx(
      '=====> app1 network information\n' +
      '       Network attach post deploy:   \n'
    )
    const result = await Networks.readAll!(ctx)
    expect(result.get('app1')).toEqual([])
  })
})
