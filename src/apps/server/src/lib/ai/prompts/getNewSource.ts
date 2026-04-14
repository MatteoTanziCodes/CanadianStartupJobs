const KIND_LABELS: Record<string, string> = {
  vc_portfolio: "venture capital or investment firm's website",
  accelerator_directory: "startup accelerator or incubator's website",
  curated_directory: "curated startup ecosystem directory",
};

export const getNewSource = (markdown: string, url: string, portfolio: string, kind?: string) => `Extract the required information from the following markdown to create a 'source' object. This markdown is from the homepage of a ${KIND_LABELS[kind ?? "vc_portfolio"] ?? "startup ecosystem source"}. Set the 'website' and 'portfolio' properties using the provided URLs.

Website URL: ${url}
Portfolio URL: ${portfolio}

Markdown content:
---
${markdown}`;
