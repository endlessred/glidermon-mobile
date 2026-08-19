---
name: zustand-store-slice
description: Scaffold a new Zustand store slice following project conventions (persist, schema version, migrations, integrity checks). Use when adding new data domain to the store.
user-invocable: false
---

When creating a new Zustand store slice in this project:
1. Import from `src/data/stores/` pattern — look at cosmeticsStore.ts for the reference shape
2. Always include: `version`, `_hasHydrated`, `migrations` array, and non-negative balance guards
3. Register in `src/data/dataSource.ts`
4. Export typed selectors, not raw store access
5. Add schema migration entry even for v1 (future-proofs)