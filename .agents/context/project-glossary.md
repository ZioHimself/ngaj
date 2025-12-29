# ngaj Project Glossary

## Core Domain Terms

- **Opportunity**: A discovered social media post that matches user interests and could be a good engagement target
- **Discovery**: Automated process of finding relevant social media posts based on user-configured interests and keywords
- **Knowledge Base**: Collection of user's uploaded reference materials (PDFs, markdown, text files) used to ground AI responses
- **Response**: AI-generated suggested reply to an opportunity, grounded in the user's knowledge base and voice
- **Engagement**: The act of responding to or interacting with social media posts
- **Voice**: User's tone, style, and communication preferences used to guide AI response generation
- **Platform**: Social media service (e.g., Bluesky, LinkedIn, Reddit) that ngaj integrates with
- **Scoring**: Algorithm that ranks opportunities by relevance using impact, recency, and keyword matching
- **Queue**: Prioritized list of pending opportunities awaiting user review

## Technical Terms

- **Embedding**: Vector representation of text chunks used for semantic similarity search
- **Vector Store**: Database (ChromaDB) that stores and queries document embeddings
- **Chunk**: Segment of a document (~500 tokens) created during knowledge base processing
- **Cron Job**: Scheduled task that runs discovery at regular intervals
- **AT Protocol**: Bluesky's underlying protocol for decentralized social networking
- **Local-First**: Architecture principle where all data and processing stays on the user's machine
- **Draft**: Initial status of a generated response before user review and posting

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
