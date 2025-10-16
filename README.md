# Autoupdater for dependencies (Node JS)

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

Package manager (npm, pnpm or yarn), default: `npm`.

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
    - cron: "* 1 * * *"
concurrency:
  group: "${{ github.workflow }} @ ${{ github.ref }}"
  cancel-in-progress: false
jobs:
  autoupdate:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Autoupdate
        id: autoupdate
        uses: siarheidudko/autoupdater@v3
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
    env:
      SERVICE_ACCOUNT: ${{ secrets.SERVICE_ACCOUNT }}
    runs-on: ubuntu-latest
    timeout-minutes: 10
    outputs:
      updated: ${{ steps.autoupdate.outputs.updated }}
      version: ${{ steps.autoupdate.outputs.version }}
    steps:
      - name: Сheckout repo
        id: checkout_repo
        uses: actions/checkout@v3
        with:
          path: "tmp"
          ref: "main"
      - name: Set service account
        id: set_service_account
        run: echo $SERVICE_ACCOUNT>serviceAccount.json
        working-directory: ${{ github.workspace }}/tmp
      - name: Autoupdate
        id: autoupdate
        uses: siarheidudko/autoupdater@v3
        with:
          author-email: "actions@github.com"
          author-name: "Sergey Dudko"
          working-directory: ${{ github.workspace }}/tmp
          ref: ${{ github.repository }}
          branch: "main"
          builds-and-checks: |
            npm test
  release:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      NODE_VERSION: 16
      VERSION: ${{ needs.update.outputs.version }}
    needs: [update]
    if: ${{ needs.update.outputs.updated == 'true' }}
    steps:
      - name: Сheckout repo
        id: checkout_repo
        uses: actions/checkout@v3
        with:
          ref: "main"
      - name: Use Node.js ${{ env.NODE_VERSION }}
        id: setup_node
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          registry-url: "https://registry.npmjs.org"
      - name: Cache node modules
        id: use_cache
        uses: actions/cache@v3
        env:
          cache-name: cache-node-modules
        with:
          path: ~/.npm
          key: ${{ runner.os }}-build-${{ env.cache-name }}-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-build-${{ env.cache-name }}-
            ${{ runner.os }}-build-
            ${{ runner.os }}-
      - name: Install modules
        id: install_modules
        run: npm ci
      - name: Create Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ env.VERSION }}
          release_name: Release ${{ env.VERSION }}
          body: |
            see [CHANGELOG.md](https://github.com/siarheidudko/firebase-admin-cli/blob/main/CHANGELOG.md)
          draft: false
          prerelease: false
      - name: Publish package to NPM
        id: npm_publish
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
