# Source Agent

The `sourceAgent` is responsible for discovering and extracting startup information from a company's website. It scrapes the home and portfolio pages, uses an LLM to extract structured data about the startup, creates a portfolio cache entry, and links everything together.

## Overview

The agent performs a three-step workflow:

1. **Fetch** home and portfolio pages via Firecrawl
2. **Extract** source data from the home page using an LLM (Gemini 2.5 Flash)
3. **Create** a portfolio cache entry and link it to the source

## Location

`apps/server/src/lib/ai/agents/major/sourceAgent.ts`

## Input Schema (Payload)

```typescript
{
  home: URL;      // Company homepage URL
  portfolio: URL; // Portfolio/jobs URL
}
```

## Workflow

### Step 1: Fetch Pages

The agent fetches both the home page and portfolio page using Firecrawl:

```typescript
const homeDoc = await getDoc(payload.home);       // markdown + links
const portfolioDoc = await getDoc(payload.portfolio); // markdown + links
```

Both markdown and links are returned and stored in the final result.

### Step 2: Create Source from Home Page

The agent uses `generateObject` with Gemini 2.5 Flash to extract structured data from the home page markdown:

```typescript
const objectData = await generateObject({
  model: claudeFast(),
  schema: schemas.sources.insert.omit({ id, createdAt, updatedAt }),
  prompt: prompts.getNewSource(markdown, url, portfolio),
});
```

The LLM extracts fields like:
- `name` - Company name
- `description` - Company description
- `website` - Website URL (set from payload)
- `portfolio` - Portfolio URL (set from payload)
- And other source schema fields

The extracted object is inserted into the `sources` table.

### Step 3: Create Portfolio Cache

The portfolio page HTML is fetched, hashed with SHA256, and stored in the `portfolioCaches` table with a 7-day freshness window:

```typescript
const htmlPayload = await fetch(url);
const hasher = new SHA256();
const hash = hasher.digest(await htmlPayload.bytes());
const args = {
  url,
  freshTil: now + (7 * 24 * 60 * 60 * 1000), // 7 days
  lastHash: hash.toString(),
};
```

### Step 4: Connect Source to Portfolio Cache

A pivot table entry is created in `sourcesPortfolioCaches` linking the source to the portfolio cache:

```typescript
await connectSourceToPortfolioCache(sourceId, cacheId);
```

## Output

The agent returns an `AgentResult` with the following structure:

```typescript
{
  usage: unknown[],  // Array of AI SDK usage objects (token counts, etc.)
  logs: string[],    // Execution log messages
  result: {
    source: {
      id: number;
      name: string;
      website: string;
    };
    portfolioCache: {
      id: number;
      url: string;
    };
    home: {
      markdown: string;
      links: unknown[];
    };
    portfolio: {
      markdown: string;
      links: unknown[];
    };
  };
  errors: Array<{ message: string; stack?: string }>;
}
```

## Dependencies

- **Crawl4AI bridge** - Local crawling for markdown and link extraction
- **AI SDK** (`ai`) - LLM integration with `generateObject`
- **AI SDK Anthropic** (`@ai-sdk/anthropic`) - Claude model provider
- **Drizzle ORM** - Database operations
- **Bun** (`SHA256`) - Hashing for portfolio cache
- **Zod** - Payload schema validation

## Usage Tracking

The agent tracks LLM token usage by capturing the `usage` property from `generateObject` responses and pushing it to the `usage` array. This data is stored in the `llm-calls` database table for cost modeling.

```typescript
if (objectData.usage) {
  usage.push(objectData.usage);
}
```

## Error Handling

The agent uses `AppError` for all error conditions with specific error codes:

- `FC_MARKDOWN_FAILED` - Firecrawl failed to return markdown
- `FC_LINKS_FAILED` - Firecrawl failed to return links
- `AI_OBJECT_CREATION_FAILED` - LLM failed to extract object
- `DB_INSERT_FAILED` - Database insert failed
- `SCHEMA_PARSE_FAILED` - Schema validation failed

All errors are caught in a try/catch block and returned in the `errors` array of the `AgentResult`. The `updateCall` helper is called with error details if `parentCallId` exists.

## Enqueuing

To enqueue a sourceAgent task:

```typescript
import { addToQueue } from "@/lib/db/functions/queues";

await addToQueue({
  payload: {
    home: "https://example.com",
    portfolio: "https://example.com/careers",
  },
  agent: "sourceAgent",
  maxRetries: 3,
});
```

## Registration

The agent is registered in `apps/server/src/lib/ai/agents/dictionary.ts`:

```typescript
case "sourceAgent":
  return {
    function: sourceAgent,
    schema: sourceAgentPayloadSchema,
  };
```

## Example Execution Log

```
sourceAgent: started
queueItemId: 123
parentCallId: 456
home: https://example.com
portfolio: https://example.com/careers
Fetching home page...
Fetched home page: 15234 chars, 45 links
Fetching portfolio page...
Fetched portfolio: 8921 chars, 32 links
Creating source from home page markdown...
Created source: 789 - Acme Corp
Creating portfolio cache...
Created portfolio cache: 345
Connecting source to portfolio cache...
Connected source 789 to portfolio cache 345
```

## Related Files

- `apps/server/src/workers/llmCallWorker.ts` - Worker that processes queued tasks
- `apps/server/src/lib/ai/agents/dictionary.ts` - Agent registry
- `apps/server/src/lib/ai/agents/helpers/types.ts` - Agent helpers and result types
- `apps/server/src/lib/ai/prompts/index.ts` - LLM prompts for extraction
- `apps/server/src/db/functions/queues/index.ts` - Queue operations
- `apps/server/src/db/functions/calls/index.ts` - Call persistence operations
