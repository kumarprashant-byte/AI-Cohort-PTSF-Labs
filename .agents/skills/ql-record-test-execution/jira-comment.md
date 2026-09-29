# Interim: comment a test run onto the intent's Jira issue

Reference for `/ql-record-test-execution` Step 10. **Opt-in, and an interim stopgap.** `/ql-sync-jira` owns the Jira projection; it has no test-execution comment path *yet*, which is the only reason this exists. When that projection is designed, it supersedes this and this goes away. So: ask before posting (default **no**), keep the comment plain, and don't grow it into a second projection. Skip entirely if the QA professional declined the git action in Step 9, or if `delivery/jira.config.json` doesn't exist (this engagement doesn't project to Jira). This reports; it never transitions status or writes scope back — same one-way boundary as `/ql-sync-jira`.

The repo is canonical. This comment is a courtesy notification for people who live in Jira — the evidence is the `test-evidence/` files and the PR, never the comment.

1. **Use `/ql-sync-jira`'s transport, don't reinvent it.** Read `delivery/jira.config.json` for `project_key`, `labels.intent_prefix`, and **`transport`** (default `"mcp"` if the key is absent). The two pens, exactly as `/ql-sync-jira` uses them:
   - **`transport: "mcp"`** (Atlassian Remote MCP) — `searchJiraIssuesUsingJql` to find the issue, `addCommentToJiraIssue` to post. **There is no `cloudId` in `jira.config.json`** — OAuth resolves the site. If the MCP tools require a `cloudId` argument, get it from `getAccessibleAtlassianResources`; never read one out of the config or its `_comment` field.
   - **`transport: "api"`** (API token) — `node scripts/jira-rest.mjs comment <KEY> --body "<markdown>"`, with the site from `base_url` and credentials from the `JIRA_EMAIL`/`JIRA_API_TOKEN` env vars.

   If the configured transport isn't available (MCP not connected, or the API env unset), say so and stop — the evidence is already committed and pushed; a missing Jira comment is a notification gap, not a lost record. Don't fall back to the other transport on your own.

2. **Find the issue** with the same label-anchored lookup `/ql-sync-jira` uses:
   ```
   project = {project_key} AND labels = "{intent_prefix}{INT-00x}"
   ```
   If no issue is found, tell the QA professional Jira wasn't updated (name the project and the label searched) and stop — don't guess an issue key.

3. **Keep the comment short.** A plain summary, not a second copy of the report — the per-criterion table belongs in the execution report, which the PR link reaches:

   ```markdown
   Manual test execution — {date}

   **Scene(s):** {scene letter(s) and title(s)}
   **Environment:** {environment} · **Branch:** `{branch}` @ `{commit-short}`
   **Executed by:** {name}
   **Result:** {n} criteria run · {n} passed · {n} failed · {n} not run
   **Defects:** {"None", or one line per defect: {INT-00x-Cy} — {title} ({severity})}

   Evidence: `intents/INT-00x/test-evidence/{date}-{commit}-execution-report.md`
   Pull request: {PR URL}
   ```

   Populate it from data already gathered in Steps 5–6 — don't re-derive or re-ask anything. For the PR URL use what `gh pr create` printed, or `gh pr view {branch} --json url -q .url` when updating an existing PR — never hand-construct it. On MCP pass the body as markdown (`contentFormat: "markdown"`); on API pass the same markdown to `jira-rest.mjs comment`, which converts it to ADF.

4. **Always a new comment** — never edit or collapse a prior run's, mirroring the never-overwrite rule for execution reports. Then tell the QA professional the issue key and confirm it posted. If the call fails (auth, issue not found, network), surface the failure plainly — don't silently drop it, and don't retry by guessing a different issue.
