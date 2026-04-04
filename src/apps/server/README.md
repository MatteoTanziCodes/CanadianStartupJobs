# Canadian Startup Jobs - Server

The server is the backbone of the Canadian Startup Jobs platform, providing a REST API for the web application and an AI-powered agent system for automatically processing and indexing job postings from Canadian startup websites.

## Overview

The server serves two main purposes:
1. **REST API**: Provides endpoints for the web application to fetch jobs, organizations, sources, and tags
2. **AI Agent System**: Processes queued tasks to discover, extract, and index job data using LLM-powered agentsV

### Key Features

- **Hono Framework**: Lightweight, fast TypeScript web framework
- **AI-Powered Agents**: Automated job discovery and data extraction
- **Queue-Based Processing**: Background worker processes tasks asynchronously
- **Database Integration**: Seamless PostgreSQL integration via Drizzle ORM
- **Error Handling**: Structured error codes and logging
- **Crawl4AI Integration**: Local web crawling for markdown and link extraction
- **Tagging System**: Automatic categorization of jobs by experience level, industry, role, and more

## Technology Stack

- **Runtime**: Bun (preferred) or Node.js
- **Framework**: Hono
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Google AI Studio (Gemini 2.5 Pro), AI SDK
- **Scraping**: Crawl4AI
- **Queue**: Custom database-backed queue system
- **Validation**: Zod
- **Language**: TypeScript

## Project Structure

```
src/
├── index.ts                    # Server entry point (Hono app)
├── workers/
│   ├── llmCallWorker.ts        # Background worker implementation
│   ├── runWorker.ts            # Worker startup script
│   └── llmCallWorker.md        # Worker documentation
├── routes/                     # API endpoints
│   ├── jobs/                   # Job listing/creation endpoints
│   ├── organizations/          # Organization endpoints
│   ├── sources/                # Source management endpoints
│   ├── tags/                   # Tag/category endpoints
│   └── types/                  # Shared route types
├── lib/
│   ├── ai/                     # AI agent system
│   │   ├── agents/             # Agent implementations
│   │   │   ├── major/          # Complex, multi-step agents
│   │   │   └── minor/          # Focused, single-task agents
│   │   ├── prompts/            # AI prompts for agents
│   │   ├── tools/              # AI tools (DB operations, crawling)
│   │   ├── functions/          # Reusable AI functions
│   │   ├── observability.ts    # Logging and monitoring
│   │   └── index.ts
│   ├── db/                     # Database functions
│   │   ├── functions/          # Business logic functions
│   │   │   ├── jobs/           # Job CRUD operations
│   │   │   ├── organizations/  # Organization CRUD operations
│   │   │   ├── sources/        # Source CRUD operations
│   │   │   ├── tags/           # Tag CRUD operations
│   │   │   ├── queues/         # Queue management
│   │   │   ├── calls/          # Agent call tracking
│   │   │   └── pivots/         # Many-to-many operations
│   │   └── generators/         # Code generation scripts
│   ├── firecrawl/              # Crawl4AI-backed crawling wrapper
│   │   ├── client.ts           # Client configuration
│   │   ├── config.ts           # API key management
│   │   └── functions/          # Scraping utilities
│   └── errors/                 # Error handling
│       ├── AppError.ts         # Custom error class
│       ├── codes.ts            # Error code definitions
│       └── handler.ts          # Error response formatting
└── scripts/                    # Utility scripts
    ├── 1-add-vc.ts            # Add venture capital data
    ├── 2-add-org.ts           # Add organization
    ├── 3-add-job.ts           # Add job
    ├── 4-vc-to-orgs.ts        # Link VCs to organizations
    ├── createJobPivotFunctions.ts   # Generate job pivot functions
    ├── createOrgPivotFunctions.ts   # Generate org pivot functions
    ├── createTagFunctions.ts        # Generate tag functions
    ├── queue-source.ts        # Queue a source for processing
    └── runWorker.ts           # Worker entry point
```

## Quick Start

### Prerequisites

- Bun runtime
- Docker (for PostgreSQL and Redis)
- Database schema already migrated
- Environment variables configured

### Development

```bash
# Start server in development mode (with hot reload)
bun dev

# Server will run on http://localhost:3050
```

