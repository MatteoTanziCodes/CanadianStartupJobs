
export const getOrganizationTags = (org: string, markdown: string, links: string[], url: string) => `
## Context:

Currently Investigating the organization associated with the following URL:
---
${url}

### Home Page Markdown Content:
${markdown}

### Array of Links on Home Page:
${JSON.stringify(links)}

### Currently collected data:
${org}

<!-- /Context -->
---

## Goal:

Use the provided tools to select and apply appropriate tags for the following joins:
---
Use these exact tag names when calling tools:
- "Province"
- "Industry"
- "Team Size"
- "Raising Stage"

Connect tags to the organization itself.

<!-- /Goal -->
`;
