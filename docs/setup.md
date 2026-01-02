# ngaj Setup Guide

## Prerequisites

Before installing ngaj, ensure you have:

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Docker** (for MongoDB and ChromaDB)
- **Bluesky Account** with app password
- **Anthropic API Key** (Claude API access)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ziohimself/ngaj.git
cd ngaj
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Bluesky Credentials
BLUESKY_HANDLE=your.handle.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Account Settings
ACCOUNT_NAME=My Tech Commentary Account

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ngaj
CHROMA_URL=http://localhost:8000

# AI Configuration
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Application Settings
PORT=3000
NODE_ENV=development
```

### 4. Start Dependencies

Start MongoDB and ChromaDB using Docker Compose:

```bash
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps
```

You should see:
- `ngaj-mongodb` running on port 27017
- `ngaj-chromadb` running on port 8000

### 5. Initialize Database

Create initial account and indexes:

```bash
npm run db:init
```

This script will:
- Create MongoDB database and collections
- Set up required indexes
- Create initial account document
- Initialize ChromaDB collection

### 6. Start the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## Getting Bluesky App Password

1. Log in to [Bluesky](https://bsky.app)
2. Go to Settings → App Passwords
3. Click "Add App Password"
4. Name it "ngaj" (or whatever you prefer)
5. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)
6. Use this password in your `.env` file (NOT your main Bluesky password)

## Getting Anthropic API Key

1. Sign up at [Anthropic Console](https://console.anthropic.com)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key (starts with `sk-ant-api03-`)
5. Add to your `.env` file

**Note**: You'll need credits in your Anthropic account. See [pricing](https://www.anthropic.com/pricing) for details.

## Initial Configuration

### 1. Upload Knowledge Documents

Once the app is running:

1. Navigate to Knowledge Base section
2. Upload reference materials:
   - PDFs, Markdown files, or text documents
   - Articles, research papers, your blog posts
   - Category: "reference" or "voice_sample"
3. Add tags for organization
4. Wait for processing (embeddings generation)

**Recommended first uploads**:
- 3-5 reference documents (sources you cite frequently)
- 2-3 voice samples (your past posts or articles)

### 2. Configure Discovery Settings

Set your interests and discovery schedules:

```json
{
  "interests": [
    "artificial intelligence",
    "TypeScript",
    "developer tools",
    "software engineering"
  ],
  "schedules": [
    {
      "type": "replies",
      "enabled": true,
      "cronExpression": "*/15 * * * *"  // Every 15 minutes
    },
    {
      "type": "search",
      "enabled": true,
      "cronExpression": "0 */2 * * *"  // Every 2 hours
    }
  ]
}
```

**Note**: Per ADR-008, each account can have **multiple independent schedules** - one for each discovery type (replies, search). This allows time-sensitive replies to be checked frequently while less urgent searches run less often.

**Cron Expression Guide** (configure per discovery type):
- `*/15 * * * *` - Every 15 minutes (recommended for replies)
- `0 */1 * * *` - Every hour
- `0 */2 * * *` - Every 2 hours (recommended for search)
- `0 9,12,15,18 * * *` - At 9am, 12pm, 3pm, 6pm
- `*/30 * * * *` - Every 30 minutes

### 3. Set Voice & Tone

Configure your response style:

```json
{
  "tonePreset": "technical",  // or "professional", "casual", "custom"
  "customInstructions": "Always cite sources when making claims. Keep responses concise."
}
```

## API Documentation

### Swagger UI (Interactive API Docs)

You can explore and test the API using Swagger UI:

**Option 1: Online Swagger Editor**
1. Go to [editor.swagger.io](https://editor.swagger.io/)
2. Copy the contents of `docs/architecture/openapi.yaml`
3. Paste into the editor
4. View interactive documentation and try API calls

**Option 2: Local Swagger UI (via Docker)**
```bash
docker run -p 8080:8080 -e SWAGGER_JSON=/openapi.yaml -v $(pwd)/docs/architecture/openapi.yaml:/openapi.yaml swaggerapi/swagger-ui
```
Then visit: http://localhost:8080

**Option 3: VS Code Extension**
Install the "OpenAPI (Swagger) Editor" extension in VS Code to preview the spec.

### Generate API Clients

Use the OpenAPI spec to generate type-safe API clients:

```bash
# TypeScript/JavaScript
npx @openapitools/openapi-generator-cli generate \
  -i docs/architecture/openapi.yaml \
  -g typescript-axios \
  -o src/frontend/api/generated

