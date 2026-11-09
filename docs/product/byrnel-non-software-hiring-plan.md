# Tiaago: broader hiring strategy and Byrnel implementation plan

> Scope update: the canonical implementation order is now [the Tiaago hiring upgrade plan](tiaago-hiring-upgrade-implementation-plan.md). This document remains customer research/supporting agency scope; its agency-first sequencing does not govern the platform-wide upgrade.

Prepared 9 November 2026. Status: research-backed proposal; estimates require discovery and engineering sizing. This document does not authorize changes to production.

## 1. Product recommendation

Expand Tiaago into a configurable, evidence-based recruitment platform. Support multiple kinds of work through a shared hiring foundation and reviewed role-specific packs. Launch a specialist-agency pilot for Byrnel before attempting a general release for every industry.

The customer outcome is a qualified, evidence-backed candidate who can progress through the client's hiring process. For safety-critical and frontline work, the outcome extends to a worker cleared for the particular assignment. A high assessment score alone is insufficient for either outcome.

Distinguish role family, industry and work setting. An accountant in an oil company needs finance assessment and relevant industry context; an offshore equipment operator needs task-specific assessment and readiness checks. Neither should be classified simply through a software/non-software switch. Many industrial roles are deeply technical without involving programming.

## 2. What we know about Byrnel

Byrnel's public website describes a Canadian professional recruitment consultancy. Its stated expertise includes finance/accounting, marketing and operations. Its detailed expertise page includes FP&A, audit, treasury, accounting, supply chain/logistics, manufacturing operations and engineering. It emphasizes consultants with actual industry experience and evaluation against real work.

This supports an initial hypothesis: Tiaago should organize and extend consultant expertise, make candidate evidence comparable and improve communication with employer clients. This is a product inference, not a finding about Byrnel's internal processes.

Public information does not establish hiring volume, current ATS, priority vacancies, budget, office staffing, service levels, contractual placement terms, driver recruitment or oil-and-gas specialism. Canadian coverage does not establish which provinces govern individual engagements. Do not treat website testimonials or vendor marketing as validated operational metrics.

Recommended first pilot: one finance/accounting role and one operations/supply-chain role, across two employer-client workspaces if Byrnel can provide them. Exact roles must follow active customer demand. HR and marketing are natural adjacent professional packs. Drivers and industrial/oil-and-gas packs are expansion tracks, not assumed Byrnel requirements.

## 3. Research and implications

| Finding | Evidence | Product implication |
|---|---|---|
| Selection should begin with job tasks and competencies. | OPM job-analysis guidance; CIPD selection guidance. | Capture essential tasks, entry requirements and success criteria before suggesting assessments. |
| Work samples should resemble actual work. Prior knowledge tests can be inappropriate when the employer will provide that training. | OPM work-sample guidance. | Separate capabilities required on day one from trainable skills; use realistic exercises rather than generic trivia. |
| Structured interviews use consistent job-related questions and evaluation standards. | OPM structured-interview guidance. | Version interview guides and anchored rubrics; retain evidence and independent assessor ratings. |
| Frontline hiring products emphasize mobile applications, screening, scheduling and communication. | Fountain's own ATS description. | Treat a phone-friendly candidate journey and coordinated follow-up as core workflow features. Vendor claims are market signals, not independent proof of performance. |
| Industrial competence includes job-specific qualifications and practical assessment. | OPITO standards; IOGP fabrication-site training guidance. | Support observed practical tests, qualified assessors and site-specific readiness matrices. A Tiaago quiz must never be presented as an industry qualification. |
| Driver checks are jurisdiction-specific. | Ontario driving-record guidance; Alberta commercial-driver guidance; FRSC portal for a future Nigerian pack. | Keep licence classes, endorsements, verification sources and evidence freshness configurable by jurisdiction and vehicle/job. |
| Canadian agency deployment needs local policy controls. | Ontario public-job-posting guidance, OHRC guidance and OPC consent guidance. | Add jurisdiction, disclosure, data-sharing, retention and review controls. Determine applicable law for each engagement instead of applying one global policy. |

## 4. Current Tiaago baseline

This is a targeted code inspection, not an exhaustive production capability audit.

