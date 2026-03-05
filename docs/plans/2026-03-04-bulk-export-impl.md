# Bulk Export Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optimize export/diff from ~77 sequential SSH calls to ~10 parallel by using bulk Dokku `:report` commands with `readAll` on the Resource interface.

**Architecture:** Add `parseBulkReport` to split multi-app report output by app headers, add optional `readAll` to each resource that makes one bulk SSH call and returns a `Map<app, T>`, then update export.ts and diff.ts to prefetch all bulk-readable resources in parallel before the per-app loop.

**Tech Stack:** TypeScript, Vitest, Zod (unchanged)

---

### Task 1: `parseBulkReport` — tests

**Files:**
- Modify: `src/resources/parsers.test.ts`

**Step 1: Write failing tests for `parseBulkReport`**

Add to the bottom of `src/resources/parsers.test.ts`:

```ts
describe('parseBulkReport', () => {
  it('splits multi-app output into per-app maps', () => {
    const raw = `=====> app1 nginx information
       Nginx client max body size:      1m
       Nginx proxy read timeout:        60s
=====> app2 nginx information
       Nginx client max body size:      50m`
    const result = parseBulkReport(raw, 'nginx')
    expect(result.size).toBe(2)
    expect(result.get('app1')).toEqual({
      'client-max-body-size': '1m',
      'proxy-read-timeout': '60s',
    })
    expect(result.get('app2')).toEqual({
      'client-max-body-size': '50m',
    })
  })

  it('handles hyphenated app names', () => {
    const raw = `=====> my-cool-app logs information
       Logs max size:                   10m`
    const result = parseBulkReport(raw, 'logs')
    expect(result.get('my-cool-app')).toEqual({ 'max-size': '10m' })
  })

  it('returns empty map for empty input', () => {
    expect(parseBulkReport('', 'nginx').size).toBe(0)
  })

  it('skips computed and global keys same as parseReport', () => {
    const raw = `=====> app1 nginx information
       Nginx computed hsts:             true
       Nginx global hsts:              true
       Nginx hsts:                      true`
    const result = parseBulkReport(raw, 'nginx')
    expect(result.get('app1')).toEqual({ 'hsts': 'true' })
  })
})
```

Update the import at the top of the file to include `parseBulkReport`:
```ts
import { parseReport, parseBulkReport } from './parsers.js'
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/resources/parsers.test.ts`
Expected: FAIL — `parseBulkReport` is not exported from `./parsers.js`

**Step 3: Commit**

```bash
git add src/resources/parsers.test.ts
git commit -m "test: add parseBulkReport tests"
```

---

### Task 2: `parseBulkReport` — implementation

**Files:**
- Modify: `src/resources/parsers.ts`

**Step 1: Add `parseBulkReport` to `src/resources/parsers.ts`**

Append after the existing `parseReport` function:

```ts
/**
 * Parse bulk Dokku report output (all apps) into a Map of app → key-value maps.
 * Splits on "=====> <app> <namespace> information" headers, then delegates
 * each section to parseReport.
 */
export function parseBulkReport(raw: string, namespace: string): Map<string, Record<string, string>> {
  const result = new Map<string, Record<string, string>>()
  const sections = raw.split(/(?=^=====> )/m).filter(s => s.trim())

  for (const section of sections) {
    const headerEnd = section.indexOf('\n')
    if (headerEnd === -1) continue
    const header = section.slice(0, headerEnd)
    const match = header.match(/^=====> (.+?)\s+\S+\s+information/)
    if (!match) continue
    const app = match[1]
    result.set(app, parseReport(section, namespace))
  }

  return result
}
```

**Step 2: Run tests to verify they pass**

Run: `bun test src/resources/parsers.test.ts`
Expected: All PASS

**Step 3: Commit**

```bash
git add src/resources/parsers.ts
git commit -m "feat: add parseBulkReport for multi-app report parsing"
```

---

### Task 3: Add `readAll` to Resource interface

**Files:**
- Modify: `src/core/reconcile.ts:6-12`

**Step 1: Add optional `readAll` to the Resource interface**

Change the `Resource` interface in `src/core/reconcile.ts` to:

```ts
export interface Resource<T = unknown> {
  key: string
  read: (ctx: Context, target: string) => Promise<T>
  /** Bulk read for all apps in one SSH call. Used by export/diff. */
  readAll?: (ctx: Context) => Promise<Map<string, T>>
  onChange: (ctx: Context, target: string, change: any) => void | Promise<void>
  /** Skip diff, always call onChange. For resources without parseable reports. */
  forceApply?: boolean
}
```

