import { sourceAgent, sourceAgentPayloadSchema } from "./major/sourceAgent";
import { organizationAgent, organizationAgentPayloadSchema } from "./major/organizationAgent";
import { qualificationAgent, qualificationAgentPayloadSchema } from "./major/qualificationAgent";
import { portfolioLinksAgent, portfolioLinksAgentPayloadSchema } from "./major/portfolioLinksAgent";
import { jobAgent, jobAgentPayloadSchema } from "./major/jobAgent";
import { jobBoardAgent, jobBoardAgentPayloadSchema } from "./major/jobBoardAgent";
import z from "zod";
import type { AgentHelpers, AgentResult } from "./helpers/types";

export const agentNamesSchema = z.enum(["sourceAgent", "organizationAgent", "qualificationAgent", "portfolioLinksAgent", "jobAgent", "jobBoardAgent"]);
export type AgentNames = z.infer<typeof agentNamesSchema>;

export interface AgentEntry {
  function: (queuedItem: any, helpers: AgentHelpers) => Promise<AgentResult>;
  schema: z.ZodSchema;
}

export const getAgent = (agentName: AgentNames): AgentEntry => {
  switch (agentName) {
    case "sourceAgent":
      return {
        function: sourceAgent,
        schema: sourceAgentPayloadSchema,
      };
    case "organizationAgent":
      return {
        function: organizationAgent,
        schema: organizationAgentPayloadSchema,
      };
    case "qualificationAgent":
      return {
        function: qualificationAgent,
        schema: qualificationAgentPayloadSchema,
      };
    case "portfolioLinksAgent":
      return {
        function: portfolioLinksAgent,
        schema: portfolioLinksAgentPayloadSchema,
      };
    case "jobAgent":
      return {
        function: jobAgent,
        schema: jobAgentPayloadSchema,
      };
    case "jobBoardAgent":
      return {
        function: jobBoardAgent,
        schema: jobBoardAgentPayloadSchema,
      };
    default:
      throw new Error(`Unknown agent: ${agentName}`);
  }
};

export type { AgentHelpers, AgentResult };
