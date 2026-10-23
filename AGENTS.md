# Agent Instructions

## Project configuration

```yaml
project_phase: bootstrap # bootstrap | prototype | production | maintenance
architecture_status: evolving # not_established | evolving | established
change_strategy: incremental
migration_authorization: explicit_user_request_required
rewrite_authorization: explicit_user_request_required
test_policy: stage_1_reproducibility_and_resource_checks
```

- Write all project content in English. The user may provide input in any language; translate it before adding it to project files, issues, or Git history.
- Treat these fields as policy and project maturity, not a task log. Update factual fields when the repository changes; change authorization fields only when the user changes the policy. Track active work in `GITHUB.md`.
- Keep changes within the user's requested scope. Do not start a V2 rewrite, migration, framework replacement, or broad test-suite build unless explicitly requested. If one is necessary to complete the task, explain the concrete blocker before expanding scope.
- KUBIK's approved current scope is Stage 1: repository bootstrap and deterministic spherical world generation. The working stack is Rust/Axum, TypeScript/Vite, Three.js/WebGL2, and a shared Rust generator compiled to WASM; SQLite WAL is the later persistence choice. Defer multiplayer, countries, NPCs, combat, economy, and persistent 24/7 simulation until a later stage is approved.
- Design for a browser client and a future 10-player server limited to 1 vCPU and 300 MB for the entire server environment. The browser may generate and render terrain; the server remains authoritative for game state. Record measured performance rather than claiming it from design alone.

## Coordination

- The main agent is the coordinator. It owns intake, issue/task decomposition, assignments, dependency order, integration, GitHub state, and the final result. Workers own bounded deliverables; worker completion never substitutes for coordinator review.
- Classify incoming input before acting: a large brief becomes linked issues and dependency-ready tasks; a short instruction steers the active task; an interruption or correction updates the affected assignments. Preserve the current objective unless the user clearly cancels or replaces it. Ask only about decisions that block progress, and continue independent work while waiting.
- Reconcile the current branch, worktree, dirty files, `GITHUB.md`, and relevant GitHub issues before assigning work. Prefer the smallest useful set of tasks with explicit acceptance criteria and dependencies. Assign only tasks whose prerequisites are met; keep speculative later-stage work out of the active queue.
- Delegate when tasks can progress independently or a separate review materially helps. Use available native subagents or OpenCode workers; do not create agents just to make a trivial task look parallel. Keep shared files and final integration under one owner. Parallel workers must have separate file ownership or isolated worktrees and a clear integration order.
- On an unborn branch, parallelize read-only planning and review; create the initial commit before assigning separate implementation branches or worktrees. Do not imply that an uncommitted local file exists in another worktree.
- Give each worker a brief containing: issue/local ID, outcome, relevant links/context, exact file ownership, branch and worktree, dependencies, constraints, acceptance criteria, focused checks, and handoff format. Record active worker, tool/model, location, and next action compactly in `GITHUB.md`; remove stale assignments when work ends.
- Workers report changed files or commits, acceptance evidence, checks run, blockers, and next action. The coordinator checks the diff and evidence, resolves overlap, runs the necessary integration checks, then updates the issue and `GITHUB.md`. Mark an item `done` only after its criteria and integration are complete.
- On new guidance during active work, notify affected workers, stop or revise obsolete assignments, and preserve useful completed work. On interruption, checkpoint the exact issue, branch/worktree, dirty files, worker state, blocker, and next action in `GITHUB.md` so a context-free resume can continue without repeating work.
- Give concise progress updates during sustained work and continue until the requested result is complete.

## OpenCode workers

- Run `opencode models` when selecting a model for a delegated task. It lists models, not configured agents. Choose a model for the task's required capability, availability, cost, and latency; do not hard-code today's catalog into project policy.
- Use `opencode run --model provider/model` for a bounded task after checking the installed CLI help. Use `--agent` only when that agent is configured and its role is known. Pass the worker brief and relevant issue links, not an unrestricted mandate to redesign the project.
- Give OpenCode the same branch/worktree and file boundaries as native subagents. Capture its session or command, result, and checks in the handoff. Review its changes and claims as external contributions before integration. If a model or runtime fails, reassign the task or perform it directly; keep the issue and ledger accurate.

## Sources of truth

- Git and GitHub provide live code, branch, worktree, issue, and PR state. GitHub issues hold detailed requirements and decisions. `MAP.md` links project areas to canonical issues. `GITHUB.md` is a concise local checkpoint and progress ledger.
- On a context-free resume, branch/worktree switch, or material progress change, use the repository skill `project-resume` to reconcile `GITHUB.md` with live state. Read only the project material relevant to the task.
- Use the repository skill `issue-spec` when converting notes into an epic, task, or bug issue. Use `.github/ISSUE_TEMPLATE/` forms. Every requirement must have an atomic, observable completion condition; factual context must have enough evidence to be useful.
- Keep one compact `GITHUB.md` row per known epic and issue, including closed items. Use local states `planned`, `in_progress`, `blocked`, `done`, and `unassigned_needs_triage`; never infer GitHub state from the ledger alone.
- Map dirty files or coherent file groups to issues using evidence. Preserve unrelated or uncertain changes and mark uncertain associations `unassigned_needs_triage`.
- Before coding, record the intended branch and worktree in the linked issue when that update is authorized, or in `GITHUB.md`. Resolve any `TBD`. Use the current branch/worktree for sequential work unless isolation is useful; create a separate worktree for parallel work or when requested. Record the actual location after switching.
- A request to work on a linked issue includes keeping that issue accurate within its scope. Creating unrelated issues, posting comments, pushing, or opening a PR requires authorization from the task. If no issue exists, keep a local task in `GITHUB.md` and draft issue text when useful.

## Tools and portability

- Keep scripts and paths usable on Windows and Linux. Avoid machine-specific paths or secrets in tracked files.
- Use RTK as the shell-command prefix when installed; use `rtk proxy` for commands it cannot handle. If RTK is unavailable, use the system shell directly.
- If `.codegraph/` exists, use CodeGraph before broad text search. Prefer its MCP tools, then CLI. Do not create an index without a request; sync an existing index only when stale.
- Use `gh` for live GitHub state when available. Before commits or authenticated GitHub writes, verify repository identity. On Windows, run `& "$env:USERPROFILE\.codex\scripts\repo-check.ps1"` from the repository; add `-CheckRemoteAuth` for SSH. The helper selects the mapped GitHub CLI account and repository-local Git author for a uniquely recognized origin. Use `-ReadOnly` for an audit without changes. Stop on `MISMATCH` or unresolved `REVIEW`, and explain the failed or incomplete check. A `gh` login alone does not prove HTTPS Git identity unless Git uses the GitHub CLI credential helper. On Linux or without the helper, verify origin owner, Git author, and active GitHub account; switch only when the mapping is unambiguous and confirm the result.
- Follow relevant `SKILL.md` and nested `AGENTS.md` instructions. Inspect existing conventions before code changes. Run only focused checks that fit the task and the configured test policy; report what actually ran and any remaining limitation.
