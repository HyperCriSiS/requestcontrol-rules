# Branching workflow

`main` is the single long-lived integration and release branch.

The existing `dev` branch is not a required integration layer. New work should branch from `main` and return to `main` through a pull request.

Use short-lived branches per logical change:

- `feature/<name>`
- `fix/<name>`
- `refactor/<name>`
- `test/<name>`
- `docs/<name>`
- `chore/<name>`
- `hotfix/<name>`
- `release/<version>` only when temporary release stabilization is needed

Do not keep permanent module, catalog, subsystem, feature, `dev`, or `staging` branches. Stacked pull requests are allowed only for genuine temporary dependencies.

## Documentation authority

The authoritative roadmap/catalog planning state and all other project-global current-state documentation live on `main`.

Development branches document their own rule/catalog/documentation delta rather than maintaining an independent global repository state. A canonical document edited on a side branch is only a proposed change until merged and must be reconciled with the latest `main` before integration. Planning or policy state that exists only on a side branch is not authoritative.

Details: `docs/engineering/PROJECT-PLAYBOOK.md`.

Delete merged or superseded branches when they are no longer needed, and use Git tags for releases instead of permanent release branches.