### Production

```bash
# Build dependencies
bun --filter '@canadian-startup-jobs/db' build

# Start server
bun run src/index.ts
```

## API Endpoints

### Jobs

```
GET    /jobs                    # List jobs with pagination and filtering
GET    /jobs/:id                # Get single job with rich data
POST   /jobs                    # Create a new job
```

**Query Parameters (GET /jobs)**:
- `skip`: Number of jobs to skip (default: 0)
- `take`: Number of jobs to return (default: 10)
- `provinceId`: Filter by province
- `jobTypeId`: Filter by job type
- `experienceLevelId`: Filter by experience level
- `industryId`: Filter by industry
- `roleId`: Filter by role

### Organizations

```
GET    /organizations           # List organizations
GET    /organizations/:id       # Get single organization
POST   /organizations           # Create organization
```

### Sources

```
GET    /sources                 # List job board sources
GET    /sources/:id             # Get single source
POST   /sources                 # Create source
```

### Tags

Tag endpoints are organized by category:

```
GET    /tags/provinces          # List Canadian provinces
GET    /tags/industries         # List industries
GET    /tags/job-types          # List job types (full-time, contract, etc.)
GET    /tags/roles              # List job roles (developer, designer, etc.)
GET    /tags/experience-levels  # List experience levels
GET    /tags/raising-stage      # List company raising stages
GET    /tags/team-size          # List team size ranges
```

## AI Agent System

The server includes a sophisticated AI agent system for automatically discovering and processing job data.

### Major Agents

Complex agents that orchestrate multiple steps:

1. **jobAgent**: Extracts structured job data from URLs
   - Fetches job posting page
   - Discovers job information using AI
   - Extracts structured data
   - Creates job record in database
   - Links to organization
   - Tags job with categories
   - Caches job content

2. **organizationAgent**: Processes company information
   - Scrapes organization website
   - Extracts company details
   - Creates organization record
   - Tags organization by industry, size, stage
   - Discovers job board links

3. **jobBoardAgent**: Processes job boards
   - Scrapes job board listings
   - Discovers individual job postings
   - Queues each job for processing

4. **portfolioLinksAgent**: Processes VC portfolio companies
   - Scrapes VC portfolio pages
   - Discovers startup companies
   - Queues organizations for processing

5. **sourceAgent**: Processes general sources
   - Handles various source types
   - Extracts and queues relevant data

### Minor Agents

Focused agents for single tasks:

- **jobTaggingAgent**: Tags jobs with categories (experience, industry, role, etc.)
- **orgTaggingAgent**: Tags organizations with metadata
- **siteExplorationAgent**: Explores websites to discover links and structure

### Agent Workflow

```
1. Item queued in database
2. Worker picks up queued item
3. Major agent executes with AI tools
4. Minor agents called as needed
5. Results stored in database
6. New items may be queued
7. Error handling and retries
```

### Queue Processing

The worker system processes items in priority order:
1. jobAgent (highest)
2. jobBoardAgent
3. organizationAgent
4. portfolioLinksAgent
5. sourceAgent (lowest)

## Worker System

### Starting the Worker

```bash
# From the server directory
bun run src/scripts/runWorker.ts

# Or using the workspace script
cd ../../
bun server:run-worker
```

### Worker Configuration

The worker supports configuration:

```typescript
{
  pollIntervalMs?: number;      // How often to check queue (default: 2000ms)
  rateLimitPerSec?: number;     // Max requests per second (default: 2)
}
```

### Worker Behavior

- Polls database for queued items
- Processes items with priority ordering
- Implements rate limiting to avoid API abuse
- Automatic retry logic for failed items
- Graceful shutdown on SIGTERM/SIGINT
- Resets stuck jobs on startup

### Queue Item Structure

```typescript
{
  id: number;
  agent: string;              // Agent name (e.g., "jobAgent")
  payload: object;            // Agent-specific payload
  status: "queued" | "in_progress" | "completed" | "failed";
  priority: number;           // Higher = processed first
  retryCount: number;         // Current retry count
  maxRetries: number;         // Maximum retry attempts
}
```

## Scripts

### Development Scripts

