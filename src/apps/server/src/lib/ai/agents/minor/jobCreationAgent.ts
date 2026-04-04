import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { claudeMain } from "@/lib/ai/models";
import { readPage, searchSite, jobTools } from "@/lib/ai/tools";
import { observePrepareSteps } from "@/lib/ai/observability";

export const jobCreationAgent = new Agent({
  model: claudeMain(),
})
