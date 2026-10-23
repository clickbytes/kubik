# GitHub Ledger

repo: clickbytes/kubik
checked_utc: 2026-10-23
branch: main
merged_commit: 4f340fb (PR #12)
worktree: D:/Git/flows (primary)
stage: Stage 1 complete; later stages unapproved
next: await a new approved stage or issue; resume from main and reconcile GitHub issues

## Issues

| Item | GitHub | State |
|---|---|---|
| Charter | [#1](https://github.com/clickbytes/kubik/issues/1) | open; later scope remains proposed |
| Stage 1 epic | [#2](https://github.com/clickbytes/kubik/issues/2) | closed; acceptance report linked |
| S1-00 architecture | [#11](https://github.com/clickbytes/kubik/issues/11) | closed |
| S1-01 contract | [#3](https://github.com/clickbytes/kubik/issues/3) | closed |
| S1-02 bootstrap | [#4](https://github.com/clickbytes/kubik/issues/4) | closed |
| S1-03 worldgen | [#5](https://github.com/clickbytes/kubik/issues/5) | closed |
| S1-04 terrain | [#6](https://github.com/clickbytes/kubik/issues/6) | closed |
| S1-05 viewer | [#7](https://github.com/clickbytes/kubik/issues/7) | closed |
| S1-06 LOD | [#8](https://github.com/clickbytes/kubik/issues/8) | closed |
| S1-07 metrics | [#9](https://github.com/clickbytes/kubik/issues/9) | closed |
| S1-08 acceptance | [#10](https://github.com/clickbytes/kubik/issues/10) | closed |

## Work locations

| Branch | Worktree | Status |
|---|---|---|
| main | D:/Git/flows | active; PR #12 merged |
| stage1/integration | branch retained, primary worktree switched to main | merged; inactive |
| stage1/worldgen | D:/Git/flows-worldgen | merged; inactive worktree retained |
| stage1/server | D:/Git/flows-server | merged; inactive worktree retained |
| stage1/client | D:/Git/flows-client | merged; inactive worktree retained |

## Log

| Date | Result |
|---|---|
| 2026-10-23 | [PR #12](https://github.com/clickbytes/kubik/pull/12) merged as 4f340fb. Final Windows/Linux [CI run](https://github.com/clickbytes/kubik/actions/runs/39977746918) passed. |
| 2026-10-23 | [Chrome evidence](evidence/stage1/metrics.json): production preview, 144 FPS, frame p95 <=7.1 ms, chunk p95 <=0.6 ms; selected orbit IDs identical after reload. |
| 2026-10-23 | Server Stage 1 HTTP profile: 1 CPU, 300 MB container, 1,000 requests, cgroup peak 5,914,624 bytes. Full method and scope: [S1-08 #10](https://github.com/clickbytes/kubik/issues/10). |
