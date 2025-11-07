# GitHub Bot Setup Guide

## Required Secrets

Add these secrets in your GitHub repository settings:

### 1. Go to Repository Settings

- Navigate to your repository on GitHub
- Click "Settings" tab
- Click "Secrets and variables" → "Actions"

### 2. Add Required Secrets

#### For OpenAI Integration:

```
OPENAI_API_KEY=sk-your-openai-key-here
```

#### For Claude Integration:

```
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

## Bot Features

### 1. PR Size Analysis (`pr-bot.yml`)

- ✅ Automatically labels PRs by size (XS, S, M, L, XL)
- ✅ Comments with review complexity estimation
- ✅ No external API keys required

### 2. Security Scanner (`pr-bot.yml`)

- ✅ Scans for potential security issues
- ✅ Detects hardcoded secrets, API keys
- ✅ Flags unsafe code patterns
- ✅ No external API keys required

### 3. Dependency Monitor (`pr-bot.yml`)

- ✅ Alerts on package.json changes
- ✅ Provides security checklist
- ✅ No external API keys required

### 4. AI Code Review (`pr-review.yml`)

- 🔄 OpenAI-powered code analysis
- 🔄 Claude AI integration (requires implementation)
- ⚠️ Requires API keys

### 5. Claude Analysis (`claude-review.yml`)

- 🔄 Detailed code quality review
- 🔄 Best practices compliance check
- ⚠️ Requires ANTHROPIC_API_KEY

## Immediate Usage

The `pr-bot.yml` workflow will work immediately without any API keys. It provides:

- PR size labeling
- Security scanning
- Dependency change alerts

## API Integration

For AI-powered reviews, you'll need to:

1. Get API keys:

    - OpenAI: https://platform.openai.com/api-keys
    - Anthropic: https://console.anthropic.com/

2. Add them as repository secrets

3. The workflows will automatically start using AI analysis

## Testing

Create a test PR to see the bots in action:

```bash
git checkout -b test-bot-features
echo "// Test change" >> README.md
git add README.md
git commit -m "test: verify bot functionality"
git push -u origin test-bot-features
```

Then create a PR and watch the bots comment!

## Customization

Edit the workflow files to:

- Adjust size thresholds
- Modify security patterns
- Change comment formats
- Add custom analysis rules
