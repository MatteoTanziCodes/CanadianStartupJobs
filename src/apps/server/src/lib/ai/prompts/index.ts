import { getNewSource } from "./getNewSource";
import { getNewOrganization, discoverNewOrganization } from "./getNewOrganization";
import { getOrganizationTags } from "./getOrganizationTags";
import { getJobTags } from "./getJobTags";
import { discoverNewJob } from "./discoverNewJob";
import { investigateOrganizationQualification, classifyOrganizationQualification } from "./qualifyOrganization";

export const prompts = {
  getNewSource,
  getNewOrganization,
  discoverNewOrganization,
  investigateOrganizationQualification,
  classifyOrganizationQualification,
  getOrganizationTags,
  getJobTags,
  discoverNewJob,
};
