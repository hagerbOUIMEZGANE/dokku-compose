# Bulk Export Optimization

## Problem

Export and diff make ~11 sequential SSH calls per app. For 7 apps, that's ~77 sequential roundtrips. Most Dokku `:report` commands support being called without an app argument, returning all apps in a single response.

## Design

### 1. `parseBulkReport` in `parsers.ts`

New function that splits multi-app report output by `=====>` headers, then delegates each section to the existing `parseReport`:

```ts
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

Reuses `parseReport` for field parsing — zero duplication.

### 2. `readAll` on Resource interface

One new optional method on `Resource` in `reconcile.ts`:

```ts
export interface Resource<T = unknown> {
  key: string
  read: (ctx: Context, target: string) => Promise<T>
  readAll?: (ctx: Context) => Promise<Map<string, T>>
  onChange: (ctx: Context, target: string, change: any) => void | Promise<void>
  forceApply?: boolean
}
```

No `apps` parameter — the bulk Dokku command returns all apps; the caller filters.

#### Per-resource implementations

| Resource | File | `readAll` approach |
|---|---|---|
| Nginx, Logs, Registry | `properties.ts` | Factory gets it free: `namespace:report` → `parseBulkReport` |
| Scheduler | `properties.ts` | Bulk report → extract `selected` per app |
| Proxy | `toggle.ts` | Bulk `proxy:report` → extract `enabled` → boolean |
| Ports | `lists.ts` | Bulk `ports:report` → extract `map` → split words |
| Domains | `lists.ts` | Bulk `domains:report` → extract `app-vhosts` → split lines |
| Storage | `lists.ts` | Bulk `storage:report` → extract `mounts` → split lines |
| Certs | `certs.ts` | Bulk `certs:report` → extract `enabled` → boolean |
| Networks | `network.ts` | Bulk `network:report` → extract `attach-post-deploy` → split |
| Git | `git.ts` | Bulk `git:report` → extract `deploy-branch` → object |
| Config (env) | `config.ts` | **No `readAll`** — uses `config:get` + `config:export`, no bulk equivalent |

### 3. Export and diff changes

Both `export.ts` and `diff.ts` get the same prefetch pattern:

```ts
const prefetched = new Map<string, Map<string, unknown>>()
await Promise.all(
  ALL_APP_RESOURCES
    .filter(r => !r.forceApply && !r.key.startsWith('_') && r.readAll)
    .map(async r => {
      prefetched.set(r.key, await r.readAll!(ctx))
    })
)
```

Per-app loops use prefetched data with fallback:

```ts
const value = prefetched.get(resource.key)?.get(app)
  ?? await resource.read(ctx, app)
```

### SSH call comparison

| | Before | After |
|---|---|---|
| Export (7 apps) | ~77 sequential | ~10 parallel + ~7 sequential (config) |
| Diff (7 apps) | ~77 sequential | ~10 parallel + ~7 sequential (config) |

### What doesn't change

`reconcile.ts`, `up.ts`, `down.ts` — the reconcile path always uses per-app `read` since it's interleaved with writes.

## Testing

- `parsers.test.ts`: multi-app output parsing, hyphenated app names, empty input
- Per-resource test files: each gets a `readAll` test verifying bulk query and map structure
- `export.test.ts`: update mocks to handle bulk `namespace:report` (no app arg) calls
