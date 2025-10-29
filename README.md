# ngaj

> AI-powered social media engagement assistant

[![CI](https://github.com/yourusername/ngaj/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/ngaj/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-0%25-red.svg)](./coverage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## What is ngaj?

ngaj helps you discover relevant social media conversations and suggests thoughtful responses powered by Claude AI. Built with Test-Driven Development and multi-agent workflows.

## Features (Planned)

- 🔍 **Smart Discovery**: Find conversations matching your interests
- 🤖 **AI Responses**: Claude-powered response suggestions
- 🎯 **Context-Aware**: Uses your knowledge base and tone preferences
- 🛡️ **Safety First**: Built-in oversight to detect prompt attacks
- 🧪 **Test-Driven**: Comprehensive test coverage from day one

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Testing**: Vitest + Playwright
- **AI**: Anthropic Claude API
- **Database**: PostgreSQL + Vector DB (Qdrant)
- **Development**: Multi-agent TDD workflow

## Project Status

**Iteration 1** (Current): 
- [x] Documentation
- [x] Agent configurations
- [x] Test setup
- [x] CI pipeline
- [ ] Core implementation

## Getting Started

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Documentation

- [Architecture Overview](./docs/architecture/README.md)
- [Agent System](./docs/guides/agent-system.md)
- [Testing Strategy](./docs/guides/testing-strategy.md)
- [Contributing](./CONTRIBUTING.md)

## License

MIT © Serhiy Onyshchenko