**Step 2: Run full test suite to verify nothing breaks**

Run: `bun test`
Expected: All PASS (optional field, no behavior change)

**Step 3: Commit**

```bash
git add src/core/reconcile.ts
git commit -m "feat: add optional readAll to Resource interface"
```

---

### Task 4: `readAll` for property resources — tests

**Files:**
- Modify: `src/resources/properties.test.ts`

**Step 1: Write failing tests**

Add to the bottom of `src/resources/properties.test.ts`:

```ts
describe('readAll (bulk)', () => {
  function makeCtx(queryResult: string) {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue(queryResult)
    runner.run = vi.fn()
    return createContext(runner)
  }

  it('Nginx.readAll returns per-app maps', async () => {
    const ctx = makeCtx(
      '=====> app1 nginx information\n' +
      '       Nginx client max body size:   1m\n' +
      '=====> app2 nginx information\n' +
      '       Nginx client max body size:   50m\n'
    )
    const result = await Nginx.readAll!(ctx)
    expect(result.get('app1')).toEqual({ 'client-max-body-size': '1m' })
    expect(result.get('app2')).toEqual({ 'client-max-body-size': '50m' })
  })

  it('Logs.readAll returns per-app maps', async () => {
    const ctx = makeCtx(
      '=====> app1 logs information\n' +
      '       Logs max size:                10m\n'
    )
    const result = await Logs.readAll!(ctx)
    expect(result.get('app1')).toEqual({ 'max-size': '10m' })
  })

  it('Scheduler.readAll returns per-app strings', async () => {
    const ctx = makeCtx(
      '=====> app1 scheduler information\n' +
      '       Scheduler selected:           docker-local\n' +
      '=====> app2 scheduler information\n' +
      '       Scheduler selected:           k3s\n'
    )
    const result = await Scheduler.readAll!(ctx)
    expect(result.get('app1')).toBe('docker-local')
    expect(result.get('app2')).toBe('k3s')
  })

  it('bulk queries use no app argument', async () => {
    const ctx = makeCtx('')
    await Nginx.readAll!(ctx)
    expect(ctx.runner.query).toHaveBeenCalledWith('nginx:report')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/resources/properties.test.ts`
Expected: FAIL — `readAll` is undefined on Nginx/Logs/Scheduler

**Step 3: Commit**

```bash
git add src/resources/properties.test.ts
git commit -m "test: add readAll tests for property resources"
```

---

### Task 5: `readAll` for property resources — implementation

**Files:**
- Modify: `src/resources/properties.ts`

**Step 1: Add `parseBulkReport` import and `readAll` to factory**

Update the import at line 4:
```ts
import { parseReport, parseBulkReport } from './parsers.js'
```

Add `readAll` to the `propertyResource` factory return object (after `read`, before `onChange`):

```ts
    async readAll(ctx: Context): Promise<Map<string, Record<string, string>>> {
      const raw = await ctx.query(`${opts.namespace}:report`)
      return parseBulkReport(raw, opts.namespace)
    },
```

Add `readAll` to the `Scheduler` resource (after `read`, before `onChange`):

```ts
  async readAll(ctx: Context): Promise<Map<string, string>> {
    const raw = await ctx.query('scheduler:report')
    const bulk = parseBulkReport(raw, 'scheduler')
    const result = new Map<string, string>()
    for (const [app, report] of bulk) {
      result.set(app, report['selected'] ?? '')
    }
    return result
  },
```

**Step 2: Run tests to verify they pass**

Run: `bun test src/resources/properties.test.ts`
Expected: All PASS

**Step 3: Commit**

```bash
git add src/resources/properties.ts
git commit -m "feat: add readAll to property resources (nginx, logs, registry, scheduler)"
```

---

### Task 6: `readAll` for toggle resource (Proxy) — tests

**Files:**
- Modify: `src/resources/toggle.test.ts`

**Step 1: Write failing test**

Add to the bottom of `src/resources/toggle.test.ts`:

```ts
describe('Proxy.readAll (bulk)', () => {
  function makeCtx(queryResult: string) {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue(queryResult)
    runner.run = vi.fn()
    return createContext(runner)
  }

  it('returns per-app booleans from bulk report', async () => {
    const ctx = makeCtx(
      '=====> app1 proxy information\n' +
      '       Proxy enabled:                true\n' +
      '=====> app2 proxy information\n' +
      '       Proxy enabled:                false\n'
    )
    const result = await Proxy.readAll!(ctx)
    expect(result.get('app1')).toBe(true)
    expect(result.get('app2')).toBe(false)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/resources/toggle.test.ts`
Expected: FAIL — `readAll` is undefined on Proxy

**Step 3: Commit**

```bash
git add src/resources/toggle.test.ts
git commit -m "test: add readAll test for Proxy resource"
```

---

### Task 7: `readAll` for toggle resource (Proxy) — implementation

**Files:**
- Modify: `src/resources/toggle.ts`

**Step 1: Add imports and `readAll` to Proxy**

Add imports at the top:
```ts
import type { Context } from '../core/context.js'
import { parseBulkReport } from './parsers.js'
```

Add `readAll` to the Proxy object (after `read`, before `onChange`):

```ts
  readAll: async (ctx: Context) => {
    const raw = await ctx.query('proxy:report')
    const bulk = parseBulkReport(raw, 'proxy')
    const result = new Map<string, boolean>()
    for (const [app, report] of bulk) {
      result.set(app, report['enabled'] === 'true')
    }
    return result
  },
```

**Step 2: Run tests to verify they pass**

Run: `bun test src/resources/toggle.test.ts`
Expected: All PASS

**Step 3: Commit**

```bash
git add src/resources/toggle.ts
git commit -m "feat: add readAll to Proxy resource"
```

---

### Task 8: `readAll` for list resources — tests

**Files:**
- Modify: `src/resources/lists.test.ts`

**Step 1: Write failing tests**

Add to the bottom of `src/resources/lists.test.ts`:

```ts
describe('readAll (bulk)', () => {
  function makeCtx(queryResult: string) {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue(queryResult)
    runner.run = vi.fn()
    return createContext(runner)
  }

  it('Ports.readAll returns per-app port arrays', async () => {
    const ctx = makeCtx(
      '=====> app1 ports information\n' +
      '       Ports map:                    http:80:3000 https:443:3000\n' +
      '=====> app2 ports information\n' +
      '       Ports map:                    http:80:4000\n'
    )
    const result = await Ports.readAll!(ctx)
    expect(result.get('app1')).toEqual(['http:80:3000', 'https:443:3000'])
    expect(result.get('app2')).toEqual(['http:80:4000'])
  })

  it('Domains.readAll returns per-app domain arrays', async () => {
    const ctx = makeCtx(
      '=====> app1 domains information\n' +
      '       Domains app vhosts:           example.com\n' +
      '=====> app2 domains information\n' +
      '       Domains app vhosts:           foo.com bar.com\n'
    )
    const result = await Domains.readAll!(ctx)
    expect(result.get('app1')).toEqual(['example.com'])
    expect(result.get('app2')).toEqual(['foo.com', 'bar.com'])
  })

  it('Storage.readAll returns per-app mount arrays', async () => {
    const ctx = makeCtx(
      '=====> app1 storage information\n' +
      '       Storage mounts:               /data:/app/data\n'
    )
    const result = await Storage.readAll!(ctx)
    expect(result.get('app1')).toEqual(['/data:/app/data'])
  })

  it('handles empty field values as empty arrays', async () => {
    const ctx = makeCtx(
      '=====> app1 ports information\n' +
      '       Ports map:                    \n'
    )
    const result = await Ports.readAll!(ctx)
    // parseReport skips empty values, so no 'map' key, so empty array
    expect(result.get('app1')).toEqual([])
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/resources/lists.test.ts`
Expected: FAIL — `readAll` is undefined

**Step 3: Commit**

```bash
git add src/resources/lists.test.ts
git commit -m "test: add readAll tests for list resources"
```

---

### Task 9: `readAll` for list resources — implementation

**Files:**
- Modify: `src/resources/lists.ts`

**Step 1: Add imports and `readAll` to each list resource**

Add imports at the top:
```ts
import type { Context } from '../core/context.js'
import { parseBulkReport } from './parsers.js'
```

Add `readAll` to Ports (after `read`, before `onChange`):
```ts
  readAll: async (ctx: Context) => {
    const raw = await ctx.query('ports:report')
    const bulk = parseBulkReport(raw, 'ports')
    const result = new Map<string, string[]>()
    for (const [app, report] of bulk) {
      result.set(app, report['map'] ? splitWords(report['map']) : [])
    }
    return result
  },
```