### Reuse

- Company and team accounts, job publishing, public job pages and guest applications.
- Candidate sourcing, pipeline categories, invitation links and candidate records.
- MCQ, coding and open-ended assessment sections; question banks and reusable bundles.
- Human-reviewed open-ended grading support and AI-assisted content generation.
- Interview scheduling, interview review, notifications and reporting foundations.
- Wallet billing, support and administration.

### Gaps confirmed in the inspected code

1. `GuestJobApplicationSerializer` requires email, LinkedIn and a resume. That is unsuitable as the universal application contract for drivers and many frontline candidates.
2. `Role.is_technical` is a binary flag. AI role detection uses software-oriented keyword rules including broad words such as engineer and system. This is not a sufficient basis for choosing an industrial or professional evaluation method.
3. Talent Network role categories include HR and operations, but the industry list remains substantially technology-oriented. Professional/industrial segmentation needs richer taxonomy.
4. `JobApplication` and `PipelineCandidate` use fixed status choices. A separate reusable, versioned workflow execution model is needed for client-specific stages and readiness checks.
5. Job proctoring defaults include fullscreen and webcam requirements. These should be role- and assessment-specific, not assumed for a short phone application or supervised road test.
6. Job compensation currently supports USD/NGN and fixed ranges. A Canadian pilot requires CAD and flexible compensation values and periods.
7. No dedicated credential-verification lifecycle, practical-assessor module, client-submission packet or agency-client workspace model was identified in the reviewed core models. Validate existing integrations before implementing overlapping functionality.

### Main implementation touchpoints

- `backend/jobs/models.py`, `backend/jobs/serializers.py`, `backend/jobs/tasks.py`.
- `backend/roles/models.py`, `backend/talent_network/choices.py`.
- `backend/sourcing/models.py` and sourcing APIs.
- `backend/skill_assessment/models.py`, assessment APIs and grading tasks.
- `backend/scheduler/models.py` and booking services.
- `backend/create_user/models.py` and company/team permissions.
- `ai/app/services/assessment_service.py` and related model/prompt contracts.
- Recruiter job creation, pipeline, assessment creation/review and public candidate flows in `frontend/app/`.

## 5. Shared product foundation

### A. Requisition and role profiles

Introduce a hiring profile composed of role family, seniority, industry context, work setting and jurisdiction. Add optional client, site, engagement type, start date, working pattern, headcount and approved compensation information.

Keep the job title free text. Use curated role profiles to suggest a starting configuration; the recruiter confirms it. Industry is context, not a shortcut for imposing every industry credential on every worker.

Each role profile contains:

- Three to five observable job outcomes and essential tasks.
- Essential requirements, trainable capabilities and preferences as separate categories.
- Approved application fields, assessment methods and interview guide.
- Competency rubrics, evidence requirements and any critical pass/fail items.
- Workflow stages, reviewer roles, notification rules and retention policy reference.

Templates must be versioned and approved by an occupational subject-matter expert. Use original or appropriately licensed assessment content; publishing a template must not imply endorsement by a regulator or awarding body. Changing a template must not silently change an assessment already assigned to candidates.

### B. Configurable intake

Make resume, LinkedIn, portfolio and email requirements configurable. Retain professional CV workflows where appropriate. Offer phone-based contact/resume-later paths for roles that justify them. Do not replace one universal form with another.

Frontline intake should support mobile completion, save/resume, simple language, accessible controls, camera document uploads and assisted applications. Show pay, location, shift and essential requirements early. Disclose recruiter-assisted entry and provide candidate confirmation.

Use a stable candidate identifier. Existing guest applicants, talent accounts and sourced candidates should be linked only with sufficient identity evidence and permission. Never merge records merely because two people share a phone, and never expose one agency's private notes through a global talent identity.

### C. Eligibility and evidence

Separate eligibility from assessment scores.

Requirement result states: pending, verified-pass, verified-fail, needs-review and not-applicable. Keep candidate declaration, uploaded evidence and issuer/assessor verification distinct.

Examples: licence class, work availability, lawful work eligibility, credential verification or a practical-test completion. Validate critical requirements for the relevant date, including intended assignment or mobilization dates when applicable.

