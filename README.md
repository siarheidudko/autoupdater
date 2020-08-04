# Autoupdate you dependencies

This action check update and outdate dependencies, update they and incremented package version (patch) on 1, if dependencies were updated.

## Inputs

### `repository`

Repository name (include account), default: `${{ github.repository }}`.

### `branch`

Branch name, default: `master`.

### `token`

GitHub token, default: `${{ github.token }}`

### `package-json`

Package file, default: `./package.json`

### `changelog`

Changelog file, default: `./CHANGELOG.md`

### `stages`

Additional actions before commit, separator &&

## Example usage

```
  uses: siarheidudko/autoupdater@v1
  with:
    repository: 'siarheidudko/autoupdater'
    branch: 'test'
    token: '46e85f7652174b7fb60178e85a5ed809438b4a44'
    package-json: 'package.json'
    changelog: 'CHANGELOG.md'
    stages: 'npm run lint&&npm run build&&npm run test'
```

```
name: Autoupdate
on:
  schedule:
    - cron: "* 0/1 * * *"
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Autoupdate
        uses: siarheidudko/autoupdater@v1
```

```
name: Autoupdate
on:
  schedule:
    - cron: "* 0/1 * * *"
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Autoupdate
        uses: siarheidudko/autoupdater@v1
        with:
          repository: 'siarheidudko/autoupdater'
          branch: 'test'
          token: '46e85f7652174b7fb60178e85a5ed809438b4a44'
          package-json: 'package.json'
          stages: 'npm run lint&&npm run build&&npm run test'
```
