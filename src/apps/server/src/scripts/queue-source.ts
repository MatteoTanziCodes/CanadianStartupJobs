import { addToQueue } from "@/lib/db/functions/queues";
import { DEFAULT_SOURCES, type SourceConfig } from "@/lib/pipeline/defaultSources";
import { runWorker } from "@/workers/runWorker";

// Helper function to validate URLs
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Queue a source for processing
const queueSource = async (source: SourceConfig) => {
  if (!isValidUrl(source.home)) {
    throw new Error(`Invalid home URL: ${source.home}`);
  }
  if (!isValidUrl(source.portfolio)) {
    throw new Error(`Invalid portfolio URL: ${source.portfolio}`);
  }

  console.log(`\n📋 Queueing source: ${source.name}`);
  console.log(`   Home: ${source.home}`);
  console.log(`   Portfolio: ${source.portfolio}`);

  const queuedItem = await addToQueue({
    payload: {
      home: source.home,
      portfolio: source.portfolio,
      kind: source.kind,
    },
    agent: "sourceAgent",
  });

  console.log(`   ✅ Queued as job #${queuedItem.id}`);
  return queuedItem.id;
};

// Process sources: queue them and start the worker
const processSources = async (sources: SourceConfig[]) => {
  console.log("🚀 Starting Canadian Startup Jobs Pipeline");
  console.log("=" .repeat(50));

  // Queue all sources
  const jobIds: number[] = [];
  for (const source of sources) {
    try {
      const jobId = await queueSource(source);
      jobIds.push(jobId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ Failed to queue ${source.name}: ${errorMessage}`);
    }
  }

  console.log("\n" + "=" .repeat(50));
  console.log(`📊 Summary: ${jobIds.length} sources queued for processing`);
  console.log("   Job IDs:", jobIds.join(", "));

  runWorker({
    pollIntervalMs: 2000,
    rateLimitPerSec: 2,
  });
};

// Main function
const main = async () => {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments: process all predefined sources
    await processSources(DEFAULT_SOURCES);
  } else if (args.length === 2) {
    // Two arguments: custom home and portfolio URLs
    const [home, portfolio] = args;
    await processSources([{ name: "Custom Source", home, portfolio, kind: "curated_directory" }]);
  } else if (args[0] === "--help" || args[0] === "-h") {
    console.log(`
Usage:
  bun run queue-source                          # Queue all predefined VC sources
  bun run queue-source <home> <portfolio>       # Queue a custom source

Examples:
  bun run queue-source
  bun run queue-source https://example.com https://example.com/portfolio

Predefined sources:
${DEFAULT_SOURCES.map(s => `  - ${s.name}`).join("\n")}
    `);
    process.exit(0);
  } else {
    console.error("❌ Invalid arguments. Use --help for usage information.");
    process.exit(1);
  }
};

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
