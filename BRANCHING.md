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

The authoritative roadmap and catalog planning state must live on `main`. Delete merged or superseded branches when they are no longer needed, and use Git tags for releases instead of permanent release branches.
