import type { Runner } from '../core/dokku.js'
import type { ServiceConfig } from '../core/schema.js'
import { logAction, logDone, logSkip } from '../core/logger.js'

export async function ensureServices(
  runner: Runner,
  services: Record<string, ServiceConfig>
): Promise<void> {
  for (const [name, config] of Object.entries(services)) {
    logAction('services', `Ensuring ${name}`)
    const exists = await runner.check(`${config.plugin}:exists`, name)
    if (exists) { logSkip(); continue }
    const args: string[] = [`${config.plugin}:create`, name]
    if (config.image) args.push('--image', config.image)
    if (config.version) args.push('--image-version', config.version)
    await runner.run(...args)
    logDone()
  }
}

export async function ensureServiceBackups(
  runner: Runner,
  services: Record<string, ServiceConfig>
): Promise<void> {
  for (const [name, config] of Object.entries(services)) {
    if (!config.backup) continue
    const { schedule, bucket, auth } = config.backup
    logAction('services', `Configuring backup for ${name}`)
    await runner.run(`${config.plugin}:backup-deauth`, name)
    await runner.run(
      `${config.plugin}:backup-auth`, name,
      auth.access_key_id, auth.secret_access_key,
      auth.region, auth.signature_version, auth.endpoint
    )
    await runner.run(`${config.plugin}:backup-schedule`, name, schedule, bucket)
    logDone()
  }
}

export async function ensureAppLinks(
  runner: Runner,
  app: string,
  desiredLinks: string[],
  allServices: Record<string, ServiceConfig>
): Promise<void> {
  const desiredSet = new Set(desiredLinks)

  for (const [serviceName, serviceConfig] of Object.entries(allServices)) {
    const isLinked = await runner.check(`${serviceConfig.plugin}:linked`, serviceName, app)
    const isDesired = desiredSet.has(serviceName)

    if (isDesired && !isLinked) {
      logAction(app, `Linking ${serviceName}`)
      await runner.run(`${serviceConfig.plugin}:link`, serviceName, app, '--no-restart')
      logDone()
    } else if (!isDesired && isLinked) {
      logAction(app, `Unlinking ${serviceName}`)
      await runner.run(`${serviceConfig.plugin}:unlink`, serviceName, app, '--no-restart')
      logDone()
    }
  }
}

export async function destroyAppLinks(
  runner: Runner,
  app: string,
  links: string[],
  allServices: Record<string, ServiceConfig>
): Promise<void> {
  for (const serviceName of links) {
    const config = allServices[serviceName]
    if (!config) continue
    const isLinked = await runner.check(`${config.plugin}:linked`, serviceName, app)
    if (isLinked) {
      await runner.run(`${config.plugin}:unlink`, serviceName, app, '--no-restart')
    }
  }
}

export async function destroyServices(
  runner: Runner,
  services: Record<string, ServiceConfig>
): Promise<void> {
  for (const [name, config] of Object.entries(services)) {
    logAction('services', `Destroying ${name}`)
    const exists = await runner.check(`${config.plugin}:exists`, name)
    if (!exists) { logSkip(); continue }
    await runner.run(`${config.plugin}:destroy`, name, '--force')
    logDone()
  }
}

export async function exportServices(
  _runner: Runner
): Promise<Record<string, ServiceConfig>> {
  // This is a best-effort export — callers will typically provide known plugin names
  return {}
}

export async function exportAppLinks(
  runner: Runner,
  app: string,
  services: Record<string, ServiceConfig>
): Promise<string[]> {
  const linked: string[] = []
  for (const [serviceName, config] of Object.entries(services)) {
    const isLinked = await runner.check(`${config.plugin}:linked`, serviceName, app)
    if (isLinked) linked.push(serviceName)
  }
  return linked
}
