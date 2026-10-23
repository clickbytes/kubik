---
name: issue-spec
description: Turn a project brief, bug report, or task request into a precise GitHub epic, task, or bug issue with verifiable completion criteria and an execution plan.
---

# Issue Specification

Use this skill when drafting, reviewing, or updating an issue specification. A short follow-up to active work does not need a new issue unless it changes the deliverable.

1. Choose the matching form in `.github/ISSUE_TEMPLATE/` and identify any parent epic or related issue. Split a large brief into bounded issues only where the outcomes can be completed independently.
2. Extract the outcome, factual context and evidence, included scope, exclusions, dependencies, and open decisions. Do not introduce a rewrite, migration, new framework, or broad tests unless the request authorizes them.
3. Write each requirement as one atomic acceptance criterion with an observable pass condition and a way to verify it. Replace vague terms with measurable behavior. Keep factual context only when it explains a decision or condition.
4. State the branch plan and worktree plan explicitly: existing/current or exact proposed new name/location. `TBD` may remain in a planning draft but must be resolved before implementation.
5. Check that the objective, scope, dependencies, and criteria agree, that every normative sentence maps to a completion condition, and that the proposed issue can be completed without hidden decisions.
6. If issue creation or editing is authorized and the repository is connected, use the required identity check before the GitHub write. Then update `MAP.md` links and `GITHUB.md` status. Otherwise return a ready-to-publish draft and keep local progress accurate.

Use the issue as the detailed specification; keep `MAP.md` navigational and `GITHUB.md` concise.