A high interview score must not compensate for an unverified mandatory licence. Missing or ambiguous evidence creates a review task, not an automatic rejection. Mandatory legal/safety requirements cannot be bypassed through a discretionary score override.

### D. Work samples and practical assessment

Extend the current assessment foundation with:

- Scenario and situational-judgment items.
- File-based work samples using synthetic spreadsheets/documents.
- Structured oral or written responses.
- Observed practical assessments scored by an assigned human assessor.
- Evidence attachments, reviewer comments, critical-failure flags and retest history.

Every assessment maps to actual job competencies. Use anchored rubrics, such as clearly described levels from 1 to 4, rather than unexplained overall impressions. Keep assessment scores, verification status and reviewer recommendation visible separately.

Do not default all candidates to webcam proctoring, long timed exams, AI voice interviews or coding. Set assessment integrity requirements proportionately. State whether AI tools are permitted in the exercise and assess accordingly; do not use speculative AI-content detection as a decisive rejection signal.

### E. Workflow execution

Start with ordered configurable stages, optional steps, stage owners, deadlines and a small set of explicit transition rules. Avoid building an unrestricted visual automation platform for the first release.

Suggested agency journey:

Client brief → approved role scorecard → sourcing/application → eligibility review → work sample/structured interview → consultant shortlist approval → candidate-authorized client submission → client feedback/interview → offer → placement/start confirmation.

Suggested driver journey:

Short application → licence/availability review → job-relevant scenario → supervised practical test → required checks → conditional offer → readiness clearance → confirmed start.

Each transition records who/what initiated it, evidence, rule/template version, time, outcome and reason. Queue failures, missing documents and unanswered requests appear in an actionable operations inbox. Automated messages need delivery status, bounded retries and an explicit manual fallback.

### F. Readiness and handoff

Keep selected, offered, accepted, verified, ready-to-start and actually-started distinct. Track requirements and unresolved items before handoff. Record 30/90-day outcomes where agreed with the client.

For this expansion, stop at recruitment, placement and a clean onboarding handoff. Integrate with payroll, HRIS, full shift rostering, fleet dispatch or an operational competence system when required; do not promise those systems as part of the first release.

## 6. Byrnel-specific agency layer

Agency support is a first-release requirement, not a cosmetic theme.

- Agency tenant → employer-client accounts → requisitions → client-specific candidate submissions.
- Client contacts, accountable hiring managers, approved briefs and confidential-search controls.
- A client-facing review space that exposes only deliberately shared submission packets.
- Candidate authorization/right-to-represent records where appropriate to the engagement and applicable law.
- Branded candidate summaries: role evidence, work-sample results, consultant commentary, relevant verification status and open questions.
- Client decisions: request interview, request information, hold or decline, with structured reasons and timestamps.
- Placement/start records and service-level follow-up. Detailed agency invoicing, margins, timesheets and temporary staffing payroll belong in a later commercial scope if validated.

Do not implement client access by making all employer clients members of the agency's existing team. Use explicit client-scoped grants. Client A must not see Client B's requisitions, submissions, salary discussions, documents or feedback.

Candidate reuse should reduce duplicate effort without sharing information silently. Track evidence freshness, the new requisition's requirements and authorization for each client disclosure. Default client packets to exclude private agency notes, other-client feedback, commercial margins and sensitive documents.

## 7. Initial role packs

The examples below are proposed content directions, not validated tests or licensing advice.

| Role pack | Example evidence | Review/decision pattern |
|---|---|---|
| Finance/accounting: Byrnel pilot | Synthetic budget-versus-actual analysis, reconciliations or accounting-control case; concise business explanation. | Consultant-reviewed work sample and structured interview. Select accounting framework and depth for the actual client's role. |
| Operations/supply chain: Byrnel pilot | Resolve a late shipment, prioritize competing orders, explain an inventory discrepancy, write a handover. | Scenario/work sample with rubric for prioritization, accuracy, communication and escalation. |
| Marketing: adjacent Byrnel pack | Interpret campaign data or respond to a fictional brief. | Human-reviewed analysis and portfolio discussion; avoid uncompensated production work for a real client. |
| HR: adjacent professional pack | Respond to a fictional employee-relations situation, protect confidential data, organize onboarding or identify a payroll exception. | Local-context rubric, structured interview and professional judgment. No blanket assumption that a particular optional HR designation is mandatory. |
| Drivers: later frontline pack | Vehicle-appropriate licence/endorsements, driving-record review where authorized, vehicle checks, hazard judgment and observed road test. | Credentials and critical safety checks are gates. Qualified assessor records practical evidence. |
| Industrial/oil and gas: later specialist pack | Role/site requirement matrix, relevant credential verification, task-specific practical evidence and approved clearance status. | Qualified technical/HSE review. Office roles in an energy company use the appropriate office-role pack with sector context. |

