# GitHub Ledger

repo: clickbytes/kubik
checked_utc: 2026-10-23
branch: stage1/integration (from origin/main)
worktree: D:/Git/flows (primary)
active: Stage 1 batch #2; client ground-view fix and coordinator acceptance checks
next: verify ground zoom and seams, finalize S1-01 contract, open and merge tested integration PR

## Issues

| ID | Issue | Parent | GitHub | Local | Branch / worktree |
|---|---|---|---|---|---|
| CHARTER | [#1](https://github.com/clickbytes/kubik/issues/1) | — | open | in_progress | main / primary |
| S1-E | [#2](https://github.com/clickbytes/kubik/issues/2) | — | open | planned | main / primary |
| S1-00 | [#11](https://github.com/clickbytes/kubik/issues/11) | #2 | open | in_progress | main / primary |
| S1-01 | [#3](https://github.com/clickbytes/kubik/issues/3) | #2 | open | in_progress | stage1/worldgen / D:/Git/flows-worldgen |
| S1-02 | [#4](https://github.com/clickbytes/kubik/issues/4) | #2 | open | in_progress | stage1/server and stage1/client / separate worktrees |
| S1-03 | [#5](https://github.com/clickbytes/kubik/issues/5) | #2 | open | in_progress | stage1/worldgen / D:/Git/flows-worldgen |
| S1-04 | [#6](https://github.com/clickbytes/kubik/issues/6) | #2 | open | in_progress | stage1/worldgen / D:/Git/flows-worldgen |
| S1-05 | [#7](https://github.com/clickbytes/kubik/issues/7) | #2 | open | in_progress | stage1/client / D:/Git/flows-client |
| S1-06 | [#8](https://github.com/clickbytes/kubik/issues/8) | #2 | open | in_progress | stage1/client / D:/Git/flows-client |
| S1-07 | [#9](https://github.com/clickbytes/kubik/issues/9) | #2 | open | in_progress | stage1/client / D:/Git/flows-client |
| S1-08 | [#10](https://github.com/clickbytes/kubik/issues/10) | #2 | open | planned | main / primary |

## Active workers

| Worker | Scope | Branch | Worktree | Next |
|---|---|---|---|---|
| native agent: client | S1-05/06/07; `apps/client/**` | stage1/client | D:/Git/flows-client | Ground clearance, visible budget, frustum fix |
| coordinator | Integration/S1-01/08; root files | stage1/integration | D:/Git/flows | Browser checks, contract, PR, merge |

## Local state

| Files | Git state | Related work |
|---|---|---|
| GITHUB.md | modified | Stage 1 execution checkpoint |

## Log

| UTC date | Item | Location | Result |
|---|---|---|---|
| 2026-10-23 | Workflow | main / primary | Local rules, issue forms, and skills prepared; no commit yet. |
| 2026-10-23 | Identity | main / primary | `repo-check.ps1` now selects the mapped account and local Git author; KUBIK check passed. |
| 2026-10-23 | Stage 1 planning | main / primary | Charter #1, epic #2, and tasks #3–#10 published. |
| 2026-10-23 | Agent coordination | main / primary | Defined coordinator intake, worker assignment, OpenCode model selection, handoff, integration, and interruption flow in `AGENTS.md`. |
| 2026-10-23 | S1-00 architecture | main / primary | Expanded #11 into the first Stage 1 task with a module/interface sketch; linked it from #2–#4 and `MAP.md`. |
| 2026-10-23 | Stage 1 batch | main + three worktrees | Pushed baseline commit `9c76985`; assigned separate worldgen, server, and client branches. |
| 2026-10-23 | Integration | stage1/integration / primary | Reviewed and merged server, worldgen, and client slices; Rust and native/WASM checks pass; browser ground-view fixes remain. |
