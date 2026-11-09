# Byrnel implementation plan

> Scope update: the canonical implementation order is now [the Tiaago hiring upgrade plan](tiaago-hiring-upgrade-implementation-plan.md). This document remains customer research/supporting agency scope; its agency-first sequencing does not govern the platform-wide upgrade.

Prepared 9 November 2026. Status: implementation-ready proposal; application implementation has not started in this task. Companion: `byrnel-non-software-hiring-plan.md`. Backlog: `byrnel-implementation-backlog.csv`.

## 1. Release objective and scope

Deliver one complete professional-recruitment workflow:

Agency consultant creates an employer client → creates/links a requisition → chooses an approved hiring profile → receives applications → reviews eligibility and work samples → approves a shortlist → shares an authorized packet with the intended client → receives feedback → records an offer/placement and confirmed start.

The first two packs are finance/accounting and operations/supply chain, subject to Byrnel supplying actual role priorities and reviewers. Use synthetic briefs and candidate data until customer materials and sharing permissions are available. Customer discovery runs alongside engineering; it need not block client-management foundations.

The pilot must preserve current jobs, assessments, billing and payments. Drivers, industrial competence, full shift scheduling, payroll, temporary-worker timesheets and fleet operations are separate expansion work.

## 2. Delivery assumptions

Plan on five two-week sprints for a controlled professional-agency pilot. This is a planning envelope, not a committed delivery date. It assumes three engineers, QA support, shared design, a product/TA owner and available role SMEs. A smaller team needs a longer schedule or a reduced first release.

Confirm the actual team, existing production service health, customer ATS, Canadian jurisdictions and assessment-content owners during the first sprint. Do not make live candidate decisions depend on an unverified integration.

## 3. Implementation decisions

1. Keep `Company` as the tenant. Add client records beneath it; do not rename or replace the tenant model.
2. Add a focused `agency` Django app for clients, contacts, access grants and client submissions. Add a `hiring` module/app for the new workflow and requirement engine when that slice begins. Reuse existing job and assessment models.
3. Start with a server-enforced company feature flag, default off. Add an explicit job workflow mode, default legacy. Exactly one engine owns progression for each job.
4. Add nullable client/profile links to jobs. Existing jobs stay valid with no client and no new profile. Do not migrate live jobs implicitly.
5. Keep compensation currency separate from billing/payment currency. Add CAD salary/hourly compensation fields without widening wallet/payment enums or promising CAD payment processing.
6. Use immutable profile, form, rubric, workflow and submission versions. Editing a template must not alter an active attempt or a previously shared packet.
7. Use typed relational records for identity, access, checks and decisions; validated JSON can describe forms and rubric configuration.
8. Apply new permissions in the API, queries and file delivery, not just in navigation.
9. Ship ordered configurable stages first. Defer arbitrary branching, custom scripting and a general visual automation builder.
10. Start with email-based professional intake. Phone-only intake is a later supported mode requiring phone verification, abuse controls and working communication delivery; hiding an email field must not break existing email-dependent downstream tasks.

## 4. First sprint: smallest complete slice

**Demo:** An authorized consultant creates a client, attaches a draft job to it, and sees only permitted client/job records. Existing users and jobs remain unchanged while the flag is off.

### Model scope

- `ClientAccount`: UUID, owning company, name, status, country/province metadata, creator and timestamps. Archive instead of hard-delete.
- `ClientContact`: owning client, name, title, email, phone and primary-contact indicator. Internal records only in this sprint.
- `ClientAccessGrant`: client plus validated internal company-team membership and read/edit access. Company admins have explicit administrative access. Do not add employer-client reviewers to `CompanyTeamMember`.
- `Job.client_account`: nullable FK; client and job must belong to the same tenant.
- A minimal agency audit record for creation, edits, archive and access changes. Record actor/action/object/time and bounded change metadata; do not log full candidate/contact payloads.
- Company feature flag default false, enforced by new routes and frontend rendering.

### Internal role rules