Seniority changes the evaluation method. An FP&A analyst may complete a short spreadsheet exercise; a CFO search may use a structured discussion of a fictional board-level business case and evidence from prior responsibilities. Do not force experienced executives through a junior-style timed examination.

Driver example: eligible candidates might be compared on observed driving, vehicle checks, hazard response and role-relevant communication. Any proposed weights and critical-failure definitions require qualified assessor approval and pilot calibration. Do not publish a universal driver-fit score.

Industrial example: determine onshore/offshore, actual task, operator/site rules and jurisdiction first. OPITO-related training is relevant for particular offshore contexts; it is not a universal requirement for everyone employed by an oil-and-gas company. A training certificate, practical competence and fitness clearance are separate facts.

## 8. AI product policy

Use AI for drafting role criteria/questions, summarizing candidate evidence, proposing interview probes and suggesting rubric-linked ratings for human review.

Each AI recommendation must identify supporting evidence, the relevant competency, uncertainty/missing evidence and the model/prompt/template version. An inference must not be represented as an issuer verification.

Avoid autonomous rejection from a generic fit score. Do not infer trustworthiness, personality, emotion or safety competence from a face, voice, accent or appearance. Offer appropriate accommodations and equivalent assessment routes. Language should be assessed only to the extent required by the job, using an approved method.

Byrnel's expert consultants should approve role packs and hiring recommendations. AI should make their evidence easier to compare, not erase the expertise on which their service is positioned.

## 9. Canadian launch and jurisdiction controls

Canada is the confirmed public market; the relevant province, employer and posting scope still need discovery. Do not import Nigerian, US or UK legal requirements into a Canadian customer configuration.

Ontario's official guidance identifies public-job-posting requirements effective January 2026, including AI-use disclosure where applicable. Coverage and exceptions matter; the size and obligations of an employer client may matter even if the agency itself is small. The product should capture the legal employer, province/work location and confirmed policy applicability, rather than infer compliance from agency headcount.

Implementation implications to validate with Canadian counsel/customer policy owners:

- Flexible CAD compensation and pay-period fields; required disclosure text where applicable.
- Clear vacancy and AI-use information in applicable public postings.
- Documented posting versions and records with policy-based retention.
- Interview follow-up tasks and evidence that required notifications were sent.
- Job-related selection criteria; no default Canadian-experience filter or nationality proxy.
- Appropriate privacy notices, client-sharing authorization, access controls and deletion/retention handling under applicable federal/provincial privacy law.
- Any obligations that apply specifically to a job-posting platform, including relevant fraud-reporting processes.

For future driver packs, store the issuing jurisdiction, class/endorsements, expiry and authorized verification/abstract details. Ontario and Alberta resources illustrate why one national licence checklist is insufficient. For other countries, use separate reviewed requirement packs and approved verification routes.

Medical/fitness information should normally be reduced to the minimum clearance outcome needed by the hiring/readiness workflow, with restricted access. Do not expose diagnoses or use broad pre-employment health questionnaires as a generic screening step. Timing and permissible collection depend on the jurisdiction and role.

## 10. Technical design and implementation boundaries

Extend the existing Django/Next.js platform. Do not introduce microservices solely for this expansion.

Suggested domain objects, reusing existing equivalents where possible:

| Object | Purpose |
|---|---|
| ClientAccount / ClientAccessGrant | Agency-owned client records and explicit external reviewer access. |
| Requisition extension | Existing Job linked to client, hiring profile, jurisdiction and headcount/start context. |
| HiringProfileVersion | Reviewed role configuration and workflow defaults. |
| RequirementDefinition / RequirementCheck | Typed eligibility/readiness criteria and per-application evidence outcomes. |
| CandidateEvidence / VerificationRecord | Private artifacts, issuer/reviewer result, provenance, expiry and access purpose. |
| AssessmentBlueprint / RubricVersion | Extend existing templates, question banks and assessments with work-sample/practical types and anchored criteria. |
| WorkflowVersion / StageRun | Ordered stages, current state, ownership, due dates, transitions and retry state. |
| AssessmentBooking / AssessmentResult | Extend scheduling for physical location, assessor, required resources/capacity and observed outcomes. |
| ClientSubmission | Approved, versioned snapshot with field allowlist, sharing authorization and client feedback. |
| DecisionRecord / Placement | Reasons and evidence for decisions, accepted offer, confirmed start and follow-up outcomes. |

Use relational fields for identities, tenant ownership, decisions and requirement states. Use validated, versioned JSON for extensible form definitions or rubric configuration, not arbitrary unvalidated decision logic.

Events such as application received, evidence verified, assessment reviewed, client feedback received and start confirmed should trigger idempotent transition/message tasks. Repeated webhooks, retries and duplicate worker deliveries must not create duplicate invites, stage changes or charges. Use a transaction/outbox pattern where committing a decision and scheduling follow-up must stay consistent.

Migration strategy:

1. Add fields/tables without changing existing behavior.
2. Keep existing jobs on the legacy workflow unless explicitly migrated.
3. Assign exactly one workflow engine to each requisition to prevent parallel legacy/new automations.
4. Add per-tenant feature flags; start with test tenants, then the pilot customer.
5. Maintain compatibility mappings for existing status-based screens while new stages are introduced.
6. Separate template edits from active candidate attempts; record immutable versions.
7. Establish candidate linking/claiming rules before importing or consolidating old records.

Before a customer pilot, verify production queues, AI services, email/message delivery, file access, provider errors and operational alerts. A configured key alone does not establish that a service or complete flow works.

## 11. Proposed delivery plan

Planning assumption: two full-stack engineers, one backend engineer, a QA engineer, shared product design, a product/TA lead and available role SMEs. Timing is a sizing hypothesis, not a delivery commitment. Existing production reliability and access to customer materials are dependencies.

| Phase | Indicative timing | Deliverable and exit gate |
|---|---|---|
| Discovery and design-partner agreement | Weeks 1–2 | Observe current process; choose two real role families; collect consented/anonymized sample briefs, scorecards and outcomes; map systems, legal context and baselines. Signed pilot scope and approved job criteria. |
| Agency/intake foundation | Weeks 3–4 | Client accounts/access boundaries, CAD compensation, role profiles and configurable intake/requirements. Client isolation and existing software-job regression tests pass. |
| Evidence-based evaluation | Weeks 5–6 | Finance/operations work samples, anchored rubrics, structured interview guide, reviewer interface and auditable decisions. Two reviewers calibrate against sample evidence; content owner approves release. |
| Client collaboration and pilot readiness | Weeks 7–8 | Versioned client packets, sharing authorization, feedback, stage ownership and notifications. Full requisition-to-client-feedback flow passes in staging; pilot operates in shadow/reviewer mode. |
| Live pilot and iteration | Weeks 9–10 | Controlled real requisitions with manual fallback, agreed service levels and measured outcomes. Customer accepts operational results before wider release. |
| Frontline extension, if demand is confirmed | Approximately 4–6 additional weeks | Phone-oriented intake, practical bookings, credential checks and readiness board for one driver/operational role family and jurisdiction. Customer assessor approves criteria and verification process. |
| Industrial/oil-and-gas expansion | Separately estimated after discovery | Operator/site requirement matrix, qualified SME content and verified credential routes. Release depends on specialist validation and operating arrangements, not just engineering completion. |

HR and marketing packs can be authored on the professional-assessment foundation as SME capacity permits. Do not add them to the committed pilot by default. If Byrnel urgently needs drivers rather than professional roles, change the pilot and bring practical/credential modules forward instead of adding a parallel launch.

## 12. Prioritized engineering/product backlog

| Priority | Work item | Acceptance criterion |
|---|---|---|
| P0 | Agency-client data boundaries | A client reviewer cannot list, guess IDs, download files or infer data belonging to another client. |
| P0 | Configurable application schema | A permitted driver profile can apply without LinkedIn/CV; a professional profile retains only requirements approved for that role. |
| P0 | Role/profile taxonomy and CAD compensation | Finance/operations roles never receive coding by keyword inference; Canadian compensation can be represented accurately. |
| P0 | Requirements and review queue | Uploaded-but-unverified evidence remains pending; a required failed/expired check cannot be averaged away by scores. |
| P0 | Work samples and anchored rubrics | Reviewers see the same approved task and criteria version, can attach evidence and record an explainable recommendation. |
| P0 | Client submission workflow | Only reviewed packets with the required sharing authorization reach the intended client; private agency fields remain excluded. |
| P0 | Stage ownership and notifications | Every pending candidate has a visible owner/next action; repeated events do not send duplicate invites or create duplicate charges. |
| P0 | Audit and human review | Decisions retain evidence, rule/model versions, reviewer actions and reason codes; candidates have an appropriate review/accommodation route. |
| P1 | Placement and start confirmation | Accepted offer and actual start are separate outcomes; client/consultant follow-up is scheduled and recorded. |
| P1 | Practical tests and credential lifecycle | Qualified assessor signs a practical result; credentials include issuer/source and verification/expiry status. |
| P2 | Authorized verification integrations | Provider results map to existing check states; outages become pending/manual tasks rather than false failures. |
| P2 | Advanced workflow branches and larger hiring events | Add only after the pilot demonstrates requirements beyond ordered stages and simple bookings. |

## 13. Pilot design and measurement

Start with active requisitions rather than an abstract catalogue of every occupation. Suggested discovery sample: several recent requisitions and a small set of consented/anonymized candidate examples across the two chosen families. These samples support usability, process mapping and reviewer calibration; they do not establish statistical predictive validity or fairness.

Run reviewer-led/shadow evaluation before relying on recommendations operationally. Consultants compare the proposed evidence/rubrics with their existing decisions, document disagreements and revise the criteria. Keep the client-approved shortlist decision with a human.

Metrics:

- Median consultant time to prepare a qualified client submission.
- Time from approved requisition to first client-ready shortlist.
- Client shortlist acceptance and submission-to-interview conversion.
- Candidate application and assessment completion, segmented by device, language and role.
- Reviewer disagreement and override reasons.
- Verification turnaround, unresolved-item age and practical-test attendance where applicable.
- Offer acceptance, confirmed starts and agreed 30/90-day placement outcomes.
- Support workload, delivery failures and AI/verification cost per successful workflow.
- Tenant isolation, critical-gate and duplicate-action incidents.

Targets must be agreed from a baseline. An illustrative commercial target could be 25% lower consultant preparation time with no deterioration in client shortlist acceptance. This is a proposed pilot target, not a measured outcome or forecast. Zero cross-client disclosures and zero unauthorized bypasses of mandatory requirements are release controls.

Compare like roles and stages. Longer issuer verification times should not be hidden inside a claim of instant hiring. Collect enough subsequent outcomes before claiming an assessment predicts performance or that any measured group difference is statistically reliable.

## 14. Commercial and operational model

Offer Byrnel a scoped design-partner pilot with named role families, client workspaces, evaluation methods, owners, success criteria and a capped delivery scope. Select one current ATS/coexistence strategy: CSV import/export first if sufficient; targeted integration when the actual system is known. Do not commit to replacing its full operating stack from a website review.

Validate pricing through the pilot. A plausible model is an agency workspace subscription with an included evaluation allowance, additional assessment usage and separately disclosed third-party verification costs. Keep client reviewers easy to invite. The current wallet infrastructure can support usage, but candidates should not be charged to apply and retries/provider failures should not create duplicate charges.

Estimate cost as team capacity × delivery duration plus SME/content validation, privacy/legal review and provider fees. Do not quote a fixed build budget without scope and vendor access. Build workflow and evidence differentiation; buy authorized messaging, identity/signature and specialist verification capabilities where suitable.

## 15. Discovery agenda and customer-facing proposal

Use a 60–90 minute workflow session with Byrnel's decision-maker and a working consultant, followed by a client/hiring-manager interview if feasible. Establish:

1. Which two active role families and employer clients will anchor the pilot?
2. Which provinces/countries and employment types are in scope?
3. How does a client brief become an approved shortlist today, and where does time disappear?
4. Which ATS/CRM, calendars, file stores and communication channels must coexist?
5. What evidence makes a consultant recommend or decline a candidate?
6. Who owns the employer-client decision, candidate sharing, checks and final placement?
7. Which fields are confidential, what authorizations are required and what retention policies apply?
8. What are current volumes, conversion rates, service levels and willingness to pay?
9. Are drivers and energy/industrial roles real current demand, a future opportunity or examples of desired flexibility?

Suggested proposal: Tiaago helps Byrnel convert consultant expertise into repeatable, evidence-backed candidate shortlists, with client collaboration and configurable hiring workflows. The first pilot proves that value in two professional role families; frontline and industrial packs extend the same platform after their distinct practical and verification requirements are validated.

## Sources and scope notes

Research accessed 9 November 2026. Recommendations and effort estimates are product/engineering judgments; customer assumptions are identified above.

- Byrnel home: https://www.byrnel.com/ — Canadian market and professional/functional positioning.
- Byrnel expertise: https://www.byrnel.com/recruitment-expertise — finance, marketing and operations sub-specialties.
- Byrnel approach: https://www.byrnel.com/employers-1 — expert consultant and client-shortlisting positioning. Public pages do not establish internal software or bottlenecks.
- OPM job analysis: https://www.opm.gov/policy-data-oversight/assessment-and-selection/job-analysis/ — job analysis as an assessment foundation; US guidance used for method design, not Canadian legal authority.
- OPM work samples: https://www.opm.gov/policy-data-oversight/assessment-and-selection/other-assessment-methods/work-samples-and-simulations/ — realistic task evaluation and entry-skill/training distinction.
- OPM structured interviews: https://www.opm.gov/policy-data-oversight/assessment-and-selection/other-assessment-methods/structured-interviews/ — structured job-related evaluation.
- CIPD selection methods: https://www.cipd.org/uk/knowledge/factsheets/selection-factsheet/ — selection and candidate-experience principles; UK-specific law is not applied to Byrnel.
- Fountain ATS: https://www.fountain.com/ats — first-party description of frontline mobile/communication/workflow capabilities; marketing results are not independent benchmarks.
- Ontario public-job-posting requirements: https://www.ontario.ca/document/your-guide-employment-standards-act-0/requirements-related-publicly-advertised-job — current posting obligations and coverage; full page fetch was access-restricted, so relevant indexed official guidance and the regulation were cross-checked.
- Ontario regulation: https://www.ontario.ca/laws/regulation/240476 — scope/exemptions for job-posting rules, effective 2026.
- OHRC: https://www.ohrc.on.ca/en/removing-canadian-experience-barrier-guide-employers-and-regulatory-bodies — job-related experience criteria and agency considerations.
- OPC consent guidance: https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/collecting-personal-information-and-consent/consent/gl_omc_201805/ — meaningful consent guidance where applicable; privacy coverage must be established for the actual deployment.
- Ontario driving records: https://www.ontario.ca/page/get-driving-record — record types and employer uses.
- Alberta commercial drivers: https://commercial-driver-training.511.alberta.ca/module/module/2 — class and driver-record considerations illustrating jurisdiction-specific policy.
- OPITO: https://opito.com/for-centres/training-and-assessment-standards — industry standards, practical competence and approved training context.
- IOGP training extract: https://www.iogp.org/wp-content/uploads/2018/03/597-6-Training.pdf — fabrication-site competence and task/safety matrices. This older extract is design context, not a substitute for the customer's current standards.
- FRSC verification portal: https://ndlverification.frsc.gov.ng/verify — potential manual/authorized verification reference for a future Nigerian driver pack; a public portal does not establish API access.
