# Project playbook

## Documentation authority

Default branch: `main`.

Project-global current state has a single source of truth on `main`. This includes catalog planning, roadmap/status/priorities, repository-wide rules/policy, release/process documentation, and other management state.

Development branches document their own delta, not an independent copy of the repository's global state. Appropriate branch-local documentation includes rule/catalog changes introduced by that branch, change-specific validation notes, migration notes, and temporary implementation or review evidence.

A copy of a canonical document on a non-default branch is only a proposed delta and must not be treated as current project state. Operational planning/status updates should target `main` promptly; do not maintain an independent planning state on a long-lived side branch.

Before using or changing canonical documentation from a side branch:

1. read the current version from `main`,
2. describe only the branch-specific delta where possible,
3. reconcile canonical-document edits with the latest `main` before merge, and
4. after integration, ensure `main` reflects the resulting repository state and remove or condense temporary delta documentation where appropriate.

Do not blindly overwrite newer canonical state from an older branch.
