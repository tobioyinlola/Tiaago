# Tiaago hiring flexibility upgrade — canonical implementation sequence

Prepared 9 November 2026. This plan supersedes the agency-first ordering in the Byrnel implementation documents. It upgrades the existing Tiaago product for all customers. Byrnel is a validation customer and a source of professional-role requirements; it does not define the product boundary.

## Implementation status

- UPG-01 is complete: the current job, application, assessment, interview, billing and reporting dependencies were mapped and regression coverage captured.
- UPG-02 is complete: global reviewed hiring profiles, immutable job snapshots, a server-enforced company rollout flag and legacy/configurable engine selection are deployed.
- UPG-03 is complete for the initial profile-controlled application journey: the existing job wizard supports profile selection and saves versioned candidate-form and eligibility-requirement snapshots.
- UPG-04 is in progress: guest application submission respects the published CV, LinkedIn, cover-letter and additional-question requirements, including no-CV applications. The signed-in candidate form, downstream screen handling and assisted/phone intake remain scheduled work and must not be enabled as a complete journey until their release gates pass.
- UPG-05 has its first enforced foundation: a small reviewed requirement catalogue, immutable job-level requirement snapshots, candidate declarations, per-application pending/pass/fail/needs-review/not-applicable states, a company-scoped dashboard review queue, and mandatory-review progression gates across recruiter and automated handoffs are implemented. Existing applications are backfilled into review where a job has mandatory requirements. A declaration is deliberately not treated as verification. Evidence upload, expiry/source data and ownership remain scheduled work.
- UPG-06 now supports structured work-sample and written-scenario review: supported profiles can request immutable, role-specific file or mobile-friendly written prompts; guest candidates submit constrained files or a text response; recruiters use a job-level weighted scorecard with an explicit passing threshold; completed reviews retain the criterion, weight, score and evidence note used; private permission-checked download is available for files; and required evidence must be accepted before progression. Malware/quarantine integrations and richer reviewer calibration remain scheduled work.

## Product objective

Let a Tiaago employer configure how candidates apply, demonstrate capability and progress through hiring for the actual role. Preserve existing software-hiring flows. Reuse current jobs, accounts, applications, assessments, scheduling, billing and reports. Add practical/credential capability for the roles that need it, and an optional agency-client extension for agencies.

A finance analyst, HR officer, operations coordinator, driver and field operator should not inherit the same application fields, tests or clearance requirements. Industry, role family, seniority and setting are separate attributes. Safety-critical competence remains assessed/verified by the appropriate human or authority.

## Execution rules

- Implement one reviewable slice at a time, with additive migrations and meaningful tests.
- Keep new behavior behind a server-enforced company feature flag and per-job workflow mode. Existing jobs remain on their current engine unless explicitly migrated.
- Pin published form, assessment, rubric and workflow versions; edits must not change an active candidate attempt.
- Enable live cohorts only after the complete relevant candidate journey works. Early partial slices use staging/synthetic data.
- Reuse existing entities and services before adding replacements. Do not create a second candidate database, ATS or payment system.
- Distinguish product implementation from occupational-content approval and provider access. A template can be demonstrable before it is approved for real selection.

## Step-by-step backlog

### UPG-01 — Baseline and dependency map

Inspect job creation, guest and signed-in applications, assessment generation, interviews, status transitions, billing and reports. Capture representative software-hiring regression cases. Map which tasks assume a CV, email, fixed stage or coding assessment. Confirm tenant resolution, queues, communication delivery and AI service availability.

Output: implementation map, baseline test results and synthetic test fixtures. Gate: existing behavior and failure paths are understood before editing shared flow code.

### UPG-02 — Versioned hiring profiles and compatibility controls

Extend the existing role/job foundation with a versioned hiring profile: role family, industry context, seniority, work setting, jurisdiction, required evidence, supported assessment methods and workflow defaults. Retain free-text job titles. Add nullable job/profile links and explicit legacy/configurable workflow selection. Introduce the feature flag; default off.

Output: additive schema and APIs. Gate: old jobs still work without a profile; selecting a profile never changes an existing active attempt. Do not add every later feature's schema in this migration.

### UPG-03 — Upgrade the existing job creation/editing flow

Add a hiring-profile selector and concise controls for application fields, essential requirements, evaluation methods and stages. Display a candidate-journey preview before publishing. Keep technical/software hiring supported.

Add flexible compensation currency/min/max/period fields, including CAD for professional Canadian roles. Keep salary currency separate from the existing wallet/payment currencies and preserve legacy salary displays.

Output: a job configuration saved through the real UI/API/database path. Gate: configuration is server-validated and the recruiter can explain the journey they are publishing.

