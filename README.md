# Update Dependencies and Update Library

This action check update and outdate dependencies, update they and incremented package version (patch) on 1, if dependencies were updated.

## Inputs

### `token`

Personal access token (PAT) used to fetch and push to the repository.
If you use auto-update for the current repository, you can use an [automatically generated token](https://docs.github.com/en/actions/security-guides/automatic-token-authentication): `${{ secrets.GITHUB_TOKEN }}`.
In all other cases, you must [create a PAT](https://github.com/settings/tokens) (classic or fine-grained) with read and write permissions to the repository. Default: `${{ github.token }}`.

### `author-email`

Author's email of the commit, default: `actions@github.com`.

### `author-name`

Author's name of the commit, default: `GitHUB Actions`.

### `ref`

Repository name with owner. For example, `siarheidudko/autoupdater`. Default: `${{ github.repository }}`.

### `branch`

Name of the branch, default: `master`.

### `working-directory`

Working directory, default: `${{ github.workspace }}`.

### `changelog-file`

Path to changelog file, default: `./CHANGELOG.md`.

### `package-file`

Path to package.json file, default: `./package.json`.

### `package-manager`

Package manager (npm or yarn), default: `npm`.

### `debug`

Show debugging log, default: `false`.

### `builds-and-checks`

Checks to be performed before the push.
Example:

```yaml
|
  npm run lint
  npm run build
  npm run test
```

### `ignore-packages`

Package names that should not be updated.
Example:

```yaml
|
  @types/node
```

## Outputs

### `updated`

Update flag. If true, then the version has been updated.

### `dir`

Directory with updates.

### `version`

Package version.

## Example usage

```yaml
name: Autoupdate
on:
  schedule:
    - cron: "* 0/1 * * *"
concurrency:
  group: "${{ github.workflow }} @ ${{ github.ref }}"
  cancel-in-progress: false
jobs:
  autoupdate:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Autoupdate
        uses: siarheidudko/autoupdater@v2
```

Example with publish release and publish package

```yaml
name: Autoupdate
on:
  schedule:
    - cron: "0 1 * * *"
concurrency:
  group: "${{ github.workflow }} @ ${{ github.ref }}"
  cancel-in-progress: false
jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    outputs:
      updated: ${{ steps.autoupdate.outputs.updated }}
    steps:
      - name: Autoupdate
        id: autoupdate
        uses: siarheidudko/autoupdater@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          author-email: "sergey@dudko.dev"
          author-name: "Sergey Dudko"
          ref: ${{ github.repository }}
          branch: "development"
          working-directory: ${{ github.workspace }}/tmp
          changelog-file: "./CHANGELOG"
          package-file: "./package.json"
          package-manager: "yarn"
          debug: "true"
          builds-and-checks: |
            npm i yarn -g
            yarn build
            yarn test
          ignore-packages: |
            @types/node
  release:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [update]
    if: ${{ needs.update.outputs.updated == 'true' }}
    steps:
      - name: Сheckout repo
        id: checkout_repo
        uses: actions/checkout@v3
      - name: Set registry npm packages
        id: set_registry
        uses: actions/setup-node@v3
        with:
          registry-url: "https://registry.npmjs.org"
      - name: Install yarn
        id: install_yarn
        run: npm i yarn -g
      - name: Build package
        id: build_package
        run: yarn build
      - name: Publish package to NPM
        id: publish_package_npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
