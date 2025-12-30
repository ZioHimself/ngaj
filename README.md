# ngaj

[![CI Pipeline](https://github.com/ziohimself/ngaj/workflows/CI%20Pipeline/badge.svg)](https://github.com/ziohimself/ngaj/actions)
[![codecov](https://codecov.io/gh/ziohimself/ngaj/branch/main/graph/badge.svg)](https://codecov.io/gh/ziohimself/ngaj)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

**Proactive engagement companion for social media**

ngaj helps you show up consistently and authentically in high-value conversations by discovering opportunities and crafting AI-powered responses grounded in your knowledge and voice.

## Vision

ngaj is fundamentally about **proactive, authentic engagement amplification**. It surfaces conversations you might miss, lowers the activation energy for engagement, and enhances rather than replaces your voice.

## Core Value Proposition

*"Help you show up consistently and authentically in high-value conversations by discovering opportunities, crafting responses grounded in your knowledge, and protecting against manipulation."*

## Features

### v0.1 MVP (Current)

✅ **Smart Discovery**: Find Bluesky conversations matching your interests  
✅ **AI Responses**: Claude-powered suggestions using your knowledge base  
✅ **Context-Aware**: Grounds responses in your uploaded reference materials  
✅ **Scheduled Polling**: Automatic opportunity discovery on your schedule  
✅ **Knowledge Base**: Upload reference materials and voice samples

### Roadmap

- **v0.2** - Multi-Account & Analysis Mode
  - Multiple account support
  - Multiple platforms (LinkedIn, Reddit)
  - Toulmin analysis brainstorm mode
  - Auto-posting without review

- **v0.3** - Proactive Content
  - Content origination (news monitoring)
  - Scheduled original posts
  - Content calendar

- **v0.4** - Intelligence & Safety
  - Engagement analytics
  - Learning from what works
  - Advanced safety (prompt injection detection)
  - Rate limiting

- **v0.5** - Automation
  - Auto-scraping past posts
  - Advanced scoring models

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Bluesky credentials and API keys

# Start dependencies (MongoDB + ChromaDB)
docker-compose up -d

# Initialize database
npm run db:init

# Start development server
npm run dev
```

Open your browser to http://localhost:3000

## Documentation

- [Setup Guide](docs/setup.md) - Installation and configuration
- [Architecture Overview](docs/architecture/overview.md) - System design
- [API Specification](docs/architecture/api-spec.md) - REST endpoints
- [Architecture Decisions](docs/architecture/decisions/) - ADRs

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + TypeScript + Express
- **Database**: MongoDB (config, queue, history)
- **Vector Store**: ChromaDB (knowledge embeddings)
- **AI**: Anthropic Claude API
- **Social Platform**: Bluesky (AT Protocol)
- **Scheduler**: node-cron

## Project Principles

1. **Local-First**: Runs on your machine, you control your data
2. **Privacy**: Credentials in environment variables, no cloud storage
3. **Authentic**: AI assists, doesn't replace your voice
4. **Proactive**: Surfaces opportunities you'd otherwise miss
5. **Grounded**: Responses based on your actual knowledge and positions

## License

[MIT © Serhiy Onyshchenko](LICENSE)

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines.