Add `readAll` to Domains (after `read`, before `onChange`):
```ts
  readAll: async (ctx: Context) => {
    const raw = await ctx.query('domains:report')
    const bulk = parseBulkReport(raw, 'domains')
    const result = new Map<string, string[]>()
    for (const [app, report] of bulk) {
      result.set(app, report['app-vhosts'] ? splitLines(report['app-vhosts']) : [])
    }
    return result
  },
```

Add `readAll` to Storage (after `read`, before `onChange`):
```ts
  readAll: async (ctx: Context) => {
    const raw = await ctx.query('storage:report')
    const bulk = parseBulkReport(raw, 'storage')
    const result = new Map<string, string[]>()
    for (const [app, report] of bulk) {
      result.set(app, report['mounts'] ? splitLines(report['mounts']) : [])
    }
    return result
  },
```

**Step 2: Run tests to verify they pass**

Run: `bun test src/resources/lists.test.ts`
Expected: All PASS

**Step 3: Commit**

```bash
git add src/resources/lists.ts
git commit -m "feat: add readAll to list resources (ports, domains, storage)"
```

---

### Task 10: `readAll` for certs, networks, git — tests

**Files:**
- Create: `src/resources/certs.test.ts`
- Create: `src/resources/network.test.ts`
- Create: `src/resources/git.test.ts`

**Step 1: Write failing tests**

`src/resources/certs.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { createRunner } from '../core/dokku.js'
import { createContext } from '../core/context.js'
import { Certs } from './certs.js'

describe('Certs.readAll (bulk)', () => {
  function makeCtx(queryResult: string) {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue(queryResult)
    runner.run = vi.fn()
    return createContext(runner)
  }

  it('returns per-app booleans from bulk report', async () => {
    const ctx = makeCtx(
      '=====> app1 certs information\n' +
      '       Ssl enabled:                  true\n' +
      '=====> app2 certs information\n' +
      '       Ssl enabled:                  false\n'
    )
    const result = await Certs.readAll!(ctx)
    expect(result.get('app1')).toBe(true)
    expect(result.get('app2')).toBe(false)
  })
})
```

`src/resources/network.test.ts`:
```ts
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
```

`src/resources/git.test.ts`:
```ts
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
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/resources/certs.test.ts src/resources/network.test.ts src/resources/git.test.ts`
Expected: FAIL — `readAll` is undefined

**Step 3: Commit**

```bash
git add src/resources/certs.test.ts src/resources/network.test.ts src/resources/git.test.ts
git commit -m "test: add readAll tests for certs, networks, git resources"
```

---

### Task 11: `readAll` for certs, networks, git — implementation

**Files:**
- Modify: `src/resources/certs.ts`
- Modify: `src/resources/network.ts`
- Modify: `src/resources/git.ts`

**Step 1: Add `readAll` to Certs**

Add imports:
```ts
import type { Context } from '../core/context.js'
import { parseBulkReport } from './parsers.js'
```

Add `readAll` to Certs (after `read`, before `onChange`):
```ts
  readAll: async (ctx: Context) => {
    const raw = await ctx.query('certs:report')
    const bulk = parseBulkReport(raw, 'ssl')
    const result = new Map<string, SslValue>()
    for (const [app, report] of bulk) {
      result.set(app, report['enabled'] === 'true')
    }
    return result
  },
```

**Step 2: Add `readAll` to Networks**

Add imports:
```ts
import type { Context } from '../core/context.js'
import { parseBulkReport } from './parsers.js'
```

Add `readAll` to Networks (after `read`, before `onChange`):
```ts
  readAll: async (ctx: Context) => {
    const raw = await ctx.query('network:report')
    const bulk = parseBulkReport(raw, 'network')
    const result = new Map<string, string[]>()
    for (const [app, report] of bulk) {
      result.set(app, report['attach-post-deploy'] ? report['attach-post-deploy'].split(/\s+/) : [])
    }
    return result
  },
```

**Step 3: Add `readAll` to Git**

Add import:
```ts
import type { Context } from '../core/context.js'
import { parseBulkReport } from './parsers.js'
```

