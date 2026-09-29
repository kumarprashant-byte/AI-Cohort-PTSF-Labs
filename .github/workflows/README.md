# Github Actions

## Which workflows do I get — and which do I choose?

The scaffold ships three groups. **One is always-on; the deploy layer is a choice between two pipelines — pick one and delete the other.**

| Group | Files | Keep it? |
|---|---|---|
| **Trust chain** (always-on) | `intent-trust-chain.yml` | **Always.** The Launchpad-unique gates — intent `validate`, delivery-stamp regression, scope-drift, README delivery-index, test-script coverage, FLS advisory. Needs **no Salesforce org** (pure git + node), so it runs in every repo regardless of your deploy pipeline. Don't delete it. |
| **Skills update** (always-on) | `skills-update.yml` | **Always.** Opens a PR when the vendored agent skills change upstream (see the "Skills update" section below). Unrelated to Salesforce deploy. |
| **Deploy — Option A: simple** | `sf-validate.yml`, `sf-deploy.yml` | Pick **A or B.** Lightweight **feature → main** flow: validate on PR, deploy on merge to `main`. Delete the four `feature-*` files if you use this. |
| **Deploy — Option B: multi-stage** | `feature-ci_pr-validation.yml`, `feature-ci_deploy.yml`, `feature-release-test_pr-validation.yml`, `feature-release-test_deploy.yml` | Pick **A or B.** Full **develop → release/* → main** flow with CI + TEST sandboxes (documented below). Delete `sf-validate.yml` + `sf-deploy.yml` if you use this. |

**Why the split (issue #57):** the trust-chain gates used to live *inside* `sf-validate.yml`, entangled with a check-only deploy — so they looked like they belonged only to Option A, and deleting the "old" file to use Option B would silently strip the trust chain. They're now their own always-ships workflow, and the deploy layer is a clean either/or.

**Secret name:** both deploy pipelines authenticate with a single `SFDX_URL` secret (a stored `sf org auth show-sfdx-auth-url` value). *(Option A's files previously used `SFDX_AUTH_URL_INTEGRATION`; that was reconciled to `SFDX_URL` so all workflows and this doc agree — #57.)* Configure it per the environment-setup steps below.

## Git flow and Environment Structure
These workflows assume a single stream Salesforce development environment. There are multiple salesforce scratch orgs that are spun up to develop features, and congregate to a CI sandbox. Once the appropriate tests and checks are completed, they work is moved to the test sandbox. Once testing is complete, a full branch merge is done to the main trunk where it is staged and then deployed to production.
![Github branching and environments](/plugins/quantum-leap-launchpad/templates/.assets/QuantumLeapDevOps.png)

In Github, each sandbox should be configured as an environment. This allows you to set up a login credential for each sandbox and variables for the workflows. 

> **PRs are not auto-merged — a human merges them.** The `*_pr-validation` jobs only run a dry-run validation; they never merge. The `*_deploy` jobs trigger on a *push* to `develop`/`release/*`, which happens because a person merged the PR — not because the checks went green. A passing PR is a green light for the Trusted Guide to review and merge, not an instruction the pipeline acts on. Nothing in these workflows (or the repo's engine scripts) merges a pull request.

## Workflows
### CI Environment
#### CI Environment Setup
To set this job up, you need to create a CI environment in github and the variables.

  * In the Github repository, go to **Settings**
  * Click on **Environments**
  * Click on **New Environment**
  * Name the environment **CI** and click on ***Configure environment***
  * In the configuration, click on ***Add environment secret***
  * Name the secret **SFDX_URL** and paste in the AUTH URL for the environment.
    * To get the auth url you need to log into the sandbox using the sf cli on your machine.
    * Once authenticated, run the command `sf org auth show-sfdx-auth-url --target-org <<SANDBOX ALIAS>>`
    * Copy the URL and paste it in the variable.
  * Click **Add Secret**
  * In the configuration, click on ***Add environment variable***
  * Name the variable **TEST_LEVEL** and set one of the following test levels:
    * *NoTestRun - no tests are run - not recommended.*
    * RunSpecifiedTests - the script automatically scans for test files and adds them to a list. It will pass the list of tests for the jobs as defined below. This configuration is ideal for large deployments in separate repos or to reduce run time of apex tests.
      * Note: If no test files are found, the validation will default to "RunLocalTests".
    * RunLocalTests - will run all tests in an org not part of a managed package.
    * RunAllTestsInOrg - not recommended - will run all tests including those in managed packages.
    * RunRelevantTests - ***beta feature*** - Runs only tests that are relevant to the files being deployed. Salesforce automatically identifies the relevant tests based on an analysis of the deployment payload and the payload dependencies. For fine-grained control, you can also annotate test classes so that they always run in certain conditions. See “@IsTest Annotation” in the [Apex Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_annotation_isTest.htm). Each class and trigger in the deployment package must be covered by the executed tests for a minimum of 75% code coverage. This coverage is computed for each class and triggers individually and is different than the overall coverage percentage.

#### feature-ci_pr-validation
This is a validation job that runs when a Pull Request is created from a feature branch into the develop branch. The job performs the following:

  * Installs the sf cli, sfdx-git-delta and code-analyzer plugins.
  * Authenticates to the Envrionment sandbox using the SFDX_URL variable.
  * Creates a "package" of the changed metadata using the sfdx-git-delta plugin.
  * If TEST_LEVEL variable is "RunSpecifiedTests": Scans the package for apex files with the name TEST and adds it to a list of tests to run at validation
  * Runs code analyzer for any vulnerabilities. Will throw an error if Critical or High Severity issues are found.
  * Runs a dry-run deployment to validate that the changes will deploy to the sandbox.
    * The TEST_LEVEL will run with the variable set.
    * If TEST_LEVEL variable is "RunSpecifiedTests" a list of the tests found is passed
    * If no test files were found, the deployment will run with the Test Level set to "RunLocalTests".

> **Two-speed lane — intent-only PRs skip the build gauntlet.** A `Resolve package directories` step reads your `sfdx-project.json` `packageDirectories`, then a `Detect deploy-relevant changes` step checks whether the PR touches any deployable metadata (your package dirs — `force-app/` by default — plus `sfdx-project.json`, `config/`). The same resolved dirs feed the delta build's `--source-dir`, so a repo with a custom package dir (`src/`, `packaged/`) isn't misclassified and skipped (issue #64). If it touches **only** intents / decisions / docs, every Salesforce step (CLI install, org auth, delta build, code analyzer, dry-run deploy) is skipped and the job finishes in seconds — refining Intent shouldn't wait on an org round-trip. The job still **runs and reports green**, so an intent-only PR satisfies a required status check on `develop` (we deliberately don't use `paths-ignore`, which would leave a required check pending forever). A PR that touches **both** intents and `force-app/` runs the full validation — any deployable file flips the switch. The **Intent trust chain** (`validate` / `regression` / `drift` / coverage) runs on intent PRs regardless. This is the fast intent-refinement lane described in the plugin's `decisions/0014`; how many reviewers an intent PR needs is your own branch-protection choice, not something the workflow dictates.

#### feature-ci_deploy
This is a deployment job that runs when a merge or commit is made to the develop branch. The job performs the following:

  * Installs the sf cli, and the sfdx-git-delta plugin.
  * Authenticates to the Envrionment sandbox using the SFDX_URL variable.
  * Creates a "package" of the changed metadata using the sfdx-git-delta plugin.
  * If TEST_LEVEL variable is "RunSpecifiedTests": Scans the package for apex files with the name TEST and adds it to a list of tests to run at validation
  * Deploys the delta package to the sandbox.
    * The TEST_LEVEL will run with the variable set.
    * If TEST_LEVEL variable is "RunSpecifiedTests" a list of the tests found is passed
    * If no test files were found, the deployment will run with the Test Level set to "RunLocalTests".

### TEST Environment
#### TEST Environment Setup
To set this job up, you need to create a CI environment in github and the variables.

  * In the Github repository, go to Settings
  * Click on **Environments**
  * Click on **New Environment**
  * Name the environment **TEST** and click on ***Configure environment***
  * In the configuration, click on ***Add environment secret***
  * Name the secret **SFDX_URL** and paste in the AUTH URL for the environment.
    * To get the auth url you need to log into the sandbox using the sf cli on your machine.
    * Once authenticated, run the command `sf org auth show-sfdx-auth-url --target-org <<SANDBOX ALIAS>>`
    * Copy the URL and paste it in the variable.
  * Click **Add Secret**
  * In the configuration, click on ***Add environment variable***
  * Name the variable **FULL_BUILD** and set the value to false (unless you want to do a full build)
    * ***NOTE: If FULL_BUILD is true, it is not recommended using RunSpecified tests if there are a lot of apex tests because the scan job will have to add all the test class files to the list.***
  * Name the variable **TEST_LEVEL** and set one of the following test levels:
    * *NoTestRun - no tests are run - not recommended.*
    * RunSpecifiedTests - the script automatically scans for test files and adds them to a list. It will pass the list of tests for the jobs as defined below. This configuration is ideal for large deployments in separate repos or to reduce run time of apex tests.
      * Note: If no test files are found, the validation will default to "RunLocalTests".
    * RunLocalTests - will run all tests in an org not part of a managed package.
    * RunAllTestsInOrg - not recommended - will run all tests including those in managed packages.
    * RunRelevantTests - ***beta feature*** - Runs only tests that are relevant to the files being deployed. Salesforce automatically identifies the relevant tests based on an analysis of the deployment payload and the payload dependencies. For fine-grained control, you can also annotate test classes so that they always run in certain conditions. See “@IsTest Annotation” in the [Apex Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_annotation_isTest.htm). Each class and trigger in the deployment package must be covered by the executed tests for a minimum of 75% code coverage. This coverage is computed for each class and triggers individually and is different than the overall coverage percentage.

#### feature-release-test_pr-validation
This is a validation job that runs when a Pull Request is created from a feature branch into the release branch. The job performs the following:

  * Installs the sf cli, and the sfdx-git-delta plugin.
  * Authenticates to the Envrionment sandbox using the SFDX_URL variable.
  * Builds the deployment validation based on the FULL_BUILD variable
    * If the FULL_BUILD variable is true, then all the metadata under the repo's package directories (resolved from `sfdx-project.json`) is deployed.
    * If FULL_BUILD is false or  null, the sfdx-git-delta creates a "package" of the changed metadata.
  * If TEST_LEVEL variable is "RunSpecifiedTests": Scans the package for apex files with the name TEST and adds it to a list of tests to run at validation
  * Runs a dry-run deployment to validate that the changes will deploy to the sandbox.
    * The TEST_LEVEL will run with the variable set.
    * If TEST_LEVEL variable is "RunSpecifiedTests" a list of the tests found is passed
    * If no test files were found, the deployment will run with the Test Level set to "RunLocalTests".

#### feature-release-test_deploy
This is a deployment job that runs when a merge/commit is made to the release branch. The job performs the following:

  * Installs the sf cli, and the sfdx-git-delta plugin.
  * Authenticates to the Envrionment sandbox using the SFDX_URL variable.
  * Builds the deployment validation based on the FULL_BUILD variable
    * If the FULL_BUILD variable is true, then all the metadata under the repo's package directories (resolved from `sfdx-project.json`) is deployed.
    * If FULL_BUILD is false or  null, the sfdx-git-delta creates a "package" of the changed metadata.
  * If TEST_LEVEL variable is "RunSpecifiedTests": Scans the package for apex files with the name TEST and adds it to a list of tests to run at validation
  * Deploys the delta package to the sandbox.
    * The TEST_LEVEL will run with the variable set.
    * If TEST_LEVEL variable is "RunSpecifiedTests" a list of the tests found is passed
    * If no test files were found, the deployment will run with the Test Level set to "RunLocalTests".

## Skills update (suspenders)

`skills-update.yml` is unrelated to the Salesforce deploy pipeline above — it keeps the repo's **vendored agent skills** current. The operating skills (the launchpad's `ql-*` set and `forcedotcom/sf-skills`) live committed under `.claude/skills/` so every agent — Claude Code, Cursor, Codex, Copilot — has them on clone. This scheduled workflow (weekly, plus manual `workflow_dispatch`) runs `npx skills update` and, if any vendored skill changed upstream, **opens a PR** with the diff. It never applies an update silently — a human reviews and merges, same as every other change.

This is the "suspenders" half of belt-and-suspenders delivery: it works for **any** harness and needs no plugin. The "belt" half is the `quantum-leap-launchpad` Claude Code plugin, which nudges Claude users to run `npx skills update` when their skills are behind. Either path is enough; together they cover the harness/CI matrix. Needs no secrets — it uses the built-in `GITHUB_TOKEN` (scoped to `contents: write` + `pull-requests: write`). See the plugin's `decisions/0012` for the full rationale.

## Known Limitations
  * The Github actions scripts are a template; you should modify them to fit your use case. For example if your Apex Test Classes are not named TEST, then modify the search syntax to fit your naming conventions (e.g. Test). Ensure that your skills are using this convention too. 
  * If a Github action job fails on a pull request, it is recommended you close the pull request, fix the changes on the feature branch, and create a new pull request. This ensures that sfdx-git-delta plugin picks up all the changes; otherwise your build may fail.
  * FULL_BUILD is convenient when merges are done incorrectly. It will ensure that all metadata residing on a branch is deployed. 
    * There is a risk that a deployment may fail if salesforce detects the change as a conflict
  * In the rare instance a job has failed, pull the branch to your local repository machine. Deploy using sf project start with the --ignore-conflicts command. Be careful running this as any manual changes done to any metadata (especially custom metadata) will be overwritten.