# Python
openapi-generator-cli generate \
  -i docs/architecture/openapi.yaml \
  -g python \
  -o python-client

# Other languages: see https://openapi-generator.tech/docs/generators
```

## Verification

### Check MongoDB Connection

```bash
mongosh mongodb://localhost:27017/ngaj

# List collections
show collections

# View account
db.accounts.findOne()
```

### Check ChromaDB Connection

```bash
curl http://localhost:8000/api/v1/heartbeat
```

Should return: `{"nanosecond heartbeat": ...}`

### Test Discovery

Manually trigger discovery:

```bash
curl -X POST http://localhost:3000/api/opportunities/discover
```

Check opportunities:

```bash
curl http://localhost:3000/api/opportunities
```

## Troubleshooting

### MongoDB Connection Issues

**Error**: `MongoServerError: Authentication failed`

**Solution**: Check MongoDB credentials in docker-compose.yml match .env

### ChromaDB Not Starting

**Error**: `Connection refused on port 8000`

**Solution**:
```bash
docker-compose down
docker-compose up -d chromadb
docker-compose logs chromadb
```

### Bluesky Authentication Fails

**Error**: `Invalid identifier or password`

**Solutions**:
- Verify you're using an **app password**, not your main password
- Check handle format: `username.bsky.social` (include `.bsky.social`)
- Ensure no spaces in the app password

### Knowledge Upload Fails

**Error**: `Failed to process document`

**Solution**:
- Check file size (must be < 10MB for v0.1)
- Verify file format (PDF, MD, TXT only)
- Check ChromaDB is running: `docker-compose ps`

## Development Mode

### Enable Debug Logging

```bash
# In .env
LOG_LEVEL=debug
```

### Hot Reload

The dev server uses nodemon for backend and webpack for frontend:

```bash
npm run dev
```

Changes to TypeScript files will auto-reload.

### Database Migrations

```bash
# Reset database (WARNING: deletes all data)
npm run db:reset

# Re-run initialization
npm run db:init
```

## Production Deployment

For production use:

1. Set `NODE_ENV=production` in `.env`
2. Use strong MongoDB credentials
3. Enable MongoDB authentication
4. Consider using managed ChromaDB (cloud) instead of local
5. Set up proper logging and monitoring
6. Use process manager (PM2):

```bash
npm install -g pm2
pm2 start npm --name ngaj -- start
pm2 save
pm2 startup
```

## Updating

```bash
git pull origin main
npm install
npm run build
# Restart application
```

## Backup

### Backup MongoDB

```bash
mongodump --uri="mongodb://localhost:27017/ngaj" --out=./backups/$(date +%Y%m%d)
```

### Backup ChromaDB

```bash
docker-compose exec chromadb cp -r /chroma/chroma ./backups/chromadb-$(date +%Y%m%d)
```

### Backup Uploaded Files

```bash
tar -czf backups/uploads-$(date +%Y%m%d).tar.gz ~/.ngaj/uploads/
```

## Uninstall

```bash
# Stop services
docker-compose down -v  # -v removes volumes

# Remove application
rm -rf ngaj/

# Remove data (optional)
rm -rf ~/.ngaj/
```

## Support

- **Issues**: [GitHub Issues](https://github.com/ziohimself/ngaj/issues)
- **Documentation**: [docs/](./)
- **Architecture Decisions**: [docs/architecture/decisions/](architecture/decisions/)
