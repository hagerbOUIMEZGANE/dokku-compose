// src/resources/toggle.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createRunner } from '../core/dokku.js'
import { createContext } from '../core/context.js'
import { reconcile } from '../core/reconcile.js'
import { Proxy } from './toggle.js'

describe('Proxy resource', () => {
  function makeCtx(queryResult: string) {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue(queryResult)
    runner.run = vi.fn()
    return createContext(runner)
  }

  it('enables proxy when currently disabled', async () => {
    const ctx = makeCtx('false')
    await reconcile(Proxy, ctx, 'myapp', true)
    expect(ctx.commands).toEqual([['proxy:enable', 'myapp']])
  })

  it('disables proxy when currently enabled', async () => {
    const ctx = makeCtx('true')
    await reconcile(Proxy, ctx, 'myapp', false)
    expect(ctx.commands).toEqual([['proxy:disable', 'myapp']])
  })

  it('skips when proxy already matches', async () => {
    const ctx = makeCtx('true')
    await reconcile(Proxy, ctx, 'myapp', true)
    expect(ctx.commands).toEqual([])
  })
})