Add `readAll` to Git (after `read`, before `onChange`):
```ts
  readAll: async (ctx: Context) => {
    const raw = await ctx.query('git:report')
    const bulk = parseBulkReport(raw, 'git')
    const result = new Map<string, GitConfig>()
    for (const [app, report] of bulk) {
      result.set(app, { deploy_branch: report['deploy-branch'] || undefined })
    }
    return result
  },
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/resources/certs.test.ts src/resources/network.test.ts src/resources/git.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/resources/certs.ts src/resources/network.ts src/resources/git.ts
git commit -m "feat: add readAll to certs, networks, git resources"
```

---

### Task 12: Update export.ts to use bulk prefetch — tests

**Files:**
- Modify: `src/commands/export.test.ts`

**Step 1: Update export tests to verify bulk behavior**

Replace the content of `src/commands/export.test.ts` with tests that verify bulk queries are used:

```ts
import { describe, it, expect, vi } from 'vitest'
import { createRunner } from '../core/dokku.js'
import { runExport } from './export.js'

describe('runExport', () => {
  it('includes dokku version from version command', async () => {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue('')
    runner.check = vi.fn().mockResolvedValue(false)
    // Override version specifically
    runner.query = vi.fn().mockImplementation(async (...args: string[]) => {
      if (args[0] === 'version') return 'dokku version 0.34.5'
      return ''
    })
    const result = await runExport(runner, {})
    expect(result.dokku).toEqual({ version: '0.34.5' })
  })

  it('uses bulk report queries (no app arg) for resources', async () => {
    const runner = createRunner({ dryRun: false })
    const queryCalls: string[][] = []
    runner.query = vi.fn().mockImplementation(async (...args: string[]) => {
      queryCalls.push(args)
      if (args[0] === 'apps:list') return 'myapp'
      if (args[0] === 'version') return 'dokku version 0.34.5'
      return ''
    })
    runner.check = vi.fn().mockResolvedValue(false)
    await runExport(runner, {})
    // Should call bulk reports without app arg
    const bulkCalls = queryCalls.filter(
      c => c[0].endsWith(':report') && c.length === 1 && c[0] !== 'apps:report'
    )
    // Should have bulk calls for: nginx, logs, registry, scheduler, proxy, ports, domains, storage, certs, network, git
    expect(bulkCalls.length).toBeGreaterThanOrEqual(10)
    // Should NOT have per-app report calls (except config which has no readAll)
    const perAppReportCalls = queryCalls.filter(
      c => c[0].endsWith(':report') && c.length >= 2 && c[0] !== 'apps:report'
    )
    expect(perAppReportCalls).toEqual([])
  })

  it('respects appFilter', async () => {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockResolvedValue('')
    runner.check = vi.fn().mockResolvedValue(false)
    const result = await runExport(runner, { appFilter: ['myapp'] })
    expect(Object.keys(result.apps)).toContain('myapp')
    expect(Object.keys(result.apps)).toHaveLength(1)
  })

  it('populates app config from bulk data', async () => {
    const runner = createRunner({ dryRun: false })
    runner.query = vi.fn().mockImplementation(async (...args: string[]) => {
      if (args[0] === 'version') return 'dokku version 0.34.5'
      if (args[0] === 'apps:list') return 'myapp'
      if (args[0] === 'network:list') return ''
      if (args[0] === 'nginx:report') return (
        '=====> myapp nginx information\n' +
        '       Nginx client max body size:   50m\n'
      )
      if (args[0] === 'proxy:report') return (
        '=====> myapp proxy information\n' +
        '       Proxy enabled:                true\n'
      )
      if (args[0] === 'ports:report') return (
        '=====> myapp ports information\n' +
        '       Ports map:                    http:80:3000\n'
      )
      return ''
    })
    runner.check = vi.fn().mockResolvedValue(false)
    const result = await runExport(runner, {})
    expect(result.apps['myapp'].nginx).toEqual({ 'client-max-body-size': '50m' })
    expect(result.apps['myapp'].proxy).toEqual({ enabled: true })
    expect(result.apps['myapp'].ports).toEqual(['http:80:3000'])
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/commands/export.test.ts`
Expected: FAIL — export still uses per-app queries

**Step 3: Commit**

```bash
git add src/commands/export.test.ts
git commit -m "test: update export tests for bulk prefetch"
```

---

### Task 13: Update export.ts to use bulk prefetch — implementation

**Files:**
- Modify: `src/commands/export.ts`

