/**
 * Parse Dokku report output into a key-value map.
 * Report format: "       Namespace key name:   value"
 * Keys are normalized: lowercase, spaces to hyphens, namespace prefix stripped.
 * Computed, global, and meta keys are excluded.
 * Empty values are excluded.
 */
export function parseReport(raw: string, namespace: string): Record<string, string> {
  const result: Record<string, string> = {}
  const prefix = new RegExp(`^${namespace}\\s+`, 'i')

  for (const line of raw.split('\n')) {
    // Skip header lines (=====> ...)
    if (line.trimStart().startsWith('=====>')) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const rawKey = line.slice(0, colonIdx).trim()
    if (!rawKey) continue

    const value = line.slice(colonIdx + 1).trim()

    // Strip namespace prefix and normalize
    const stripped = rawKey.replace(prefix, '')
    const key = stripped.toLowerCase().replace(/\s+/g, '-')

    // Skip computed, global, and meta keys
    if (key.startsWith('computed-') || key.startsWith('global-') || key === 'last-visited-at') continue

    // Skip empty values
    if (!value) continue

    result[key] = value
  }

  return result
}
