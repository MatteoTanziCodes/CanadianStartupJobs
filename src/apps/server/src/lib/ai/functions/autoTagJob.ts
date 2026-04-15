
import { prompts } from "@/lib/ai/prompts";
import { jobTaggingAgent } from "@/lib/ai/agents/minor/jobTaggingAgent";

const getTagData = async (job: string, markdown: string, url: string) => {
  const result = await jobTaggingAgent.generate({
    prompt: prompts.getJobTags(job, markdown, url),
  });

  console.log("Job Tagging Agent Result Steps:", result.steps.length);
  if (result.steps.length > 0) {
     const lastStep = result.steps[result.steps.length - 1];
     console.log("Final Step Text:", lastStep.text);
     console.log("Final Step ToolCalls:", JSON.stringify(lastStep.toolCalls, null, 2));
     console.log("Final Step ToolResults:", JSON.stringify(lastStep.toolResults, null, 2));
  }
  console.log("Finish Reason:", result.finishReason);
  console.log("Usage:", result.usage);
  return result;
};

export const autoTagJobs = async (flatJob: string, markdown: string, url: string) => {
  await getTagData(flatJob, markdown, url);
};

export const autoTagJob = autoTagJobs;