**Step 1: Rewrite `runExport` to prefetch bulk data**

Replace the content of `src/commands/export.ts`:

```ts
import type { Context } from '../core/context.js'
import type { Config } from '../core/schema.js'
import { ALL_APP_RESOURCES } from '../resources/index.js'
import { exportApps } from '../modules/apps.js'
import { exportServices, exportAppLinks } from '../modules/services.js'
import { exportNetworks } from '../modules/network.js'

export interface ExportOptions {
  appFilter?: string[]
}

export async function runExport(ctx: Context, opts: ExportOptions): Promise<Config> {
  const config: Config = { apps: {} }

  // Dokku version
  const versionOutput = await ctx.query('version')
  const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/)
  if (versionMatch) config.dokku = { version: versionMatch[1] }

  // Apps
  const apps = opts.appFilter?.length ? opts.appFilter : await exportApps(ctx)

  // Networks
  const networks = await exportNetworks(ctx)
  if (networks.length > 0) config.networks = networks

  // Services
  const services = await exportServices(ctx)
  if (Object.keys(services).length > 0) config.services = services

  // Bulk prefetch: run all readAll queries in parallel
  const prefetched = new Map<string, Map<string, unknown>>()
  await Promise.all(
    ALL_APP_RESOURCES
      .filter(r => !r.forceApply && !r.key.startsWith('_') && r.readAll)
      .map(async r => {
        prefetched.set(r.key, await r.readAll!(ctx))
      })
  )

  // Per-app assembly
  for (const app of apps) {
    const appConfig: Config['apps'][string] = {}

    for (const resource of ALL_APP_RESOURCES) {
      if (resource.key.startsWith('_')) continue
      if (resource.forceApply) continue

      // Use prefetched data if available, fall back to per-app read
      const value = prefetched.get(resource.key)?.get(app)
        ?? await resource.read(ctx, app)

      // Skip empty values
      if (value === undefined || value === null || value === '') continue
      if (Array.isArray(value) && value.length === 0) continue
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) continue

      // Handle schema mapping: Proxy resource reads boolean, schema wants { enabled: boolean }
      if (resource.key === 'proxy') {
        (appConfig as any).proxy = { enabled: value as boolean }
      } else {
        (appConfig as any)[resource.key] = value
      }
    }

    // Links (custom read — not a resource)
    if (Object.keys(services).length > 0) {
      const links = await exportAppLinks(ctx, app, services)
      if (links.length > 0) appConfig.links = links
    }

    config.apps[app] = appConfig
  }

  return config
}
```

**Step 2: Run export tests**

Run: `bun test src/commands/export.test.ts`
Expected: All PASS

**Step 3: Commit**

```bash
git add src/commands/export.ts
git commit -m "feat: use bulk prefetch in export for ~10x fewer SSH calls"
```

---

### Task 14: Update diff.ts to use bulk prefetch

**Files:**
- Modify: `src/commands/diff.ts`

**Step 1: Add bulk prefetch to `computeDiff`**

Add the prefetch block before the per-app loop (after the `result` initialization at line 26), and change the `resource.read` call to use prefetched data:

After `const result: DiffResult = { apps: {}, services: {}, inSync: true }`, add:

```ts
  // Bulk prefetch: run all readAll queries in parallel
  const prefetched = new Map<string, Map<string, unknown>>()
  await Promise.all(
    ALL_APP_RESOURCES
      .filter(r => !r.forceApply && !r.key.startsWith('_') && r.readAll)
      .map(async r => {
        prefetched.set(r.key, await r.readAll!(ctx))
      })
  )
```

Change line 44 from:
```ts
      const current = await resource.read(ctx, app)
```
to:
```ts
      const current = prefetched.get(resource.key)?.get(app)
        ?? await resource.read(ctx, app)
```

**Step 2: Run diff tests**

Run: `bun test src/commands/diff.test.ts`
Expected: All PASS

**Step 3: Run full test suite**

Run: `bun test`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/commands/diff.ts
git commit -m "feat: use bulk prefetch in diff for ~10x fewer SSH calls"
```

---

### Task 15: Final verification

**Step 1: Run full test suite**

Run: `bun test`
Expected: All PASS

**Step 2: Verify build**

Run: `bun run build`
Expected: Build succeeds with no errors

**Step 3: Verify no regressions in existing tests**

Run: `bun test --reporter=verbose`
Expected: All tests pass, no warnings
