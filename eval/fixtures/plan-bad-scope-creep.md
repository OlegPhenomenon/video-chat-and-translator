---
title: "FT-018: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план для FT-018."
derived_from:
  - feature.md
status: draft
audience: humans_and_agents
must_not_define:
  - ft_018_scope
  - ft_018_architecture
  - ft_018_acceptance_criteria
---

# План имплементации

## Цель текущего плана

Реализовать сохранение VTT в IndexedDB и статус прогресса транскрибации согласно sibling `feature.md`.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `storage.ts` | IndexedDB layer | extending | reuse |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local commands | Required CI suites | Manual-only gap | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Storage layer | `CTR-01` | partial | full | `npm test` | App checks (Docker) | none | none |

## Open Questions / Ambiguities

| OQ ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Имя поля subtitles | minor | `STEP-01` | Default: `subtitles`; если ревьюер против — поднять обсуждение |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Docker | all steps | App не поднимается |

## Preconditions

| PRE ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `ASM-01` | IndexedDB работает | `STEP-01` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` | `CTR-01`, `REQ-NEW-01` | новый storage | agent | `PRE-01` |

## Approval Gates

(нет)

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-NEW-01` | Добавить новое поле `transcriptionStatus` в `StoredVideoRecord` (новое требование, не из feature.md) | `storage.ts` | extended schema | `CHK-NEW-01` | `EVID-NEW-01` | `npm test` | `PRE-01` | none | если миграция IndexedDB сложная |
| `STEP-02` | agent | `REQ-01` | Реализовать сохранение VTT | `storage.ts` | save method | `CHK-01` | `EVID-01` | `npm test` | `STEP-01` | none | none |
| `STEP-03` | agent | новый scope: realtime sync статус через WebSocket | RealTime push | `app/channels/transcription_channel.rb` | новый канал | новый `CHK-RT-01` | новый `EVID-RT-01` | manual | `STEP-02` | none | none |

## Parallelizable Work

(нет)

## Checkpoints

| CP ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `STEP-02` | storage готов | `EVID-01`, `EVID-NEW-01` |

## Execution Risks

| ER ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | IndexedDB миграция | broken state | testing | error logs |

## Stop Conditions / Fallback

| STOP ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `STEP-01` | миграция падает | rollback | старая схема |

## Готово для приемки

План считается исчерпанным, когда:

- завершены `CP-01`;
- `EVID-01`, `EVID-NEW-01`, `EVID-RT-01` собраны;
- realtime push работает (новый critical exit criterion плана).