| Actor | Read | Create/edit | Archive/manage grants |
|---|---|---|---|
| Company admin | Company clients | Yes | Yes |
| Recruiter | Granted clients and clients they create | Within their grant | No |
| Viewer | Granted clients | No | No |
| User from another company | No | No | No |
| Employer-client reviewer | No internal access in sprint 1 | No | No |

Grant the creating recruiter access to the client they create. Admins control grants to other team members. Validate that every granted team membership belongs to the client's company.

### Tenant resolution dependency

Review `get_user_company()` and existing team-permission helpers before reusing them. Current resolution prioritizes an invited membership, and several permission classes consult `user.company` directly. Tests must cover an invited consultant who also has an automatically created personal company.

New agency routes must use one documented, authorized company context. Never trust a company ID supplied in a body/header without checking membership. Where multiple real memberships make the context ambiguous, require an explicit validated selection instead of silently choosing the first membership. Do not add broad cross-company visibility as a shortcut.

### Draft API contracts

These contracts are proposed for implementation; they are not existing endpoints.

- `GET/POST /api/agency/clients/` — permission-scoped list/create, search, pagination.
- `GET/PATCH /api/agency/clients/{uuid}/` — scoped detail/update.
- `POST /api/agency/clients/{uuid}/archive/` — admin only; archived records remain referenced by historical jobs.
- `GET/POST /api/agency/clients/{uuid}/contacts/` — scoped contacts.
- `PATCH/DELETE /api/agency/clients/{uuid}/contacts/{contact_uuid}/` — scoped contact edits/removal under the defined retention policy.
- `GET/POST/DELETE /api/agency/clients/{uuid}/access/...` — admin-managed internal grants; finalize exact resource shapes during implementation.
- Extend existing job create/edit APIs with optional `client_account_id`; reject cross-tenant, inaccessible or newly assigned archived clients.

Use 404 for foreign/inaccessible objects, 403 for a known permitted object's disallowed operation, and 400 for invalid same-tenant relationships. Response serialization must not expose tenant identifiers or nested data unnecessarily.

### Migration order

Create the initial `agency` models with a dependency on the existing company/team models only. Add the job-client FK in a `jobs` migration that depends on both the current jobs migration and the initial agency migration. Introduce job-dependent client-submission models in a later agency migration. Do not make both initial migrations depend on one another.

### Frontend routes

- `/recruiter/dashboard/clients`: scoped search/list and create action.
- `/recruiter/dashboard/clients/[id]`: overview, contacts and linked jobs.
- Client create/edit form; admin access-management panel.
- Optional client selector in existing job create/edit flows, shown only to enabled tenants.
- Agency navigation entry only when enabled; direct API/URL access must still enforce authorization.

### Day-by-day sequence

| Working days | Work | Accountable role |
|---|---|---|
| 1–2 | Tenant/access design, contracts, migration design, fixtures and threat cases; customer discovery starts in parallel. | Backend lead + product/TA + QA |
| 3–4 | Models, permissions, grants and scoped client/contact APIs. | Backend engineer |
| 4–6 | Clients list/detail/forms and job-client link through real server/API calls. | Full-stack engineers |
| 6–8 | Audit/history, archive behavior, negative access tests and invited-member coverage. | Backend + QA |
| 9–10 | Staging migration, end-to-end demo, regression checks, deployment with flag off. Enable synthetic test tenant only until pilot gates are met. | Engineering + QA |

## 5. Five-sprint delivery sequence

