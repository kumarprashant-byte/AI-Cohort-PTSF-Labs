# Engagement Intent — PTSF Patient Travel Support

> Reference role: the *why* of the build. The phase briefs are how. When weighing a Plan-mode trade-off, weigh against this.
>
> If you need scoping context (current-state challenges, business impacts, confidence summary), see `93-scoping-context.md` (emitted only when scoping data is present).

## Intent

- **Measured by:** _Discovery-Deep & Architecture Lock:_ Ratified architecture decisions recorded as ADRs; signed license and residency posture; HIC integration contract signed off; migration profiling report on 2-3 sample TAMS instances. · _Platform Foundation, Identity & PHI Security:_ Production and lower sandboxes stood up; CI/CD flowing; internal users SSO from all three ADs; patient email/pw + Facebook login works in a lower env; Medical_History__c object exists with sharing lifecycle proven end-to-end; break-glass procedure documented and tested; Restriction Rules verified against internal admins. · _Patient Journey MVP:_ A patient in each of the three regions can register, complete onboarding, submit a subsidy application in their language, and see it enter the 'HIC-check pending' → 'awaiting practitioner' pipeline. Auto-reject fires when HIC indicates insurance covers travel. · (+3 more — see the `10-phase-*` files)

## Engagement at a glance

PTSF Patient Travel Support

- **Clouds in scope:** Experience Cloud, Service Cloud
- **Phases planned:** 6
- **Target org:** `PTSF Build Sandbox` (sandbox)
- **Build allowed:** yes

