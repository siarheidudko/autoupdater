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

### `working-directory`

Working directory

## Outputs

### `updated`

Update flag. If true, then the version has been updated.

### `dir`

Directory with updates.

### `version`

Package version.

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
          working-directory: ${{ github.workspace }}/autoupdater_directory
```

Example with publish release and publish package
```
name: Autoupdate
on:
  schedule:
    - cron: "0 1 * * *"
jobs:
  check-updates:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      SERVICE_ACCOUNT: ${{ secrets.SERVICE_ACCOUNT }}
    steps:
      - name: set service account file
        id: save_service_account
        run: echo $SERVICE_ACCOUNT>./serviceAccount.json
      - name: install test dependencies
        id: install_dependencies
        run: sudo npm install firebase-tools nyc mocha eslint typedoc typescript -g
      - name: Autoupdate
        id: autoupdate
        uses: siarheidudko/autoupdater@v1
        with:
          stages: 'npm run lint&&npm run build&&npm run cov&&npm run doc'
      - name: Create Release
        id: create_release
        if: ${{ steps.autoupdate.outputs.updated == 'true' }}
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ steps.autoupdate.outputs.version }}
          release_name: Release v${{ steps.autoupdate.outputs.version }}
          body: |
            see [CHANGELOG.md](https://github.com/siarheidudko/firebase-engine/blob/master/CHANGELOG.md)
          draft: false
          prerelease: false
      - name: Set registry npm packages
        id: set_registry
        if: ${{ steps.autoupdate.outputs.updated == 'true' }}
        uses: actions/setup-node@v1
        with:
          registry-url: 'https://registry.npmjs.org'
      - name: Publish package to NPM
        id: publish_package_npm
        if: ${{ steps.autoupdate.outputs.updated == 'true' }}
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}    
```
