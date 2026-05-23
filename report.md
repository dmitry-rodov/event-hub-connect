# Development Report

## Tools and Techniques Used

- **Lovable** — AI-powered full-stack builder used to generate the entire web application from structured prompts. First time using the platform.
- **GitHub Copilot** — Used for upfront planning: analyzing requirements, identifying feature clusters, designing the database schema, and drafting the prompt sequence before touching Lovable.
- **Supabase** — Backend infrastructure: Postgres database, Auth (email sign-in), Storage buckets, Row Level Security policies, and RPC functions for transactional logic (RSVP, waitlist promotion).
- **Prompt engineering** — The core development technique. Requirements were decomposed into 16 sequential prompts, each targeting one concern: schema, RLS, pages, user flows, exports, etc.

## What Worked

- **Planning before prompting.** Spending time with Copilot to break requirements into a structured prompt sequence paid off. Lovable produced coherent output when given precise, scoped instructions rather than vague feature requests.
- **Schema-first approach.** Declaring tables, enums, indexes, and storage buckets in the first prompts gave Lovable a stable foundation. Later prompts referencing those tables worked without conflicting migrations.
- **Incremental validation.** Reviewing each prompt's output against the original requirements before sending the next one caught drift early. Adjustments were made in-flight rather than discovered at the end.
- **Role and RLS declaration up front.** Defining host/checker roles and RLS policies as a dedicated prompt prevented permission gaps from spreading across features.
- **Data seeding.** Seeding a host, upcoming event, and past event early made it possible to validate flows end-to-end throughout development.

## What Did Not Work

- **Bug persistence.** Some bugs required up to five follow-up prompts to resolve. Lovable would acknowledge the issue but produce incomplete or regressed fixes, burning through tokens without progress. This was the most painful part of the process.
- **Missing user flows on first pass.** Several requirement details (auth redirect back to event page, waitlist FIFO promotion visibility, undo last scan scope) were not picked up from the initial prompts and had to be elaborated in later iterations.
- **Token cost of iteration.** Each correction cycle consumed significant context. Toward the end, prompts had to be shorter and more surgical because the conversation was long.
- **Implicit assumptions by Lovable.** The builder sometimes made UI or logic choices that looked reasonable but diverged from the spec (e.g., showing RSVP on past events, not enforcing capacity server-side). These required explicit correction prompts.

## Notable Decisions

- **Prompt sequencing over monolithic spec.** Instead of pasting the full requirements into Lovable, the work was split into 16 focused prompts. This gave better control over output quality and made debugging easier.
- **RPC functions for transactional RSVP logic.** RSVP, cancellation, and waitlist promotion were implemented as Supabase RPC functions with row-level locks to avoid race conditions, rather than relying on client-side logic.
- **UTF-8 with BOM for CSV exports.** Added BOM to exported CSVs so they open correctly in Excel without manual encoding selection.
- **Free/Paid toggle as UI-only.** The Paid option was implemented as a visible but disabled toggle with a "Coming soon" tooltip, satisfying the requirement without building payment infrastructure.
- **Security validation before publish.** Ran Lovable's built-in security check before deploying. Tested with both a personal account and generated test users to cover host, checker, and attendee perspectives.
- **Copilot for planning, Lovable for building.** Kept a clear separation: Copilot handled requirement analysis and prompt design; Lovable handled code generation and deployment. This avoided context confusion between the two tools.
