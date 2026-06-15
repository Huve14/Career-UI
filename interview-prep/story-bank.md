# Story Bank — Master STAR+R Stories

This file accumulates your best interview stories over time. Each evaluation (Block F) adds new stories here. Instead of memorizing 100 answers, maintain 5-10 deep stories that you can bend to answer almost any behavioral question.

## How it works

1. Every time `/career-ops oferta` generates Block F (Interview Plan), new STAR+R stories get appended here
2. Before your next interview, review this file — your stories are already organized by theme
3. The "Big Three" questions can be answered with stories from this bank:
   - "Tell me about yourself" → combine 2-3 stories into a narrative
   - "Tell me about your most impactful project" → pick your highest-impact story
   - "Tell me about a conflict you resolved" → find a story with a Reflection

## Stories

<!-- Stories will be added here as you evaluate offers -->
<!-- Format:
### [Theme] Story Title
**Source:** Report #NNN — Company — Role
**S (Situation):** ...
**T (Task):** ...
**A (Action):** ...
**R (Result):** ...
**Reflection:** What I learned / what I'd do differently
**Best for questions about:** [list of question types this story answers]
-->

### [Security / Incident Response] PHP Backdoor Breach Containment
**Source:** Report #005 — Supabase — Database Support Engineer (EMEA)
**S (Situation):** A live production e-commerce site was actively breached via a PHP backdoor, putting customer data and uptime at risk.
**T (Task):** Contain the breach immediately, restore uptime, and prevent recurrence — all while the site was live and serving customers.
**A (Action):** Identified malicious PHP files, removed the backdoor, implemented WAF rules and permanent security monitoring to detect future attempts.
**R (Result):** 99%+ uptime restored; permanent monitoring in place; no recurrence since remediation.
**Reflection:** Reactive incident response is expensive. Would instrument continuous security monitoring from day one rather than waiting for a breach to trigger it.
**Best for questions about:** production incident response, security, working under pressure, debugging live systems, prioritizing uptime

### [Debugging / Observability] n8n + Claude API Agent Pipeline Failure
**Source:** Report #005 — Supabase — Database Support Engineer (EMEA)
**S (Situation):** An autonomous executive reporting agent built on n8n and Claude API started returning hallucinated or stale data, causing incorrect information to reach senior leadership.
**T (Task):** Diagnose the root cause in a multi-step agentic pipeline where failure could occur at any stage (webhook, n8n logic, LLM prompt, output formatting).
**A (Action):** Traced webhook triggers through n8n execution logs, identified a prompt regression causing the LLM to produce bad outputs, fixed the prompt and added test cases to catch regressions.
**R (Result):** Agent now runs autonomously with zero manual intervention and consistent output quality.
**Reflection:** Observability in agentic systems is non-negotiable. Build logs, traces, and output validation before shipping — not after the first production failure.
**Best for questions about:** debugging distributed systems, AI/agent reliability, root cause analysis, production quality, autonomous systems

### [Integration / Efficiency] REST API to Zoho Analytics Automation
**Source:** Report #002 — Anthropic — IT Systems Engineer, Enterprise SaaS
**S (Situation):** Marketing2theMax had 12+ manual spreadsheet reports updated weekly by 3 staff members — error-prone, slow, and blocking executive decisions.
**T (Task):** Replace manual spreadsheet workflows with live, automated dashboards fed by production data.
**A (Action):** Designed a REST API data pull pipeline into Zoho Analytics; wrote ETL scripts; version-controlled the configuration in Git; ran parallel validation before switching off the manual process.
**R (Result):** 60% reduction in reporting workload; reports now update in real time; staff time reallocated to analysis rather than data entry.
**Reflection:** I underestimated how much time the data validation layer would take. Build data quality checks first, then the pipeline — bad data in a live dashboard is worse than a manual one.
**Best for questions about:** automation wins, integration engineering, reducing manual work, stakeholder-facing tooling, time-to-insight improvement

### [Scale / Governance] M365 Enterprise for 250+ Users Across SA and UAE
**Source:** Report #002 — Anthropic — IT Systems Engineer, Enterprise SaaS
**S (Situation):** Rapid headcount growth across two countries with no consistent IAM or data compliance controls — access was managed ad hoc, creating compliance and security risk.
**T (Task):** Unify identity and access management under one governance model while meeting POPIA compliance requirements.
**A (Action):** Deployed Entra ID conditional access policies; configured Purview data classification labels; structured SharePoint permission inheritance; documented policies and ran team lead training.
**R (Result):** Consistent access controls across both regions; POPIA compliance achieved and auditable; onboarding time for new staff cut significantly.
**Reflection:** Cross-regional deployments need timezone-aware rollout planning. The UAE team happened to be online during our maintenance window — luck, not planning. Now I map time zones before scheduling any system change that affects multiple regions.
**Best for questions about:** enterprise IT governance, identity management, compliance, multi-regional operations, stakeholder management

---

### [Data Products] GTM Reporting Automation — Metric Definition & Dashboard Ownership
**Source:** Report #004 — Supabase — Staff Data Analyst, GTM
**S (Situation):** Marketing2theMax had multiple campaign reports circulating with conflicting metrics — no single source of truth, no documented definitions.
**T (Task):** Build a live, trusted data product from scratch that the exec team could rely on without analyst mediation.
**A (Action):** Engineered a REST API → Zoho Analytics pipeline; defined and documented all metric logic; built self-service dashboards; trained executive users.
**R (Result):** 60% reduction in manual reporting workload; dashboards became the authoritative metric source for executive decisions.
**Reflection:** Should have locked metric definitions first — two reports were rebuilt mid-project when definitions shifted. Data product ownership starts with the definition layer, not the dashboard layer.
**Best for questions about:** data product ownership, canonical metrics, GTM analytics, building from scratch, stakeholder enablement

---

### [Greenfield] End-to-End Analytics Stack Build (Fortune3HSK)
**Source:** Report #004 — Supabase — Staff Data Analyst, GTM
**S (Situation):** Enterprise client had no data infrastructure — three disconnected operational systems, no reporting, no warehouse.
**T (Task):** Design and deliver a complete ETL pipeline and BI layer in under 8 weeks.
**A (Action):** Selected PostgreSQL as the warehouse, built transformation scripts, connected Zoho Analytics as the BI layer, documented the full data model.
**R (Result):** Delivered a working analytics stack in 6 weeks; client went from zero reporting to weekly executive dashboards.
**Reflection:** Would use dbt-style transformation conventions even on small stacks — skipping documentation early created tech debt by month three that cost more time than the shortcut saved.
**Best for questions about:** greenfield data builds, architecture decisions, working autonomously, speed of delivery, founder mindset
