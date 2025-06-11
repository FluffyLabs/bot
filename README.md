# FluffyLabs Tipping Bot

A GitHub bot that enables cryptocurrency tipping on GitHub issues and pull requests using Polkadot Asset Hub.

## Features

- **Tip Commands**: Send DOT or USDC tips via GitHub comments
- **Authorization**: Team/organization membership-based access control
- **Reactions**: Visual feedback with emoji reactions (👀 for authorized, 👎 for unauthorized)
- **Transaction Tracking**: Real-time updates with blockchain transaction details
- **Error Handling**: Contextual error messages for authorized users only

## Usage

Mention the bot in a comment with a tip command:

```
@fluffylabs-bot tip <address> <amount> <asset> [optional message]
```

**Examples:**
```
@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 10 DOT great work!
@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 25 USDC
```

**Supported Assets:** DOT, USDC

## Development

### Setup

```sh
npm install
cp .env.example .env
# Configure environment variables in .env
npm start
```

### Configuration

Required environment variables:

```env
GITHUB_ORG=your-org
GITHUB_TEAM=your-team
WALLET_SEED=your-wallet-seed
ASSET_HUB_RPC=wss://polkadot-asset-hub-rpc.polkadot.io
MAX_DOT_TIP=100
MAX_USDC_TIP=1000
```

### Testing

```sh
npm test
npm run test-watch  # Watch mode
npm run lint        # Type checking
```

### Docker

```sh
docker build -t fluffylabs-bot .
docker run --env-file .env fluffylabs-bot
```

### CI/CD

The project uses GitHub Actions for continuous integration and deployment:

- **CI Pipeline**: Runs tests, linting, security audits on Node.js 18.x, 20.x, 22.x
- **Docker Build**: Validates Docker image builds
- **Security**: Automated dependency vulnerability scanning
- **Deployment**: Automated Docker image publishing to GitHub Container Registry on releases
- **Dependencies**: Automated dependency updates via Dependabot

Workflows:
- `.github/workflows/ci.yml` - Main CI pipeline
- `.github/workflows/deploy.yml` - Release deployment

## How It Works

1. **Command Detection**: Bot monitors comments for mentions and tip commands
2. **Authorization**: Checks team/organization membership via GitHub API
3. **Validation**: Validates address format, amount limits, and asset support
4. **Reactions**: Adds emoji reactions based on authorization status
5. **Transaction**: Sends blockchain transaction via Polkadot Asset Hub
6. **Updates**: Edits initial comment with transaction results

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[ISC](LICENSE) © 2025 Fluffylabs