| Sprint | Delivery | Exit gate |
|---|---|---|
| 1: weeks 1–2 | Client foundation, access boundaries and job-client links. Discovery identifies two pilot role families and evidence requirements. | Synthetic two-company isolation demo; nullable migration; flag-off compatibility. |
| 2: weeks 3–4 | Hiring profiles, CAD compensation, configurable intake and eligibility-review states. | Published configuration is versioned; frontend/backend validation agree; legacy applications continue to work. |
| 3: weeks 5–6 | File work samples, anchored scorecards, structured reviewer guide and ordered workflow runner. | Two reviewed role packs; reviewers record evidence; no mandatory requirement can be skipped by a score. |
| 4: weeks 7–8 | Approved submission snapshots, candidate-sharing authorization, external client review/feedback and durable notifications. | Client sees only published packets granted to them; complete staging journey with delivery/expiry/failure handling. |
| 5: weeks 9–10 | Placement/start records, core metrics, migration/rollback rehearsal, customer UAT and controlled live pilot. | Production services verified; customer content approved; agreed cohort, owners, support and measures. |

Customer-specific content review is a parallel workstream, not something engineering can invent at the end. If an existing ATS must remain the system of record, start with a clearly owned CSV exchange or a single known integration rather than building several speculative connectors.

## 6. Scope of the following slices

### Hiring profiles and compensation

Extend curated profiles with role family, industry context, seniority, working setting, jurisdiction, essential tasks and evidence requirements. Retain free-text job titles. Publish reviewed versions and bind each new-configured job to a version.

Add dedicated compensation currency/minimum/maximum/period fields. Validate range order, allowed precision and display conventions. Support CAD for compensation while preserving legacy USD/NGN display fallbacks. Never derive an exact salary from an open-ended legacy band or reuse wallet currency as salary policy.

### Applications and identity

Make CV and LinkedIn requirements profile-controlled on the relevant guest/public application path. Preserve existing default requirements for legacy jobs. Schema changes need matching serializer, public-form, downstream-screening and invite changes. A permitted application without a CV must route to its approved structured/manual evaluation path; it must not receive a zero resume score or a failed resume-analysis task merely because no CV was required.

Retain the existing guest/talent models initially; introduce a read adapter for candidate information rather than a risky mass identity migration. Only link/claim candidate identities using verified evidence and authorization. Do not auto-merge on a shared phone number or expose private cross-client history.

### Requirements and workflow

Use pending, pass, fail, needs-review and not-applicable checks with provenance, reviewer, timestamps and evidence version. A document upload alone is not verification.

Start with a versioned ordered workflow: applied → eligibility review → evaluation → consultant review → client submission → client feedback → offer/placement. Each stage has an owner and next action. Automate administrative progression only through explicit rules; retain human hiring decisions during the pilot.

Stage-transition commands need an expected version, authorized actor, reason and idempotency key. Concurrent/stale updates return a conflict instead of moving the candidate twice. Use atomic state writes and a durable outbox for invitations/reminders. Retries must not create duplicate actions or charges. Keep mappings to existing application-status views explicit.

### Work samples and scoring

Extend `JobAssessmentTemplate`, assessment bundles, `OpenEndedQuestion` and existing submission/review flows. Add a file-answer type and anchored rubric ratings only where the current models cannot represent them.

Use synthetic workbooks/documents, approved tasks and defined evidence. Store new confidential evidence privately; do not inherit public-media exposure. Validate types/size and handle quarantine/rejected uploads appropriately. Deliver files through authorized download endpoints or short-lived scoped URLs. Never put long-lived private file URLs inside submission snapshots.

Record reviewer ratings, comments and evidence against immutable rubric versions. AI suggestions stay separate from confirmed human ratings, with model/prompt version and supporting excerpts. Assessment content requires approval by the designated SME.

### External client review

`ClientSubmission` is an approved snapshot, not a live view of the whole candidate record. Publish an allowlisted packet after the required candidate-sharing authorization. Record exactly what was shared, with whom and why.

Give external reviewers a separate, revocable access scope. A secure email link should establish a short-lived reviewer session bound to the authorized client/packet; hash stored token material and define expiry/reuse rules. Do not reuse agency-admin sessions or team membership. Exclude private agency notes, unrelated client history, financial margins and sensitive documents by default.

### Placement, operations and metrics

Record offer, accepted offer, confirmed start and follow-up separately. Initially allow an authorized consultant to record these outcomes manually. Capture event timestamps from the beginning so time-to-shortlist and client-response measures are meaningful.

