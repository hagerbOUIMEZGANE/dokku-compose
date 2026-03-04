import { describe, it, expect, vi } from 'vitest'
import { createRunner } from '../core/dokku.js'
import { ensureAppGit } from './git.js'

describe('ensureAppGit', () => {
  it('initializes git for the app', async () => {
    const runner = createRunner({ dryRun: false })
    runner.run = vi.fn()
    await ensureAppGit(runner, 'myapp', {})
    expect(runner.run).toHaveBeenCalledWith('git:initialize', 'myapp')
  })

  it('sets deploy-branch when specified', async () => {
    const runner = createRunner({ dryRun: false })
    runner.run = vi.fn()
    await ensureAppGit(runner, 'myapp', { deploy_branch: 'main' })
    expect(runner.run).toHaveBeenCalledWith('git:set', 'myapp', 'deploy-branch', 'main')
  })

  it('does not call git:set when deploy_branch not specified', async () => {
    const runner = createRunner({ dryRun: false })
    runner.run = vi.fn()
    await ensureAppGit(runner, 'myapp', {})
    const calls = (runner.run as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.every((c: string[]) => c[0] !== 'git:set')).toBe(true)
  })
})
