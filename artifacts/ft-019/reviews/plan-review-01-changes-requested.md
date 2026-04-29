# FT-019 Plan Review 01

FT-019 `implementation-plan.md` review received in chat on 2026-04-22.

Reviewer verdict:

- not yet ready to approve;
- fix content-level gaps F1-F6 before moving plan to `status: active`.

Required fixes captured from review:

- F1: add explicit regression coverage that invalid VTT must not remove or degrade existing HTML5 `<track>` behavior.
- F2: add `artifacts/ft-019/verify/chk-02/` to Environment Contract and to `STEP-06` evidence flow.
- F3: decouple simplify review from `CHK-02`; keep it as separate verification context.
- F4: make `STEP-01` contract freeze explicit before any `STEP-01` / `STEP-02` parallelism.
- F5: remove review evidence namespace collision with sibling `feature.md`; use plan-scoped review IDs.
- F6: explicitly record `UC-*` stance for this feature package.

Nice-to-have follow-ups from review:

- N1: spell out Tailwind `lg` breakpoint in `OQ-01`.
- N2: if Playwright infra gap remains, create follow-up issue/ADR before feature closure.
- N3: remove non-template wording like “support for” from `STEP-05`.
- N4: mention `EC-01..03` explicitly in acceptance completion criteria.
- N5: phrase branching rule as a requirement rather than a stale planning snapshot.