Operations views show owner, overdue step, blocked requirement, delivery failures and retry/manual action. Verify queues and email delivery in production before enabling automation; a missing dependency must remain visible and recoverable.

## 7. Customer/content workstream

Start immediately alongside sprint 1:

- Confirm client/province, two real role families, current ATS and actual approval process.
- Obtain approved/anonymized sample job briefs and assessment/shortlist examples.
- Nominate finance and operations reviewers.
- Define essential versus trainable skills, acceptable evidence and review reasons.
- Review the relevant Canadian posting/privacy requirements with the customer's responsible owner. Include applicable AI disclosure, compensation fields, record retention and follow-up rules.
- Approve two role packs before scoring real candidates. A provisional synthetic demo pack is not a validated occupational test.
- Establish baseline consultant effort, shortlist acceptance and existing conversion measures before setting targets.

## 8. Testing and release gates

### Meaningful automated tests

- Company isolation across list/detail/search, mutations, nested IDs, file downloads and exports.
- Invited members, users with personal-company shells, role/grant changes and ambiguous contexts.
- Admin/recruiter/viewer permissions; no privilege change by altering client/job/team IDs.
- Archived clients remain on historical records but cannot be newly assigned under disallowed policy.
- Additive migration preserves old jobs; flag-off routes and legacy job/application flows behave as before.
- Published forms and rubrics remain stable for active applications.
- Role-specific CV/LinkedIn requirements match in UI and API; absent optional data does not crash screening or communication.
- Required eligibility checks remain pending until verified; stale evidence cannot satisfy the relevant date requirement.
- Stage transitions are atomic/idempotent; delayed workers and repeated events do not duplicate actions or billing.
- Client packets use field allowlists; revoked/expired grants and unapproved packets cannot be accessed.
- Notification/provider failure creates an operational task and preserves candidate state.

### End-to-end acceptance scenario

Use two synthetic agency companies and two clients under the pilot agency. An admin grants a consultant access to Client A; Client B stays hidden. The consultant creates a client-linked role, applies a profile, receives a synthetic application, records eligibility, reviews a work sample and approves a client packet. The authorized external reviewer can request an interview and provide feedback. The consultant records an accepted offer and confirmed start. Audit/events show the full path; neither external reviewer nor another agency can access it.

Run the existing backend suite, frontend typecheck/build and relevant browser regression checks. Browser-test both the new agency journey and an existing software-hiring journey. Do not substitute a mocked UI-only demo for the real UI → API → database path.

### Rollout

Deploy additive changes with the company flag off. Validate in staging/test tenant, then enable one authorized pilot tenant. Pilot content and customer-data scope must be approved before real candidate evaluation/import. Watch failed transitions, delivery failures, unauthorized accesses, completion and support workload.

Rollback disables new entry/actions while preserving data. Define how already-started candidates can finish or be handled manually; do not silently switch their workflow engine. Destructive schema removal and broad historical-job migration are not part of the initial rollout.

## 9. Later expansion gates

- Driver/field beta: working phone/assisted intake, approved credential policy, qualified assessors, practical bookings and readiness records. Estimate 4–6 further weeks after sizing.
- Oil-and-gas/industrial pack: actual operator/site/jurisdiction requirements, approved SME content and authorized verification arrangements. Estimate separately; do not promise certification from an online test.
- HR/marketing packs: reuse professional evaluation components after SME approval and customer prioritization.
- Full payroll, timesheets, shift rostering, fleet dispatch and unrestricted workflow automation remain outside the first release.

## 10. Work that is ready to start

Begin FND-01 through FND-06 in the companion backlog. Their engineering work can proceed with synthetic data. CUSTOMER-01 runs in parallel. No external provider contract, universal role catalogue or new AI model is required to build the first client/job-management slice.

Done for sprint 1 means a functioning, permission-tested vertical slice in staging—not just models, screen mockups or an API specification. Done for the pilot means the complete customer journey above, with approved content and operational ownership.
