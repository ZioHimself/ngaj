# ngaj Project Glossary

## Core Domain Terms

- **Profile**: A cross-platform persona defining voice, discovery preferences, and knowledge base. Represents "who you are" across platforms
- **Account**: A connection to a specific social media platform (Bluesky, LinkedIn, Reddit) with platform-specific credentials and scheduling. Represents "where you post"
- **Opportunity**: A discovered social media post that matches user interests and could be a good engagement target. Has status (pending, responded, dismissed, expired) and composite score.
- **Discovery**: Automated process of finding relevant social media posts based on user-configured interests and keywords. Runs on independent schedules per discovery type (replies, search).
- **Discovery Type**: Category of discovery source - 'replies' (responses to user's posts) or 'search' (keyword-based searches). Each has independent scheduling.
- **Author**: Social media user who created a discovered post. Stored separately with profile data (follower count, bio, handle) and updated on each discovery.
- **Knowledge Base**: Collection of user's uploaded reference materials (PDFs, markdown, text files) used to ground AI responses
- **Response**: AI-generated suggested reply to an opportunity, grounded in the user's knowledge base, principles, and voice. Has status (draft, posted, dismissed) and version number for multi-draft support.
- **Response Posting**: The act of publishing a draft response to the social media platform as a threaded reply to the opportunity post. Captures platform metadata (post ID, URL, timestamp).
- **Principles**: Core values and beliefs that shape all AI-generated responses. Stored as freeform text in user profile. Always included in generation prompts (e.g., "I value evidence-based reasoning and kindness").
- **Voice**: User's tone, style, and communication preferences used to guide AI response generation. Freeform text field in profile (e.g., "Friendly but professional. Technical but accessible.").
- **Engagement**: The act of responding to or interacting with social media posts
- **Platform**: Social media service (e.g., Bluesky, LinkedIn, Reddit) that ngaj integrates with. **Note for agents**: "Platform" is reserved for social networks in this project. Use "OS" or "Operating System" for macOS/Windows/Linux. Use "Native Installer" for OS-specific installer packages (.pkg, .msi).
- **Scoring**: Algorithm that ranks opportunities by relevance using weighted components: 60% recency (exponential decay) + 40% impact (reach and engagement)
- **Recency Score**: Time-based score component (0-100) using exponential decay. Posts < 2 min = ~100, 30 min = ~37, 2 hours = ~1.
- **Impact Score**: Reach/engagement score component (0-100) using logarithmic scale of author followers + post likes + reposts
- **Queue**: Prioritized list of pending opportunities awaiting user review, sorted by total score descending
- **Handle**: Platform-specific username or identifier (e.g., @user.bsky.social for Bluesky, u/username for Reddit)

## Technical Terms

- **Embedding**: Vector representation of text chunks used for semantic similarity search via Claude API
- **Vector Store**: Database (ChromaDB) that stores and queries document embeddings for semantic search
- **Chunk**: Segment of a document (~500 tokens) created during knowledge base processing, respecting paragraph boundaries
- **Document Processing**: Pipeline that converts uploaded files into searchable chunks: extract text → chunk → embed → store
- **Semantic Search**: Querying the knowledge base using natural language to find relevant chunks based on meaning (not keywords)
- **Top-K Search**: Retrieval strategy that returns the K most similar chunks to a query (default K=5)
- **Cosine Similarity**: Metric used to measure relevance between query and document chunks (0=unrelated, 1=identical)
- **Synchronous Processing**: Upload workflow where user waits for processing to complete (vs. background job queue)
- **Atomic Operation**: Database operation that either fully succeeds or fully fails with rollback (e.g., upload creates MongoDB + ChromaDB + filesystem entries together)
- **Hard Delete**: Permanent removal of data from all systems (MongoDB, ChromaDB, filesystem) with no recovery option
- **Storage Limit**: Configurable maximum disk space per profile (default: 100MB total, 10MB per file)
- **Cron Job**: Scheduled task that runs discovery at regular intervals. Multiple schedules supported per account (e.g., replies every 15 min, search every 2 hours).
- **Cron Expression**: Time schedule format (e.g., '*/15 * * * *' = every 15 minutes, '0 */2 * * *' = every 2 hours)
- **Discovery Schedule Preset**: Simplified schedule option in First-Launch Wizard (15min, 30min, 1hr, 2hr, 4hr). Maps to cron expressions internally. Full cron expressions available via REST API.
- **AT Protocol**: Bluesky's underlying protocol for decentralized social networking
- **Local-First**: Architecture principle where all data and processing stays on the user's machine
- **Draft**: Initial status of a generated response before user review and posting
- **Platform Adapter**: Interface abstraction for platform-specific API calls, enabling multi-platform support. Implements fetchReplies, searchPosts, getAuthor methods.
- **Upsert**: Database operation that updates a document if it exists, inserts if it doesn't. Used for author records to keep data fresh.
- **Exponential Decay**: Mathematical function (e^(-age/factor)) used for recency scoring. Older posts decay rapidly, recent posts score high.
- **Opportunity TTL**: Time-to-live for pending opportunities before automatic expiration (default: 48 hours from discovery)
- **Platform Constraints**: Platform-specific rules for response generation (character limits, formatting support). Provided by Platform Adapters. v0.1: Only maxLength (Bluesky: 300 chars).
- **Two-Stage Pipeline**: Response generation architecture using two AI calls: (1) Analysis stage extracts concepts/keywords from opportunity, (2) Generation stage creates response using KB chunks found via keywords.
- **Prompt Protection**: Security mechanism using boundary markers to prevent prompt injection attacks. Untrusted opportunity text placed after `--- USER INPUT BEGINS ---` marker and treated as data, not instructions. **First-occurrence rule**: Only the first boundary marker is processed; subsequent occurrences in user content are treated as literal text, preventing "escape" attacks.
- **Response Version**: Sequential number for multiple drafts of the same opportunity. Enables "regenerate" feature and multi-draft comparison in future versions.
- **Draft**: Initial status of a generated response before user review. User can edit, post, or dismiss drafts.
- **Platform Post ID**: Platform-specific identifier for a posted response (e.g., AT URI for Bluesky: "at://did:plc:.../post/xyz"). Used for linking back to the platform post and future features (edit, delete, engagement tracking).
- **Platform Post URL**: Public, human-readable URL to view a posted response on the platform (e.g., "https://bsky.app/profile/user/post/xyz"). Clickable link in UI.
- **PostResult**: Technical term for the data returned by platform adapters after successfully posting a response (contains postId, postUrl, postedAt timestamp).
- **Setup Wizard**: Interactive CLI application that runs inside a Docker container during installation to collect and validate user credentials (Bluesky, Claude API). Writes credentials to `.env` file via mounted volume. See also: First-Launch Wizard.
- **First-Launch Wizard**: Web UI wizard that runs once on first application launch (when no Profile exists). Creates Profile, connects Bluesky account, and configures discovery schedule. Distinct from Setup Wizard (CLI) which handles credentials during installation.
- **Setup Container**: Pre-built Docker image (`ngaj/setup:latest`) containing the Node.js setup wizard. Runs temporarily during installation, then destroyed. Credentials persist on host via volume mount.
- **Platform Credentials**: Abstracted type system for multi-platform credential support. Base interface `BasePlatformCredentials` extended by platform-specific types (`BlueskyCredentials`, `LinkedInCredentials`, `RedditCredentials`). Enables adding new platforms without changing setup wizard logic.
- **AI Provider**: Abstraction for AI service credentials. v0.1: Only Anthropic (Claude). Designed for future provider support (OpenAI, Google, etc.) via `AICredentials` union type.
- **Credential Validation**: Two-phase verification during setup: (1) format validation via regex patterns, (2) connection test via API call. Failed validation re-prompts user; network errors abort setup.
- **Volume Mount**: Docker mechanism to share files between container and host. Setup container mounts `~/.ngaj:/data` to write `.env` file that persists after container exits.
- **Native Installer**: OS-specific installation package (.pkg for macOS, .msi for Windows) that bundles Docker Compose configs and post-install scripts. Downloads Docker Desktop and setup container on first run.
- **OS-Specific Scripts**: Post-install scripts written in the native scripting language of each operating system (bash for macOS, PowerShell for Windows). Handle Docker installation check, setup container launch, and production services startup.

## Development Terms

- **Agent**: Specialized development assistant (Test-Writer, Implementer, Reviewer) used in the multi-agent development workflow
- **ADR**: Architecture Decision Record documenting key technical choices

## Acronyms

- **ADR**: Architecture Decision Record
- **AI**: Artificial Intelligence
- **API**: Application Programming Interface
- **MVP**: Minimum Viable Product
- **UI**: User Interface
- **PDF**: Portable Document Format
- **RAG**: Retrieval-Augmented Generation (semantic search + LLM generation pattern)

