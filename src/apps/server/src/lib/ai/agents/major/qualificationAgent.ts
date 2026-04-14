import { generateObject, generateText } from "ai";
import { claudeMain } from "@/lib/ai/models";
import { prompts } from "@/lib/ai/prompts";
import { observePrepareSteps } from "@/lib/ai/observability";
import { readPage, searchSite } from "@/lib/ai/tools";
import { fetchCachedPage } from "@/lib/cache/pages";
import { discoverCareersEndpoints } from "@/lib/discovery/careers";
import {
  updateOrganizationCareersDiscovery,
  updateOrganizationQualification,
} from "@/lib/pipeline/organizations";
import { z } from "zod";
import type { AgentHelpers, AgentResult } from "../helpers/types";
import type { QueuedItem } from "@/lib/db/functions/queues";

const preFetchedDataSchema = z.object({
  url: z.string(),
  markdown: z.string(),
  links: z.array(z.string()),
  pulledAt: z.number(),
  freshTil: z.number(),
});

const qualificationAgentPayloadSchema = z.object({
  organizationId: z.number(),
  name: z.string(),
  url: z.url(),
  careersPage: z.url().optional(),
  preFetchedData: preFetchedDataSchema.optional(),
});

type QualificationAgentPayloadArgs = z.infer<typeof qualificationAgentPayloadSchema>;

const qualificationSchema = z.object({
  qualificationStatus: z.enum(["qualified", "review", "rejected"]),
  ownershipStatus: z.enum(["canadian_owned", "foreign_owned", "unclear"]),
  operationsStatus: z.enum(["canadian_operated", "not_canadian_operated", "unclear"]),
  canadianConfidence: z.number().min(0).max(100),
  evidenceSummary: z.string(),
  evidenceUrls: z.array(z.string()).default([]),
  reviewReason: z.string().optional(),
});

const getHomePage = async (url: string, preFetchedData?: z.infer<typeof preFetchedDataSchema>) => {
  if (preFetchedData) {
    const now = Date.now();
    if (preFetchedData.pulledAt <= now && now <= preFetchedData.freshTil) {
      return {
        markdown: preFetchedData.markdown,
        links: preFetchedData.links,
        source: "prefetched" as const,
      };
    }
  }

  return await fetchCachedPage({
    url,
    kind: "organization_home",
    ttlMs: 24 * 60 * 60 * 1000,
  });
};

const getQualificationResearch = async (args: {
  name: string;
  website: string;
  careersPage?: string;
  markdown: string;
  links: string[];
}) =>
  await generateText({
    model: claudeMain(),
    prompt: prompts.investigateOrganizationQualification(args),
    tools: {
      readPage,
      searchSite,
    },
    prepareStep: observePrepareSteps("Organization Qualification"),
  });

