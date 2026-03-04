import { describe, it, expect, vi } from 'vitest'
import { createRunner } from './dokku.js'
import { createContext } from './context.js'

describe('createContext', () => {
  it('caches repeated query calls with same args', async () => {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue('some output')
    const ctx = createContext(runner)

    const result1 = await ctx.query('nginx:report', 'myapp')
    const result2 = await ctx.query('nginx:report', 'myapp')

    expect(result1).toBe('some output')
    expect(result2).toBe('some output')
    expect(runner.query).toHaveBeenCalledTimes(1)
  })

  it('does not cache different query args', async () => {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn()
      .mockResolvedValueOnce('app1 output')
      .mockResolvedValueOnce('app2 output')
    const ctx = createContext(runner)

    const r1 = await ctx.query('nginx:report', 'app1')
    const r2 = await ctx.query('nginx:report', 'app2')

    expect(r1).toBe('app1 output')
    expect(r2).toBe('app2 output')
    expect(runner.query).toHaveBeenCalledTimes(2)
  })

  it('records commands via run() always', async () => {
    const runner = createRunner({ dryRun: false })
    runner.run = vi.fn()
    const ctx = createContext(runner)

    await ctx.run('nginx:set', 'myapp', 'client-max-body-size', '50m')
    await ctx.run('proxy:build-config', 'myapp')

    expect(ctx.commands).toEqual([
      ['nginx:set', 'myapp', 'client-max-body-size', '50m'],
      ['proxy:build-config', 'myapp'],
    ])
    expect(runner.run).toHaveBeenCalledTimes(2)
  })

  it('records but does not execute in dry-run mode', async () => {
    const runner = createRunner({ dryRun: true })
    runner.run = vi.fn()
    const ctx = createContext(runner)

    await ctx.run('apps:create', 'myapp')

    expect(ctx.commands).toEqual([['apps:create', 'myapp']])
    // runner.run is called but runner itself handles dry-run no-op
    expect(runner.run).toHaveBeenCalledTimes(1)
  })

  it('delegates check() to runner without caching', async () => {
    const runner = createRunner({ dryRun: false })
    runner.check = vi.fn().mockResolvedValue(true)
    const ctx = createContext(runner)

    const result = await ctx.check('apps:exists', 'myapp')

    expect(result).toBe(true)
    expect(runner.check).toHaveBeenCalledWith('apps:exists', 'myapp')
  })
})