```bash
bun dev              # Start server with hot reload
bun gen:tags         # Generate tag functions from schema
bun gen:piv:jobs     # Generate job pivot functions
bun gen:piv:orgs     # Generate org pivot functions
bun queue-source     # Queue a source for processing
```

### Utility Scripts

Located in `src/scripts/`:

- **1-add-vc.ts**: Add venture capital firm data
- **2-add-org.ts**: Add organization manually
- **3-add-job.ts**: Add job manually
- **4-vc-to-orgs.ts**: Link VCs to their portfolio companies
- **createJobPivotFunctions.ts**: Generate code for job tag relationships
- **createOrgPivotFunctions.ts**: Generate code for org tag relationships
- **createTagFunctions.ts**: Generate tag CRUD functions
- **queue-source.ts**: Add a source to the processing queue

### Running Scripts

```bash
bun run src/scripts/<script-name>.ts
```

## Environment Variables

Required environment variables:

```bash
# Cloudflare D1 access for local scripts / workers
CLOUDFLARE_ACCOUNT_ID=xxxxx
CLOUDFLARE_API_TOKEN=xxxxx
CLOUDFLARE_D1_DATABASE_ID=6528375b-dec8-4b6b-a1dc-ce3cdcf4b120

# Crawl4AI bridge uses local Python + Playwright
# Optional if "python" is not the right binary on your machine
CRAWL4AI_PYTHON_BIN=python

# Anthropic (for Claude)
ANTHROPIC_API_KEY=xxxxx
ANTHROPIC_FAST_MODEL=claude-3-haiku-20240307
ANTHROPIC_MAIN_MODEL=claude-sonnet-4-20250514

# CORS origins (optional, default: localhost:3000, localhost:3001)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Database Integration

### Schema

The server uses the shared database package `@canadian-startup-jobs/db`. Schema is defined in:
`packages/db/src/schema/`

### Common Tables

- **jobs**: Job listings
- **organizations**: Company information
- **sources**: Job board and website sources
- **queues**: Agent task queue
- **calls**: Agent call history and logs
- **Tag tables**: provinces, industries, roles, job types, etc.
- **Pivot tables**: Many-to-many relationships (e.g., `jobsProvinces`)

### Database Functions

Located in `src/lib/db/functions/`:

- **jobs/**: Job CRUD operations with rich data
- **organizations/**: Organization CRUD operations
- **sources/**: Source CRUD operations
- **tags/**: Tag CRUD operations
- **queues/**: Queue management (add, update, get next)
- **calls/**: Agent call tracking
- **pivots/**: Pivot table operations

## Error Handling

### Error Codes

All errors use structured error codes defined in `lib/errors/codes.ts`:

```typescript
INTERNAL_SERVER_ERROR
VALIDATION_ERROR
CACHE_FETCH_FAILED
DB_INSERT_FAILED
DB_QUERY_FAILED
FC_MARKDOWN_FAILED          // Firecrawl markdown failure
FC_LINKS_FAILED             // Firecrawl links failure
AI_OBJECT_CREATION_FAILED   // LLM extraction failure
SCHEMA_PARSE_FAILED         // Schema validation failure
```

### Custom Error Class

```typescript
throw new AppError(
  ERROR_CODES.DB_INSERT_FAILED,
  "Failed to insert job",
  { jobId: 123 }  // Optional metadata
);
```

### Error Response Format

API errors return structured responses:

```json
{
  "error": "Failed to create job",
  "code": "DB_INSERT_FAILED",
  "issues": [...]  // Validation issues (if applicable)
}
```

## AI Tools

The agent system provides specialized AI tools:

### Crawling Tools
- `readPage`: Fetch markdown and links from a URL
- `searchSite`: Search a website for specific content

### Database Tools
- `findJobById`: Look up job in database
- `findOrgById`: Look up organization in database
- `findSourceById`: Look up source in database

### Data Tools
- `extractJobData`: Parse job posting content

## Observability & Logging

### Agent Logs

All agent executions produce detailed logs including:
- Start/end timestamps
- Input payload
- Steps taken
- AI API usage (token counts)
- Errors encountered
- Output results

### Viewing Logs

Logs are written to the `calls` table:
```sql
SELECT * FROM calls ORDER BY created_at DESC LIMIT 10;
```

### Observability Helper

The `observability.ts` module provides:
- `logGeneric()`: Generic logging function
- Usage tracking for AI APIs
- Structured error logging

## CORS Configuration

The server is configured to allow CORS from:

- `http://localhost:3000` (Next.js web app)
- `http://localhost:3001` (Alternative frontend)

