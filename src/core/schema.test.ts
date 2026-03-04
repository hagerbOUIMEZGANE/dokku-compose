import { describe, it, expect } from 'vitest'
import { parseConfig } from './schema.js'

describe('git config in schema', () => {
  it('accepts global git.deploy_branch', () => {
    const result = parseConfig({
      apps: {},
      git: { deploy_branch: 'main' },
    })
    expect(result.git?.deploy_branch).toBe('main')
  })

  it('accepts per-app git.deploy_branch', () => {
    const result = parseConfig({
      apps: { myapp: { git: { deploy_branch: 'develop' } } },
    })
    expect(result.apps.myapp.git?.deploy_branch).toBe('develop')
  })
})

describe('ServiceSchema backup', () => {
  it('accepts a service with backup config', () => {
    const result = parseConfig({
      apps: {},
      services: {
        'funqtion-db': {
          plugin: 'postgres',
          backup: {
            schedule: '0 * * * *',
            bucket: 'db-backups/funqtion-db',
            auth: {
              access_key_id: 'KEY',
              secret_access_key: 'SECRET',
              region: 'auto',
              signature_version: 's3v4',
              endpoint: 'https://r2.example.com',
            },
          },
        },
      },
    })
    expect(result.services?.['funqtion-db']?.backup?.schedule).toBe('0 * * * *')
  })

  it('accepts a service without backup config', () => {
    const result = parseConfig({
      apps: {},
      services: { 'funqtion-redis': { plugin: 'redis' } },
    })
    expect(result.services?.['funqtion-redis']?.backup).toBeUndefined()
  })
})

describe('parseConfig', () => {
  it('parses minimal config', () => {
    const result = parseConfig({
      apps: { myapp: { ports: ['http:80:3000'] } }
    })
    expect(result.apps['myapp'].ports).toEqual(['http:80:3000'])
  })

  it('rejects invalid port format', () => {
    expect(() => parseConfig({
      apps: { myapp: { ports: ['80:3000'] } }
    })).toThrow()
  })

  it('allows env: false', () => {
    const result = parseConfig({ apps: { myapp: { env: false } } })
    expect(result.apps['myapp'].env).toBe(false)
  })
})
