---
name: project-resume
description: Reconcile the project checkpoint with Git, worktrees, and relevant GitHub issues when resuming without context or changing execution location.
---

# Project Resume

Restore a reliable next action from the local ledger and live sources. Use this skill for a context-free resume, a branch or worktree handoff, or a requested project status reconciliation. Ordinary small edits do not need it.

1. Read `GITHUB.md`. Use `MAP.md` only to resolve project areas and issue links needed for the active work.
2. Inspect the current branch, `git status`, staged and unstaged changes, untracked paths, remotes, and `git worktree list`. If the directory is not a Git repository, record that fact and skip Git-only checks.
3. When a repository and GitHub access exist, verify the relevant epic, issue, and PR states with `gh`. Keep the time of the Git check separate from the time of the GitHub check; mark unavailable checks explicitly.
4. Associate changed paths with work items only when the active task, branch, issue reference, history, or file content supports the association. Keep uncertain paths as `unassigned_needs_triage`. Preserve all local changes.
5. Reconcile `GITHUB.md`: update its active checkpoint, work items, execution locations, local changes, and a brief progress entry only when work materially changed. Keep the ledger compact and retain known issue rows.
6. Report the verified objective, branch/worktree, next concrete action, blockers, and any uncertain change association. Continue authorized work from that checkpoint.

Do not initialize Git, create a branch or worktree, publish an issue, or change GitHub state merely to perform reconciliation.
