---
title: "FT-016: Feature Package"
doc_kind: feature
doc_function: index
purpose: "Bootstrap-safe навигация по документации фичи: сначала canonical `feature.md`, а derived docs добавляются после появления."
derived_from:
  - ../../dna/governance.md
  - feature.md
status: active
audience: humans_and_agents
---

# FT-016: Feature Package

## О разделе

Этот feature package фиксирует canonical требования и verify-контракт для фичи “Субтитры для загруженных видео”. Derived execution-документы (например, `implementation-plan.md`) будут добавлены после прохождения gate-ревью `feature.md`.

## Аннотированный индекс

- [`feature.md`](feature.md)
  Читать, когда нужно: увидеть scope, дизайн, verify и стабильные идентификаторы (REQ/NS/SC/CHK/EVID) для реализации.
- [`implementation-plan.md`](implementation-plan.md)
  Читать, когда нужно: увидеть sequencing выполнения, discovery context, test strategy и execution risks (derived).
