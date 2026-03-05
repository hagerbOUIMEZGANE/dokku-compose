import { describe, it, expect, vi } from 'vitest'
import { createRunner } from '../core/dokku.js'
import { createContext } from '../core/context.js'
import { Git } from './git.js'

describe('Git.readAll (bulk)', () => {
  function makeCtx(queryResult: string) {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue(queryResult)
    runner.run = vi.fn()
    return createContext(runner)
  }

  it('returns per-app git config from bulk report', async () => {
    const ctx = makeCtx(
      '=====> app1 git information\n' +
      '       Git deploy branch:            develop\n' +
      '=====> app2 git information\n' +
      '       Git deploy branch:            main\n'
    )
    const result = await Git.readAll!(ctx)
    expect(result.get('app1')).toEqual({ deploy_branch: 'develop' })
    expect(result.get('app2')).toEqual({ deploy_branch: 'main' })
  })

  it('returns undefined deploy_branch when not set', async () => {
    const ctx = makeCtx(
      '=====> app1 git information\n' +
      '       Git deploy branch:            \n'
    )
    const result = await Git.readAll!(ctx)
    expect(result.get('app1')).toEqual({ deploy_branch: undefined })
  })
})
