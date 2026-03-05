import type { Runner } from './dokku.js'

export interface Context {
  /** Cached read-only query — same args return cached result */
  query(...args: string[]): Promise<string>
  /** Boolean check — delegates to runner, not cached */
  check(...args: string[]): Promise<boolean>
  /** Mutation — records command, executes via runner */
  run(...args: string[]): Promise<void>
  /** All commands that were run (or would be in dry-run) */
  commands: string[][]
  /** The underlying runner (for backward compat during migration) */
  runner: Runner
  /** Close the underlying SSH connection */
  close(): Promise<void>
}

export function createContext(runner: Runner): Context {
  const cache = new Map<string, Promise<string>>()
  const commands: string[][] = []

  return {
    commands,
    runner,

    query(...args: string[]): Promise<string> {
      const key = args.join('\0')
      const cached = cache.has(key)
      if (!cached) {
        cache.set(key, runner.query(...args))
      }
      if (process.env.DOKKU_COMPOSE_DEBUG && args[0]?.includes('builder-dockerfile')) {
        console.error(`[debug] ctx.query(${args.join(' ')}) cached=${cached}`)
      }
      return cache.get(key)!
    },

    check(...args: string[]): Promise<boolean> {
      return runner.check(...args)
    },

    async run(...args: string[]): Promise<void> {
      commands.push(args)
      await runner.run(...args)
    },

    close(): Promise<void> {
      return runner.close()
    },
  }
}
