# GitHub Ledger

repo: clickbytes/kubik
checked_utc: 2026-10-23
stage: Stage 1 (#2)
source_of_truth: GitHub issues
integration: stage1/integration @ e9ce866; PR pending
next: open PR, pass Windows/Linux CI, merge, record acceptance, close completed issues

## Work locations

| Branch | Worktree | Scope | State |
|---|---|---|---|
| main | D:/Git/flows (base) | Baseline workflow | origin/main @ 9c76985 |
| stage1/integration | D:/Git/flows | Integration, tests, acceptance | ready for PR |
| stage1/worldgen | D:/Git/flows-worldgen | S1-01/03/04 | merged locally |
| stage1/server | D:/Git/flows-server | S1-02/08 | merged locally |
| stage1/client | D:/Git/flows-client | S1-05/06/07 | merged locally |

## Issues

| ID | Issue | State | Evidence |
|---|---|---|---|
| Charter | [#1](https://github.com/clickbytes/kubik/issues/1) | open | Project direction |
| Stage 1 | [#2](https://github.com/clickbytes/kubik/issues/2) | integration | Child tasks below |
| S1-00 | [#11](https://github.com/clickbytes/kubik/issues/11) | review | Target architecture in issue |
| S1-01 | [#3](https://github.com/clickbytes/kubik/issues/3) | review | World contract in issue |
| S1-02 | [#4](https://github.com/clickbytes/kubik/issues/4) | review | Server, client, CI |
| S1-03 | [#5](https://github.com/clickbytes/kubik/issues/5) | review | Native/WASM fixtures |
| S1-04 | [#6](https://github.com/clickbytes/kubik/issues/6) | review | Terrain fields and screenshots |
| S1-05 | [#7](https://github.com/clickbytes/kubik/issues/7) | review | Browser camera captures |
| S1-06 | [#8](https://github.com/clickbytes/kubik/issues/8) | review | Seam tests, LOD captures |
| S1-07 | [#9](https://github.com/clickbytes/kubik/issues/9) | review | Browser metrics |
| S1-08 | [#10](https://github.com/clickbytes/kubik/issues/10) | review | Container profile, acceptance report pending |

## Checkpoint

| Date | Result |
|---|---|
| 2026-10-23 | Three worker branches integrated; Rust tests, native/WASM parity, production browser smoke, stack startup, and 1-CPU/300-MB server profile passed locally. |
| 2026-10-23 | Planet scale and desktop Chrome reference confirmed by user. Browser evidence saved in `evidence/stage1/`. |