### UPG-04 — Flexible applications and downstream handling

Make CV, LinkedIn, portfolio and other application fields profile-controlled. Update frontend validation, serializers, screening tasks, interview/invite paths and candidate serializers together. A permitted missing CV must not become a zero score, a failed resume-analysis task or a silent rejection.

Reuse guest and talent records with an information adapter; avoid mass identity merging. Keep verified email as a supported existing mode. Enable phone-only/assisted modes only with the corresponding verification, abuse controls and communication support; do not break email-dependent tasks by merely hiding the field.

Output: role-appropriate mobile forms and supported identity/contact routes. Gate: a no-CV/no-LinkedIn application completes the configured journey in staging, while the existing software application still works.

### UPG-05 — Eligibility requirements and review queue

Add typed requirements and per-application checks: pending, pass, fail, needs-review and not-applicable. Separate declaration, upload and verification. Capture source, reviewer, reason, relevant dates and evidence references. Build a reviewer queue with owner and next action.

Output: recruiters can see why an application is eligible, pending or blocked. Gate: scores cannot compensate for an unmet mandatory requirement; missing information routes to review.

### UPG-06 — Extend current assessment types

Reuse MCQ, open-ended answers, question banks and job assessment templates. Add scenario/work-sample configuration and file-answer support where needed. Introduce observable, anchored rubrics. Apply proctoring and time limits to the particular assessment; preserve current settings for legacy jobs.

New confidential files require private storage and permission-checked downloads or short-lived scoped URLs. Do not inherit public-media exposure for new work samples or credentials. Validate upload types/size and provide appropriate rejection/quarantine handling.

Output: professional job-relevant exercises and candidate submission UI. Gate: a candidate can submit a sample and an authorized reviewer can evaluate it; unauthorized file access fails.

### UPG-07 — Role-specific AI and human review

Route AI generation through the recruiter-approved profile and selected assessment methods, rather than software-oriented keyword inference. Provide evidence-linked summaries, suggested interview probes and rubric suggestions. Keep suggestions separate from confirmed human decisions and record model/prompt/rubric versions.

Output: reviewer scorecards and an explainable recommendation. Gate: no coding task is introduced into a profile that does not permit coding; an AI suggestion is never labeled verified credential evidence.

### UPG-08 — Configurable hiring stages

Implement a versioned ordered workflow: enabled stages, owner, required evidence, deadline and permitted transitions. Use atomic transition services, expected-version checks, idempotency keys and durable notification scheduling. Add manual fallback/error queues.

Map new stages to legacy reporting/status views explicitly. Exactly one engine owns progression for a given requisition; new and legacy tasks must not both send invitations or charges.

Output: candidate progression matches the saved job configuration. Gate: duplicate events and stale reviewer actions cannot move a candidate or bill them twice; mandatory checks cannot be skipped.

### UPG-09 — Author and approve the first role packs

Run content work alongside steps 2–8. Begin with finance/accounting and operations/supply chain for customer validation. Add HR and marketing as approved SME content becomes available. Each pack includes an application schema, tasks, rubric, structured interview guide and workflow defaults.

Examples: fictional reconciliation/budget case; inventory or delayed-shipment scenario; employee-relations case. Adapt depth to seniority. Use synthetic or properly authorized content, not unpaid production work. Record SME approval and reviewer calibration; do not claim predictive validity from a small usability pilot.

Output: approved, reusable Tiaago templates. Gate: each released pack has a named content owner, version, expected evidence and review standard.

### UPG-10 — Complete professional-hiring release

Wire the existing recruiter dashboard, candidate views and reporting to the new profiles, checks, scores and stages. Verify communications, existing wallet charging, permissions, private evidence and review recovery. Measure completion, reviewer effort, time to shortlist and overrides.

Output: complete job → application → evaluation → human decision journey, usable by an ordinary employer account. Gate: release A acceptance scenario below passes and existing software hiring still works.

### UPG-11 — Credentials and evidence lifecycle

Extend requirement checks for applicable licences/certificates: issuer, jurisdiction, class/endorsement where relevant, evidence source, review outcome, verification date and expiry. Start with an auditable authorized manual process if no approved integration exists. Provider failures remain pending/manual tasks.

Output: verified evidence status and renewal/expiry actions. Gate: uploaded does not mean verified; requirements are evaluated against the relevant start/assignment date. No claim of an available regulator API without confirming access.

### UPG-12 — Observed practical assessments

Extend scheduling for in-person/practical appointments: location, qualified assessor, resources and capacity. Add approved observation checklists, critical-failure criteria, evidence, retests and reviewer sign-off.

