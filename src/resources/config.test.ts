// src/resources/config.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createRunner } from '../core/dokku.js'
import { createContext } from '../core/context.js'
import { reconcile } from '../core/reconcile.js'
import { Config } from './config.js'

describe('Config resource', () => {
  it('sets env vars and updates managed keys', async () => {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn()
      .mockResolvedValueOnce('')  // managed keys query (config:get DOKKU_COMPOSE_MANAGED_KEYS)
    runner.run = vi.fn()
    const ctx = createContext(runner)

    await reconcile(Config, ctx, 'myapp', { SECRET: 'abc', PORT: '3000' })
    const setCmds = ctx.commands.filter(c => c[0] === 'config:set')
    expect(setCmds.length).toBe(1)
    expect(setCmds[0]).toContain('SECRET=abc')
    expect(setCmds[0]).toContain('PORT=3000')
  })

  it('unsets keys removed from desired', async () => {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn()
      .mockResolvedValueOnce('OLD_KEY,KEEP_KEY')  // managed keys
      .mockResolvedValueOnce("export OLD_KEY='x'\nexport KEEP_KEY='y'\nexport DOKKU_COMPOSE_MANAGED_KEYS='OLD_KEY,KEEP_KEY'\n")
    runner.run = vi.fn()
    const ctx = createContext(runner)

    await reconcile(Config, ctx, 'myapp', { KEEP_KEY: 'y' })
    const unsetCmds = ctx.commands.filter(c => c[0] === 'config:unset')
    expect(unsetCmds.length).toBe(1)
    expect(unsetCmds[0]).toContain('OLD_KEY')
  })
})