Modify the CORS origins in `src/index.ts` as needed.

## Troubleshooting

### Worker Issues

**Worker won't start:**
- Check if worker is already running: `ps aux | grep worker`
- Reset stuck jobs: Database query to set status to "queued"

**Items stuck in queue:**
- Check the worker logs for errors
- Verify AI API credentials are valid
- Check Firecrawl API quota

### Database Issues

**Migration fails:**
- Use `db:push` from the db package as escape hatch
- Verify DATABASE_URL is correct
- Check PostgreSQL container is running

**Connection issues:**
- Ensure Docker services are running: `docker-compose ps`
- Verify port 5433 is available

### API Issues

**CORS errors:**
- Check CORS configuration in `src/index.ts`
- Verify frontend origin matches

**Rate limiting:**
- Adjust `rateLimitPerSec` in worker configuration
- Check API quotas for Firecrawl and AI services

### AI Agent Issues

**Agent failures:**
- Check `calls` table for error details
- Verify prompt templates in `lib/ai/prompts/`
- Test Firecrawl scraping separately

**Poor extraction quality:**
- Review and improve prompt templates
- Add more examples to prompts
- Consider using different LLM models

## Performance Considerations

### Rate Limiting

The worker enforces rate limiting to:
- Avoid hitting AI API limits
- Prevent Firecrawl quota exhaustion
- Manage database load

### Caching

Job posting content is cached for 7 days to:
- Reduce Firecrawl API calls
- Improve processing speed
- Allow re-tagging without re-scraping

### Pagination

API endpoints support pagination to:
- Limit response size
- Improve frontend performance
- Reduce database load

## Development Best Practices

### Adding New Agents

1. Create agent function in `lib/ai/agents/major/` or `minor/`
2. Define payload schema with Zod
3. Register agent in `lib/ai/agents/dictionary.ts`
4. Create documentation (`.md`) file
5. Add to queue processing priority list if major agent

### Adding API Endpoints

1. Create route file in `routes/`
2. Implement CRUD functions in `lib/db/functions/`
3. Add validation with Zod schemas
4. Include error handling with AppError
5. Add to main router in `index.ts`

### Database Changes

1. Update schema in `packages/db/src/schema/`
2. Generate migration: `bun db:generate`
3. Review and apply: `bun db:migrate`
4. Update TypeScript types
5. Update CRUD functions

## Deployment

### Environment Setup

1. Set required environment variables
2. Ensure database is migrated to latest schema
3. Configure CORS origins for production
4. Set appropriate rate limits

### Production Considerations

- Use process manager (PM2, systemd) for worker
- Implement health check endpoint
- Set up log aggregation
- Monitor AI API usage and costs
- Configure database connection pooling
- Enable HTTPS with proper certificates

### Scaling

- **API Server**: Horizontal scaling with load balancer
- **Worker**: Multiple worker instances with same queue
- **Database**: Read replicas for queries, write to primary
- **Cache**: Redis for frequently accessed data

## Cost Management

### AI API Costs

Track usage in the `calls` table:
```sql
SELECT agent, SUM(usage->>'tokens') as total_tokens
FROM calls
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY agent;
```

### Firecrawl Costs

Approximately $0.012 USD per request.
Monitor usage and implement caching to reduce costs.

## Contributing

When contributing to the server:

1. **Testing**: Manual testing of new features
2. **Documentation**: Update README and inline comments
3. **Error Handling**: Always use AppError with proper codes
4. **Validation**: Use Zod schemas for all inputs
5. **Logging**: Add structured logs for debugging

## Support

For issues or questions:
- Check the worker logs
- Review the `calls` table for agent execution details
- Consult agent documentation in `lib/ai/agents/major/*.md`
- Join the Build Canada Discord community

---

**Server Port**: 3050
**Default Worker Poll Interval**: 2000ms
**Default Rate Limit**: 2 requests/second
**Job Cache TTL**: 7 days