Output: practical evidence for one driver or field role, with an approved customer protocol. Gate: an authorized assessor completes and signs a test; an online quiz cannot substitute for required practical competence.

### UPG-13 — Readiness and confirmed start

Distinguish selected, offered, accepted, checks outstanding, ready-to-start and started. Connect the requirement lifecycle to a readiness view and auditable transition. Add agreed follow-ups and onboarding/HRIS export or handoff.

Output: a candidate is cleared for the specific assignment through an approved policy. Gate: required expired/failed evidence blocks clearance; the system never assumes an accepted offer equals an actual start. Full payroll/rostering/fleet management is separate scope.

### UPG-14 — Optional agency-client extension

Build client accounts, contacts, explicit internal client grants, job/client links, approved candidate-submission snapshots, appropriate sharing authorization and secure external client feedback. Reuse the core profiles and candidate workflows already implemented.

Do not add external clients as agency team members. Client A cannot access Client B's records. Packets exclude private agency notes and unrelated evidence. Byrnel discovery can specify this slice in parallel, and implementation may follow step 10 if its pilot requires it; it is not a prerequisite for all Tiaago customers or for the shared core.

Output: agency customers can collaborate with employer clients within Tiaago. Gate: the agency/client journey and cross-client file/API isolation tests pass.

### UPG-15 — Controlled rollout and operational measurement

Deploy additive changes flag-off, validate in staging and enable a limited authorized pilot cohort. Confirm applicable jurisdiction policies, approved content, provider delivery, data-sharing scope, support ownership and rollback behavior. Monitor transitions, messages, completion, reviewer effort and support load.

Preserve data on rollback, stop new enrollment and provide a defined completion/manual route for active candidates. Expand roles and tenants only after their release gates pass. Industrial/oil-and-gas packs require actual role/site/jurisdiction requirements and qualified SME approval.

Output: a monitored platform upgrade, not just new screens. Gate: relevant full-stack journeys and existing software-hiring regression pass with production dependencies verified.

## Release boundaries

### Release A — professional roles

Steps 1–10 plus controlled rollout from step 15. Core is useful for direct employers and can be tested with an existing Byrnel company workspace. No agency-client module is required to prove flexible role configuration, application, assessment and review.

Acceptance: a recruiter creates an operations job, selects its reviewed profile, publishes an appropriate application, receives a candidate, reviews required evidence/work sample, uses its configured stages and records a reasoned decision. A software job continues on its original flow.

### Release B — driver/frontline roles

Steps 11–13, supported phone/assisted intake and an approved driver/field role pack. Release only when practical assessors, verification processes and required communication channels are available.

Acceptance: required credential evidence is verified, a qualified assessor records the practical test, readiness gates are enforced and a confirmed start is recorded. Missing credentials cannot be averaged away by interview scores.

### Release C — agency collaboration

Step 14 plus controlled rollout. This can be prioritized after release A if Byrnel confirms its need. No fork or separate product is created.

Acceptance: an agency approves a candidate packet, shares only authorized information with the intended client and receives structured feedback. Other client records and private agency notes remain inaccessible.

## Engineering touchpoints

| Area | Existing implementation to extend |
|---|---|
| Job/profile/configuration | `backend/jobs/models.py`, `serializers.py`, `views.py`, `tasks.py`; recruiter job wizard and common job services/types. |
| Roles/matching | `backend/roles/models.py`, `backend/talent_network/choices.py`; compatible taxonomy expansion. |
| Assessment/evidence | `backend/skill_assessment/`, job templates, candidate assessment renderers and reviewer interfaces. |
| AI behavior | `ai/app/services/assessment_service.py` and corresponding request/response contracts. |
| Workflow | Existing application/task triggers plus a focused new versioned workflow module; legacy compatibility adapter. |
| Booking/practical tests | `backend/scheduler/` and existing scheduling UI; add explicit in-person/practical support. |
| Company/access | Existing company/team membership and validated tenant context; new modules must not trust arbitrary company IDs. |
| Agency option | Focused agency module and client pages, using existing `Company` as tenant. |
| Reporting/billing | Existing reporting, events and wallet service; compatible progress views and idempotent existing charging paths. |

## Immediate working order

1. Execute UPG-01 and record actual regression/dependency findings.
2. Implement only the additive UPG-02 schema/API/flag slice, with tests and migration checks.
3. Wire UPG-03 into the existing job wizard and demonstrate a saved role configuration.
4. Continue through UPG-04 onward in dependency order; do not activate a partially connected journey for live candidates.

Candidate role pack/content discovery can run in parallel. Timelines are sized after UPG-01 and available team capacity are known; the earlier agency-first sprint estimate is not the schedule for this revised platform-wide sequence.
