// @ts-ignore `.open-next/worker.js` is generated at build time
import nextWorker, {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";
import apiWorker from "../server/src/index";

const API_PREFIX = "/api/v1";
const ADMIN_PREFIX = "/admin";

const isApiHost = (hostname: string) => hostname === "canadianstartupjobs-api.matteo-tanzi.dev";

const createApiRequest = (request: Request) => {
  const url = new URL(request.url);

  if (isApiHost(url.hostname)) {
    return request;
  }

  if (url.pathname.startsWith(ADMIN_PREFIX)) {
    return request;
  }

  if (!url.pathname.startsWith(API_PREFIX)) {
    return null;
  }

  url.pathname = url.pathname.slice(API_PREFIX.length) || "/";
  return new Request(url.toString(), request);
};

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    const apiRequest = createApiRequest(request);
    if (apiRequest) {
      return apiWorker.fetch(apiRequest, env as never, ctx);
    }

    return nextWorker.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledController, env: unknown, ctx: ExecutionContext) {
    if (typeof apiWorker.scheduled === "function") {
      return apiWorker.scheduled(event, env as never, ctx);
    }
  },
} satisfies ExportedHandler;

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };
