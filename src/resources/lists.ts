// src/resources/lists.ts
import type { Resource } from '../core/reconcile.js'
import type { ListChange } from '../core/change.js'
import type { Context } from '../core/context.js'
import { parseBulkReport } from './parsers.js'

function splitWords(raw: string): string[] {
  return raw.split(/\s+/).map(s => s.trim()).filter(Boolean)
}

function splitLines(raw: string): string[] {
  return raw.split('\n').map(s => s.trim()).filter(Boolean)
}

export const Ports: Resource<string[]> = {
  key: 'ports',
  read: async (ctx, target) => {
    const raw = await ctx.query('ports:report', target, '--ports-map')
    return splitWords(raw)
  },
  readAll: async (ctx: Context) => {
    const raw = await ctx.query('ports:report')
    const bulk = parseBulkReport(raw, 'ports')
    const result = new Map<string, string[]>()
    for (const [app, report] of bulk) {
      result.set(app, report['map'] ? splitWords(report['map']) : [])
    }
    return result
  },
  onChange: async (ctx, target, change: ListChange) => {
    // Ports uses replace-all semantics
    await ctx.run('ports:set', target, ...change.after)
  },
}

export const Domains: Resource<string[]> = {
  key: 'domains',
  read: async (ctx, target) => {
    const raw = await ctx.query('domains:report', target, '--domains-app-vhosts')
    return splitLines(raw)
  },
  readAll: async (ctx: Context) => {
    const raw = await ctx.query('domains:report')
    const bulk = parseBulkReport(raw, 'domains')
    const result = new Map<string, string[]>()
    for (const [app, report] of bulk) {
      result.set(app, report['app-vhosts'] ? splitWords(report['app-vhosts']) : [])
    }
    return result
  },
  onChange: async (ctx, target, { added, removed }: ListChange) => {
    for (const d of removed) await ctx.run('domains:remove', target, d)
    for (const d of added) await ctx.run('domains:add', target, d)
  },
}

export const Storage: Resource<string[]> = {
  key: 'storage',
  read: async (ctx, target) => {
    const raw = await ctx.query('storage:report', target, '--storage-mounts')
    return splitLines(raw)
  },
  readAll: async (ctx: Context) => {
    const raw = await ctx.query('storage:report')
    const bulk = parseBulkReport(raw, 'storage')
    const result = new Map<string, string[]>()
    for (const [app, report] of bulk) {
      result.set(app, report['mounts'] ? splitLines(report['mounts']) : [])
    }
    return result
  },
  onChange: async (ctx, target, { added, removed }: ListChange) => {
    for (const m of removed) await ctx.run('storage:unmount', target, m)
    for (const m of added) await ctx.run('storage:mount', target, m)
  },
}
