# NPM Publishing Guide

## Security Notice (2024+)

Classic npm tokens have been revoked. You must now use **Granular Access Tokens** which:
- Are limited to 90 days maximum
- Require 2FA by default
- Can be scoped to specific packages

---

## Option 1: Interactive Login

```bash
npm login
```

This opens a browser for authentication. Complete 2FA if prompted.

---

## Option 2: Granular Access Token

### Create Token on npmjs.com

1. Go to https://www.npmjs.com/settings/~/tokens
2. Click **"Generate New Token"** → **"Granular Access Token"**
3. Configure:
   - **Token name**: e.g., `publish-mp-api`
   - **Expiration**: Choose duration (max 90 days)
   - **Packages**: Select which packages this token can access
   - **Permissions**: Set to **"Read and write"** for publishing
4. Click **Generate** and copy the token immediately

### Configure Token Locally

```bash
npm config set //registry.npmjs.org/:_authToken=YOUR_TOKEN_HERE
```

Or add to `.npmrc` file:

```
//registry.npmjs.org/:_authToken=YOUR_TOKEN_HERE
```

### Store in .env (for reference)

```env
NPM_TOKEN=npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Publishing

### 1. Update Version

```bash
npm version patch   # 0.0.30 → 0.0.31
npm version minor   # 0.0.31 → 0.1.0
npm version major   # 0.1.0 → 1.0.0
```

### 2. Publish

```bash
npm publish
```

### One-liner (version + publish)

```bash
npm version patch && npm publish
```

---

## CI/CD Considerations

Since tokens expire after 90 days maximum:

1. **Set calendar reminders** to regenerate tokens before expiration
2. **Update CI/CD secrets** (GitHub Actions, etc.) when tokens are renewed
3. Consider using **GitHub Actions npm publish** which handles auth automatically:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    registry-url: 'https://registry.npmjs.org'
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Troubleshooting

### "403 Forbidden"
- Token may be expired → Generate new token
- Token lacks write permissions → Check token settings

### "401 Unauthorized"
- Not logged in → Run `npm login`
- Token not set correctly → Check `.npmrc` configuration

### Check Current Auth

```bash
npm whoami
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm login` | Interactive login with 2FA |
| `npm whoami` | Check current authenticated user |
| `npm token list` | List your tokens |
| `npm version patch` | Bump patch version |
| `npm publish` | Publish to registry |
