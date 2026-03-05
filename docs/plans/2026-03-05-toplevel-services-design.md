# Top-level postgres/redis keys

Replace the generic `services:` key with dedicated `postgres:` and `redis:` top-level keys.

## YAML format

```yaml
# Before
services:
  funqtion-db:
    plugin: postgres
    version: "17-3.5"
    image: postgis/postgis
    backup: { ... }
  funqtion-redis:
    plugin: redis
    version: "7.2-alpine"

# After
postgres:
  funqtion-db:
    version: "17-3.5"
    image: postgis/postgis
    backup: { ... }

redis:
  funqtion-redis:
    version: "7.2-alpine"
```

- `plugin` field removed (implicit from top-level key)
- `links` unchanged: `links: [funqtion-db, funqtion-redis]`
- `backup` only in postgres schema (redis doesn't support it)

## Schema

- `PostgresSchema`: `{ version?, image?, backup? }`
- `RedisSchema`: `{ version?, image? }`
- `ConfigSchema`: `postgres: z.record(PostgresSchema)`, `redis: z.record(RedisSchema)`

## Modules

Replace `src/modules/services.ts` with:
- `src/modules/postgres.ts` — ensure, destroy, export, backups
- `src/modules/redis.ts` — ensure, destroy, export

Link resolution: helper function scans `config.postgres` + `config.redis` to find which plugin owns a service name. Used by link ensure/destroy/export.

## Commands

- `up.ts`: `ensurePostgres()` + `ensureRedis()` + `ensurePostgresBackups()`, then per-app links
- `down.ts`: unlink per-app, then `destroyPostgres()` + `destroyRedis()`
- `export.ts`: `exportPostgres()` + `exportRedis()` query respective `:list`/`:info` commands
- `diff.ts`: check existence per service under each plugin key

## Docs

Update README and `docs/reference/` to reflect new format.
