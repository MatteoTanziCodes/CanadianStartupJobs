import { generateText } from "ai";
import { claudeMain } from "@/lib/ai/models";
import { prompts } from '@/lib/ai/prompts';
import { readPage, searchSite } from "@/lib/ai/tools";
import { observePrepareSteps } from "@/lib/ai/observability";
import { z } from "zod";


export enum SiteExplorationTask {
  DISCOVER_ORGANIZATION = "DISCOVER_ORGANIZATION",
  DISCOVER_SOURCE = "DISCOVER_SOURCE",
}

export const SiteExplorationSchema = z.object({
  markdown: z.string(),
  links: z.array(z.string()),
  url: z.string(),
  task: z.enum(SiteExplorationTask),
  name: z.string().optional(),
});

export type SiteExplorationInput = z.infer<typeof SiteExplorationSchema>;

export const getPrimaryData = async (input: SiteExplorationInput) => {
  const { task, markdown, links, url, name } = input;

  let prompt: string;

  switch (task) {
    case SiteExplorationTask.DISCOVER_ORGANIZATION:
      prompt = prompts.discoverNewOrganization(markdown, links, url);
      break;
    default:
      throw new Error(`Unknown task: ${task}`);
  }

  return await generateText({
    model: claudeMain(),
    prompt,
    tools: {
      readPage,
      searchSite,
    },
    prepareStep: observePrepareSteps(name ?? "Unnamed Primary Data"),
  });
}
