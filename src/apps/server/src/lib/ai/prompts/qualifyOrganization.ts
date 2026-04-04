export const investigateOrganizationQualification = (args: {
  name: string;
  website: string;
  careersPage?: string;
  markdown: string;
  links: string[];
}) => `
## Context

You are verifying whether this company belongs on a job board limited to Canadian-owned and operated startups.

Organization name: ${args.name}
Website: ${args.website}
Careers page: ${args.careersPage ?? "Unknown"}

### Home page markdown
${args.markdown}

### Home page links
${JSON.stringify(args.links)}

---

## Goal

Use tools if needed to inspect the company website and closely related public pages. Determine:

1. Whether the company is plausibly Canadian-owned or Canadian-controlled.
2. Whether the company is clearly Canadian-operated, meaning material operations or headquarters are in Canada.
3. Whether the evidence is strong enough to auto-include on the board.

Prefer explicit evidence from:
- About pages
- Team / leadership pages
- Careers pages
- Press pages
- Contact / office locations
- Company legal / corporate pages
- Investor or funding pages only as supporting evidence, not sole evidence

Avoid relying on weak signals such as a .com domain, a remote team, or portfolio-page blurbs without corroboration.
Do not reject purely because ownership is not explicit if the company is clearly Canadian-founded, Canadian-headquartered, and materially operating in Canada. In that case prefer a "review" or cautious "qualified" decision depending on evidence strength.
Do not treat ordinary foreign venture financing on its own as proof of foreign ownership or control. Funding from US or global VCs is common and should not disqualify a Canadian startup unless there is evidence of acquisition, a foreign parent company, or clear foreign control.

Return concise evidence notes with the strongest supporting URLs.
`;

export const classifyOrganizationQualification = (args: {
  name: string;
  website: string;
  research: string;
}) => `
Classify whether this organization belongs on a board for Canadian-owned and operated companies.

Organization: ${args.name}
Website: ${args.website}

Research notes:
${args.research}

Return a structured decision using these rules:
- "qualified" when the evidence strongly supports Canadian operations and there is no credible evidence of foreign control, especially if the company is clearly Canadian-founded or headquartered.
- "review" when the evidence is mixed or incomplete but still plausibly Canadian.
- "rejected" when the company is clearly non-Canadian, clearly foreign-controlled, or unsupported.
- Do not downgrade a company to "review" solely because it raised money from foreign venture investors. Venture funding alone is not foreign control.

Ownership statuses:
- canadian_owned
- foreign_owned
- unclear

Operations statuses:
- canadian_operated
- not_canadian_operated
- unclear
`;
