# Plugins

Dokku docs: https://dokku.com/docs/advanced-usage/plugin-management/

Module: `src/modules/plugins.ts`

## YAML Keys

### Plugin Declaration (`plugins.<name>`)

Declare third-party Dokku plugins to install. Plugins are keyed by name — the key becomes the `--name` argument to `plugin:install`, so the installed plugin name always matches the YAML key. On each `up` run, dokku-compose checks whether the plugin is installed and at the correct version, installing or updating as needed.

```yaml
plugins:
  postgres:                                           # plugin name
    url: https://github.com/dokku/dokku-postgres.git # required
    version: "1.41.0"                                # optional: pin to tag/branch/commit

  redis:
    url: https://github.com/dokku/dokku-redis.git    # no version: always skip if installed
```

| State | Action | Dokku Command |
|-------|--------|---------------|
| Not installed, no `version` | Install | `plugin:install <url> --name <name>` |
| Not installed, `version` set | Install pinned | `plugin:install <url> --committish <version> --name <name>` |
| Installed, `version` matches | Skip | — |
| Installed, `version` differs | Update | `plugin:update <name> <version>` |
| Installed, no `version` | Skip | — |

**`url`** (required) — Git URL of the plugin repository. Supports `https://`, `git://`, `ssh://`, and `.tar.gz` archives.

**`version`** (optional) — Pin the plugin to a specific git tag, branch, or commit. When the installed version differs from the declared version, `plugin:update` is called automatically. When absent, the installed plugin is left as-is.

### Linking Services to Apps (`apps.<app>.links`)

Attach postgres or redis services to an app. Dokku injects the service connection URL as an environment variable when a service is linked. Service names reference entries from the top-level `postgres:` or `redis:` keys.

```yaml
apps:
  api:
    links:                  # link these services
      - api-postgres
      - api-redis
      - shared-cache

  worker:
    links:
      - shared-cache

  other:
    links: []               # unlink all services

  bare:
    # links key absent — no change to links
```

| Value | Behavior | Dokku Commands |
|-------|----------|----------------|
| `[list]` | Link listed services, unlink any others | `<plugin>:link <service> <app> --no-restart`<br>`<plugin>:unlink <service> <app> --no-restart` |
| `[]` (empty) | Unlink all services from the app | `<plugin>:unlink <service> <app> --no-restart` |
| absent | No change to links | — |

Because reconciliation is declarative, removing a service from `links:` and re-running `up` will unlink it automatically.

### Shared Services

Because services are named independently from apps, multiple apps can link to the same service instance:

```yaml
redis:
  shared-cache: {}

apps:
  api:
    links:
      - shared-cache
  worker:
    links:
      - shared-cache
```

Both `api` and `worker` receive the same Redis connection URL.