const qualificationAgent = async (
  queuedItem: QueuedItem,
  helpers: AgentHelpers,
): Promise<AgentResult> => {
  const { payload } = queuedItem as unknown as { payload: QualificationAgentPayloadArgs };
  const logs: string[] = [
    "qualificationAgent: started",
    `queueItemId: ${queuedItem.id}`,
    `organizationId: ${payload.organizationId}`,
    `url: ${payload.url}`,
  ];
  const usage: unknown[] = [];
  const childQueueItems: Array<{ payload: unknown; agent: string; maxRetries?: number }> = [];

  try {
    const homeDoc = await getHomePage(payload.url, payload.preFetchedData);
    logs.push(`Qualification page loaded from ${homeDoc.source}`);

    const careersDiscovery = await discoverCareersEndpoints({
      websiteUrl: payload.url,
      hintUrl: payload.careersPage,
      homeLinks: homeDoc.links,
    });
    logs.push(
      `Careers discovery: ${careersDiscovery.candidates.length} candidates, best=${careersDiscovery.bestUrl ?? "none"}, confidence=${careersDiscovery.confidence}`,
    );

    await updateOrganizationCareersDiscovery({
      organizationId: payload.organizationId,
      careersPage: careersDiscovery.bestUrl,
      careersCandidates: careersDiscovery.candidates,
      careersProvider: careersDiscovery.provider,
      careersDiscoveryMethod: careersDiscovery.discoveryMethod,
      careersConfidence: careersDiscovery.confidence,
      lastCareersValidatedAt: careersDiscovery.bestUrl ? new Date() : null,
    });

    const research = await getQualificationResearch({
      name: payload.name,
      website: payload.url,
      careersPage: careersDiscovery.bestUrl ?? payload.careersPage,
      markdown: homeDoc.markdown,
      links: homeDoc.links,
    });
    if (research.usage) usage.push(research.usage);

    const decision = await generateObject({
      model: claudeMain(),
      schema: qualificationSchema,
      prompt: prompts.classifyOrganizationQualification({
        name: payload.name,
        website: payload.url,
        research: research.text,
      }),
    });

    if (decision.usage) usage.push(decision.usage);
    if (!decision.object) {
      throw new Error(`Failed to classify qualification for ${payload.url}`);
    }

    const normalizedDecision = {
      qualificationStatus: decision.object.qualificationStatus,
      ownershipStatus: decision.object.ownershipStatus,
      operationsStatus: decision.object.operationsStatus,
      canadianConfidence: Math.round(decision.object.canadianConfidence),
      qualificationEvidenceSummary: decision.object.evidenceSummary,
      evidenceUrls: decision.object.evidenceUrls,
      reviewReason:
        decision.object.qualificationStatus === "review"
          ? (decision.object.reviewReason ?? "Requires manual qualification review")
          : decision.object.reviewReason ?? null,
    };

    const updatedOrganization = await updateOrganizationQualification({
      organizationId: payload.organizationId,
      ...normalizedDecision,
    });

    logs.push(`Qualification status: ${updatedOrganization.qualificationStatus} (${updatedOrganization.canadianConfidence})`);

    if (updatedOrganization.qualificationStatus === "qualified") {
      const careersPageData = careersDiscovery.preFetchedData ?? null;
      if (!careersDiscovery.bestUrl || !careersPageData) {
        logs.push("No validated careers endpoint found for otherwise qualified organization");
      } else {
        logs.push(`Validated careers endpoint for ${payload.name}: ${careersDiscovery.bestUrl}`);
      }

      if (careersPageData) {
        childQueueItems.push({
          payload: {
            organizationId: payload.organizationId,
            careersUrl: careersDiscovery.bestUrl,
            companyName: payload.name,
            preFetchedData: careersPageData,
          },
          agent: "jobBoardAgent",
          maxRetries: 3,
        });
        logs.push(`Queued jobBoardAgent for qualified organization ${payload.name}`);
      }
    }

    const result = {
      organizationId: payload.organizationId,
      qualification: normalizedDecision,
      careersDiscovery: {
        bestUrl: careersDiscovery.bestUrl,
        provider: careersDiscovery.provider,
        discoveryMethod: careersDiscovery.discoveryMethod,
        confidence: careersDiscovery.confidence,
        candidates: careersDiscovery.validatedCandidates,
      },
      research: research.text.slice(0, 2_500),
    };

    if (helpers.parentCallId) {
      try {
        await helpers.updateCall({
          id: helpers.parentCallId,
          usage,
          logs,
          result,
          errors: [],
        });
      } catch (updateErr) {
        logs.push(`Call update failed: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`);
      }
    }

    return {
      usage,
      logs,
      result,
      errors: [],
      childQueueItems,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    logs.push(`Error: ${errorMessage}`);

    if (helpers.parentCallId) {
      try {
        await helpers.updateCall({
          id: helpers.parentCallId,
          usage,
          logs,
          result: null,
          errors: [{ message: errorMessage, stack: errorStack }],
        });
      } catch (updateErr) {
        logs.push(`Call update failed: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`);
      }
    }

    return {
      usage,
      logs,
      result: null,
      errors: [{ message: errorMessage, stack: errorStack }],
    };
  }
};

export { qualificationAgent, qualificationAgentPayloadSchema, type QualificationAgentPayloadArgs };
