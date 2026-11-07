# ADR-0001: Plan before application implementation

Date: 2026-11-07
Status: Accepted

Context: User invoked plan-before-implementation; six memory files were missing.
Decision: Create required documentation, audit source and present the plan before changing code, dependencies or configuration.
Consequences: Documentation exists; application implementation was subsequently approved by the user (“go”).
Related files: IMPLEMENTATION_PLAN.md, docs/TASK_LOG.md

# ADR-0002: Preserve upstream license

Date: 2026-11-07
Status: Accepted

Context: Audited EnguiStudio license is noncommercial, not MIT. User explicitly selected preservation of that license.
Decision: Preserve original license/attribution. Make MIT/Apache-2.0 distribution conditional on upstream permission; do not label this derivative OSI open source.
Consequences: Noncommercial derivative path can be planned. Worker redistribution rights remain unverified; no upstream worker copying is planned. Dependencies require separate review.
Related files: ARCHITECTURE.md, docs/UPSTREAM_IMPORT_MANIFEST.md

# ADR-0003: R2-first direct SDK storage

Date: 2026-11-07
Status: Accepted

Context: User said “I don't want to use AWS CLI” and “I will use Cloudflare R2 mostly”. Upstream currently launches AWS CLI and assumes mounted Runpod paths.
Decision: Default storage onboarding to R2; use S3 SDK APIs directly. No AWS CLI requirement in app or worker examples. Keep other compatible profiles.
Consequences: Rewrite the storage facade and verify R2 multipart/presign/checksum behavior. R2 does not require an AWS account; SDK naming is independent of service choice.
Related files: ARCHITECTURE.md, docs/API_CONTRACTS.md

# ADR-0004: Preserve Next server with managed native lifecycle

Date: 2026-11-07
Status: Deprecated

Context: Existing server routes, Prisma and Remotion cannot be preserved by static export; custom server and standalone output cannot be combined.
Decision: Tauri owns bundled Node custom HTTP launcher, normal Next production build/dependencies, authenticated loopback and private credential IPC. Data lives outside app bundle.
Consequences: Larger packaging. Superseded as an implementation commitment by ADR-0006; reevaluate runtime only after prototype gate. Existing edits are preserved.
Related files: ARCHITECTURE.md, IMPLEMENTATION_PLAN.md

# ADR-0005: Durable immutable jobs and selected project revisions

Date: 2026-11-07
Status: Proposed

Context: Poll failures must not duplicate paid jobs; teams need shared media without SQLite conflicts.
Decision: Persist immutable job snapshots and submission intent; expose uncertain POST reconciliation. Keep SQLite local; publish selected immutable R2 revisions with conditional head updates.
Consequences: No exactly-once claim without provider support; revision conflicts are explicit. Legacy InfiniteTalk output needs a conformant worker for durable R2 acceptance.
Related files: docs/API_CONTRACTS.md, IMPLEMENTATION_PLAN.md

# ADR-0006: Validate backend and original UI before choosing foundation

Date: 2026-11-07
Status: Accepted

Context: User explicitly corrected the Engui-first strategy and requested immediate audit, independent harness and local mock tests.
Decision: Audit → independent API tests → original unchanged Engui comparison → architecture choice → browser prototype → Tauri → expansion. Stop major UI/native/release work now; preserve existing edits.
Consequences: Source audit and 10 local harness tests complete. Real endpoint/R2 and original comparison remain pending. PARTIALLY REUSE is provisional, not a passed final gate. Earlier push/tag authorization is deferred by this ordering.
Related files: ENGUI_FEASIBILITY.md, ENDPOINT_COMPATIBILITY.md, ARCHITECTURE_OPTIONS.md, PROTOTYPE_PLAN.md, RUNPOD_SMOKE_TESTS/

# ADR-0007: CPU-first bounded serverless validation

Date: 2026-11-07
Status: Accepted

Context: User wants cheapest micro-resolution tests, CPU if possible, with no always-on workers.
Decision: Local mocks first; then explicitly authorized CPU queue on smallest suitable quoted class, min 0/max 1, short idle, no volume. Real model tests require exact worker/hardware contract and selected cost ceiling.
Consequences: No paid request/deployment performed. CPU price must be quoted in Console. Local reservation ledger and job TTL cannot guarantee provider spending caps; billable cold start/idle and storage remain distinct.
Related files: RUNPOD_SMOKE_TESTS/README.md, PROTOTYPE_PLAN.md

# ADR-0008: Permit user-installed FFmpeg and available codecs

Date: 2026-11-07
Status: Accepted

Context: User explicitly allows system/preinstalled FFmpeg and wants to use non-free codecs.
Decision: Future media integration permits user-selected system FFmpeg/ffprobe and detects available codec capabilities. Do not impose a free-codec-only runtime restriction.
Consequences: Safe argument execution and path validation still apply. Redistributing any chosen binary has separate license/patent obligations; no automatic permission to bundle it is inferred. Implementation follows prototype scope.
Related files: ARCHITECTURE_OPTIONS.md, PROTOTYPE_PLAN.md

# ADR-0009: Resume native desktop without bundled Node

Date: 2026-11-07
Status: Accepted

Context: User objected to the large Node-based bundle and approved compiled React + Rust with “pls do it”.
Decision: Resume local native implementation using static Vite/React, Rust services, SQLite and Keychain; retain Next browser mode separately. Supersede ADR-0006's local implementation pause, while retaining unverified live-cloud/original-comparison gates.
Consequences: Approximately 10 MiB local build, no Node/Chromium or bundled media tools. No claim of real cloud inference or Remotion feature parity. Initial implementation commit authorized; earlier release/tag publication was deferred.
Related files: docs/NATIVE_MIGRATION_PLAN.md, src-tauri/, desktop/frontend/

# ADR-0010: Welcome examples before storage configuration

Date: 2026-11-07
Status: Proposed

Context: User cannot find a practical welcome workflow and requested a Base44 prompt.
Decision: Design a first-run gallery and local ComfyUI/Runpod walkthrough using existing Oopsie assets; move optional R2 setup below the first workflow. Distinguish synthetic CPU tests, actual GPU inference and planned FLUX.3 integration.
Consequences: Prompt and setup guide created; expanded welcome/DnD/video tests still require implementation. FLUX.3 Video has a separate proposed API plan; no adapter or paid call implied.
Related files: docs/BASE44_WELCOME_PROMPT.md, docs/SETUP.md, docs/FLUX3_INTEGRATION_PLAN.md

# ADR-0011: Standalone main snapshot with retained legacy branch

Date: 2026-11-07
Status: Accepted

Context: User requested a fresh initial commit on main and renaming the old branch without a codex prefix.
Decision: Rename old main to legacy-before-native; create a parentless initial commit on main. Remove former account links from the snapshot while preserving original copyright, noncommercial license and source reference attribution.
Consequences: Old commits remain reachable locally on legacy-before-native. The new main has independent ancestry; no remote history rewrite, push or release tag is performed by this step.
Related files: docs/UPSTREAM_IMPORT_MANIFEST.md, LICENSE.md, docs/REQUIREMENTS_STATUS.md
