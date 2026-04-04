/*
Target Details:
name: text("name").notNull(),
city: text("city").notNull(),
province: text("province").notNull(),
description: text("description").notNull(),
website: text("website"),
industry: text("industry"),
*/
export const discoverNewOrganization = (markdown: string, links: string[], url: string) => `
## Context:

Currently Investigating the organization associated with the following URL:
---
${url}

### Home Page Markdown Content:
${markdown}

### Array of Links on Home Page:
${JSON.stringify(links)}

<!-- /Context -->
---

## Goal:

Use the provided tools to collate all data required by the following schema:
---
name: text("name").notNull(),
city: text("city").notNull(),
province: text("province").notNull(),
description: text("description").notNull(),
website: text("website").notNull(),
careersPage: text("careersPage"),
industry: text("industry").notNull(),

<!-- /Goal -->
`;

export const getNewOrganization = (markdown: string, url: string) => `Extract the required information from the following markdown to create an 'organization' object. This markdown is from a sibling LLM that searched the website for relevant data. Convert it to the correct schema.

Website URL: ${url}

Markdown content:
---
${markdown}

If a careers/jobs page cannot be confirmed from the evidence, omit careersPage instead of guessing.`;
