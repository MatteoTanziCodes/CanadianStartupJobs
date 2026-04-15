import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { claudeMain } from "@/lib/ai/models";
import { readPage, searchSite, jobTools } from "@/lib/ai/tools";
import { observePrepareSteps } from "@/lib/ai/observability";

export const jobTaggingAgent = new Agent({
  model: claudeMain(),
  tools: {
    readPage,
    searchSite,
    listTags: jobTools.tags.list,
    createTag: jobTools.tags.create,
    connectJobToTag: jobTools.tags.connect
  },
  stopWhen: stepCountIs(10),
  prepareStep: observePrepareSteps("Job Tagging")
});
