import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { claudeMain } from "@/lib/ai/models";
import { readPage, searchSite, orgTools } from "@/lib/ai/tools";
import { observePrepareSteps } from "@/lib/ai/observability";

export const orgTaggingAgent = new Agent({
  model: claudeMain(),
  tools: {
    readPage,
    searchSite,
    listTags: orgTools.tags.list,
    createTag: orgTools.tags.create,
    connectOrganizationToTag: orgTools.tags.connect
  },
  stopWhen: stepCountIs(10),
  prepareStep: observePrepareSteps("Organization Tagging")
});
