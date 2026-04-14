import { seedDefaultOrganizations } from "@/lib/pipeline/seed";
import { runWorker } from "@/workers/runWorker";

const main = async () => {
  const result = await seedDefaultOrganizations();

  console.log("Seeded organization dataset:");
  console.log(JSON.stringify(result, null, 2));

  runWorker({
    pollIntervalMs: 2000,
    rateLimitPerSec: 2,
  });
};

main().catch((err) => {
  console.error("Failed to seed organizations:", err);
  process.exit(1);
});
