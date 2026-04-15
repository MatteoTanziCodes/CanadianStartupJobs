export const getJobTags = (org: string, markdown: string, url: string) => `
## Context:

Currently Investigating the job associated with the following URL:
---
${url}

### Job Page Markdown Content:
${markdown}

### Currently collected data:
${org}

<!-- /Context -->
---

## Goal:

Use the provided tools to select and apply appropriate tags for the following joins:
---
Use these exact tag names when calling tools:
- "Experience Levels"
- "Industries"
- "Job Types"
- "Roles"
- "Provinces"

Connect tags to the job itself, not to an organization.

<!-- /Goal -->
`;
