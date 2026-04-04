import {
  createDb,
  schema,
  type Database,
} from "@canadian-startup-jobs/db";
import * as dbExports from "@canadian-startup-jobs/db";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import fs from "node:fs";
import path from "node:path";

type RemoteConfig = {
  accountId: string;
  apiToken: string;
  databaseId: string;
};

type RuntimeEnv = Record<string, string | undefined>;

type CloudflareD1Response = {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: Array<{
    results?: unknown[] | CloudflareD1RawResult;
    meta?: Record<string, unknown>;
    success?: boolean;
  }>;
};

type CloudflareD1RawResult = {
  columns?: string[];
  rows?: unknown[][];
};

const WRANGLER_DATABASE_ID_REGEX = /"database_id"\s*:\s*"([^"]+)"/;

const globalState = globalThis as typeof globalThis & {
  __canadianStartupJobsRemoteDb?: Database;
  __canadianStartupJobsRemoteDbConfig?: RemoteConfig;
  __canadianStartupJobsDbOverrides?: Database[];
  __canadianStartupJobsEnvOverrides?: RuntimeEnv[];
};

const isDatabase = (value: unknown): value is Database =>
  !!value &&
  typeof value === "object" &&
  "select" in value &&
  "insert" in value &&
  "update" in value;

const readDatabaseIdFromWrangler = (): string | undefined => {
  try {
    const wranglerPath = path.resolve(process.cwd(), "wrangler.jsonc");
    const wranglerText = fs.readFileSync(wranglerPath, "utf8");
    return wranglerText.match(WRANGLER_DATABASE_ID_REGEX)?.[1];
  } catch {
    return undefined;
  }
};

const resolveRemoteConfig = (): RemoteConfig => {
  if (globalState.__canadianStartupJobsRemoteDbConfig) {
    return globalState.__canadianStartupJobsRemoteDbConfig;
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID ?? readDatabaseIdFromWrangler();

  if (!accountId || !apiToken || !databaseId) {
    throw new Error(
      "Missing Cloudflare D1 configuration. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN, and provide CLOUDFLARE_D1_DATABASE_ID or a server wrangler.jsonc with a D1 binding.",
    );
  }

  const config = { accountId, apiToken, databaseId };
  globalState.__canadianStartupJobsRemoteDbConfig = config;
  return config;
};

const executeRemoteQuery = async (
  statement: string,
  params: unknown[],
) => {
  const { accountId, apiToken, databaseId } = resolveRemoteConfig();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: statement,
        params,
      }),
    },
  );

  const payload = (await response.json()) as CloudflareD1Response;
  if (!response.ok || payload.success === false) {
    const message = payload.errors?.map((error) => error.message).filter(Boolean).join("; ")
      || `D1 request failed with status ${response.status}`;
    throw new Error(message);
  }

  const result = Array.isArray(payload.result) ? payload.result[0] : undefined;
  return {
    results: Array.isArray(result?.results) ? result.results : [],
    meta: result?.meta,
    success: result?.success,
  };
};

const executeRemoteRaw = async (statement: string, params: unknown[]) => {
  const { accountId, apiToken, databaseId } = resolveRemoteConfig();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/raw`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: statement,
        params,
      }),
    },
  );

  const payload = (await response.json()) as CloudflareD1Response;
  if (!response.ok || payload.success === false) {
    const message = payload.errors?.map((error) => error.message).filter(Boolean).join("; ")
      || `D1 raw request failed with status ${response.status}`;
    throw new Error(message);
  }

  const result = Array.isArray(payload.result) ? payload.result[0] : undefined;
  const rawResult = result?.results as CloudflareD1RawResult | undefined;
  return rawResult?.rows ?? [];
};

class RemoteD1PreparedStatement {
  constructor(
    private readonly statement: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...params: unknown[]) {
    return new RemoteD1PreparedStatement(this.statement, params);
  }

  async all() {
    return executeRemoteQuery(this.statement, this.params);
  }

  async raw() {
    return executeRemoteRaw(this.statement, this.params);
  }

  async run() {
    return executeRemoteQuery(this.statement, this.params);
  }
}

class RemoteD1Database {
  prepare(statement: string) {
    return new RemoteD1PreparedStatement(statement);
  }

  async batch(statements: RemoteD1PreparedStatement[]) {
    return Promise.all(statements.map((statement) => statement.all()));
  }
}

const createRemoteDb = (): Database =>
  drizzleD1(new RemoteD1Database() as any, { schema }) as Database;

const getRemoteDb = (): Database => {
  if (!globalState.__canadianStartupJobsRemoteDb) {
    globalState.__canadianStartupJobsRemoteDb = createRemoteDb();
  }
  return globalState.__canadianStartupJobsRemoteDb;
};

const getDbOverrideStack = () => {
  if (!globalState.__canadianStartupJobsDbOverrides) {
    globalState.__canadianStartupJobsDbOverrides = [];
  }

  return globalState.__canadianStartupJobsDbOverrides;
};

const getEnvOverrideStack = () => {
  if (!globalState.__canadianStartupJobsEnvOverrides) {
    globalState.__canadianStartupJobsEnvOverrides = [];
  }

  return globalState.__canadianStartupJobsEnvOverrides;
};

const getCurrentDb = (): Database => {
  const overrides = getDbOverrideStack();
  return overrides[overrides.length - 1] ?? getRemoteDb();
};

const withRuntimeDb = async <T>(database: Database, fn: () => Promise<T>) => {
  const overrides = getDbOverrideStack();
  overrides.push(database);

  try {
    return await fn();
  } finally {
    overrides.pop();
  }
};

const withRuntimeEnv = async <T>(runtimeEnv: RuntimeEnv, fn: () => Promise<T>) => {
  const overrides = getEnvOverrideStack();
  overrides.push(runtimeEnv);

  try {
    return await fn();
  } finally {
    overrides.pop();
  }
};

const withRuntimeContext = async <T>(
  context: {
    db?: Database;
    env?: RuntimeEnv;
  },
  fn: () => Promise<T>,
) => {
  const runWithEnv = async () => {
    if (context.env) {
      return await withRuntimeEnv(context.env, fn);
    }

    return await fn();
  };

  if (context.db) {
    return await withRuntimeDb(context.db, runWithEnv);
  }

  return await runWithEnv();
};

const getRuntimeEnv = (key: string) => {
  const overrides = getEnvOverrideStack();

  for (let index = overrides.length - 1; index >= 0; index -= 1) {
    const value = overrides[index]?.[key];
    if (value !== undefined) {
      return value;
    }
  }

  return process.env[key];
};

const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const currentDb = getCurrentDb() as Record<PropertyKey, unknown>;
    const value = Reflect.get(currentDb, prop, receiver);

    if (typeof value === "function") {
      return value.bind(currentDb);
    }

    return value;
  },
});

export {
  createDb,
  db,
  getRemoteDb,
  getRuntimeEnv,
  isDatabase,
  withRuntimeContext,
};

export * from "@canadian-startup-jobs/db";
export default dbExports;
