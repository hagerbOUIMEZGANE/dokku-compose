// src/resources/lifecycle.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createRunner } from '../core/dokku.js'
import { createContext } from '../core/context.js'
import { reconcile } from '../core/reconcile.js'
import { Apps } from './lifecycle.js'

describe('Apps resource', () => {
  function makeCtx(checkResult: boolean) {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue('')
    runner.run = vi.fn()
    runner.check = vi.fn().mockResolvedValue(checkResult)
    return createContext(runner)
  }

  it('creates app when it does not exist', async () => {
    const ctx = makeCtx(false)
    await reconcile(Apps, ctx, 'myapp', true)
    expect(ctx.commands).toEqual([['apps:create', 'myapp']])
  })

  it('skips when app already exists', async () => {
    const ctx = makeCtx(true)
    await reconcile(Apps, ctx, 'myapp', true)
    expect(ctx.commands).toEqual([])
  })

  it('destroys app when desired is false', async () => {
    const ctx = makeCtx(true)
    await reconcile(Apps, ctx, 'myapp', false)
    expect(ctx.commands).toEqual([['apps:destroy', 'myapp', '--force']])
  })
})
