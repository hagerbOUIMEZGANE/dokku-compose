import { describe, it, expect, vi } from 'vitest'
import { createRunner } from '../core/dokku.js'
import { createContext } from '../core/context.js'
import { Networks, NetworkProps } from './network.js'

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

describe('NetworkProps', () => {
  function makeCtx(queryResult: string) {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue(queryResult)
    runner.run = vi.fn()
    return createContext(runner)
  }

  const REPORT = [
    '=====> studio network information',
    '       Network attach post create:           studio-net',
    '       Network attach post deploy:',
    '       Network bind all interfaces:          false',
    '       Network initial network:',
    '       Network tld:',
  ].join('\n')

  it('reads attach-post-create from report', async () => {
    const ctx = makeCtx(REPORT)
    const config = await NetworkProps.read(ctx, 'studio')
    expect(config).toEqual({ attach_post_create: ['studio-net'] })
  })

  it('readAll parses bulk report', async () => {
    const bulk = [
      '=====> studio network information',
      '       Network attach post create:           studio-net',
      '       Network attach post deploy:',
      '       Network bind all interfaces:          false',
      '       Network initial network:',
      '       Network tld:',
      '=====> qultr network information',
      '       Network attach post create:',
      '       Network attach post deploy:           qultr-net',
      '       Network bind all interfaces:          true',
      '       Network initial network:',
      '       Network tld:                          internal',
    ].join('\n')
    const ctx = makeCtx(bulk)
    const result = await NetworkProps.readAll!(ctx)
    expect(result.get('studio')).toEqual({ attach_post_create: ['studio-net'] })
    expect(result.get('qultr')).toEqual({ bind_all_interfaces: true, tld: 'internal' })
  })

  it('returns empty config when nothing is set', async () => {
    const ctx = makeCtx(
      '=====> myapp network information\n' +
      '       Network attach post create:\n' +
      '       Network attach post deploy:\n' +
      '       Network bind all interfaces:          false\n' +
      '       Network initial network:\n' +
      '       Network tld:\n'
    )
    const config = await NetworkProps.read(ctx, 'myapp')
    expect(config).toEqual({})
  })
})
