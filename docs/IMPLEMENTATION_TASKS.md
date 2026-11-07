# Implementation tasks

Status: planning only. All unchecked tasks require implementation approval.

| ID | Phase | Depends on | Concrete completion evidence |
| --- | --- | --- | --- |
| A0 | Audit | — | Done: sources/license/paths/contracts inspected; references recorded |
| A1 | Plan | A0 | Done: architecture, file map, risks, verification, licensing/R2 decisions documented |
| P0 | Baseline | Approval | Attributable import, baseline build evidence, dependency notices and 12 payload fixtures |
| P1 | Native proof | P0 | Secure managed Node/Tauri lifecycle, writable paths, Keychain migration and browser parity |
| P2 | Packaging | P1 | Restricted-PATH arm64 app with Node/Prisma/FFmpeg/browser, offline media render and tag-only CI |
| P3 | Registries | P0,P1 | Endpoint/workflow contracts, all built-in adapters and mocked submit/status/cancel coverage |
| P4 | Forms | P3 | Every requested control, graph import and exact declared-node mapping tests |
| P5 | Artifacts | P3,P4 | Versioned artifact registry, semantic LoRA compatibility and verified download hashes |
| P6 | R2 pipeline | P1,P3,P5 | SDK transfers/resume/abort, private outputs, team revision conflict/import tests |
| P7 | Jobs/security | P2,P3,P4,P5,P6 | Durable state/restart/cancel/cost tests, no duplicate paid POST, safe routes |
| R0 | Release readiness | P7 | All acceptance evidence, version checks, README.ru and signed/unsigned status documented |

Security/path/credential fixes start in P1; persistence primitives land with their owning phases, not deferred to a final security pass. Final job orchestration depends on the earlier registries/transfers.

## Acceptance trace

| User criterion | Task/evidence |
| --- | --- |
| 1. Standalone macOS launch | P2 restricted-PATH packaged-app smoke |
| 2. Backend starts/stops | P1 supervisor tests and P2 process-tree inspection |
| 3. Existing pages work | P0 baseline, P4/P7 retained editor/browser regression |
| 4. InfiniteTalk image/audio | P3 verified payload fixtures; later budget-authorized live endpoint smoke |
| 5. Independent endpoints | P3 multiple profiles/endpoint selection tests |
| 6. Custom ComfyUI import | P4 bounded API-graph import test |
| 7. Correct node mapping | P4 unchanged graph except declared input assertions |
| 8. Reject incompatible LoRA | P5 pre-submission architecture/base tests |
| 9. Multiple LoRA strengths | P4/P5 independent model/clip/stage controls |
| 10. External input/output S3 | P6 mocked + R2 conformance and conformant worker output; unchanged legacy worker is blocked |
| 11. Restart-visible completed job | P7 disposable SQLite restart/reconcile test |
| 12. No permanent GPU | P3/P7 queue-based endpoint flow, no persistent deployment created by app |
| 13. No global Node/Homebrew | P2 clean arm64 app smoke; also no AWS CLI |

## Commit/release discipline
- Each focused implementation step: human-readable commit, CHANGELOG entry and synchronized version bump.
- No commits, tags or application changes have been made during planning.
- Normal CI validates changes; only explicit matching `vX.Y.Z` tags trigger arm64 binary builds.
- Record actual checks and failures in TASK_LOG; never check a task based on source presence alone.
- Live GPU calls, container deployment and publishing need separate explicit operational authorization.
