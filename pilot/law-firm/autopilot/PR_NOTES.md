# PR notes

Goal: change the lawyer workday from inbox-driven case reconstruction to an exception-first governed workflow.

Review order:

1. `core.mjs` + `core.test.mjs` — authority model.
2. `kanzlei-autopilot-runner.ts` — safe idempotent internal runner.
3. `BaoAutopilotDashboard.tsx` — authenticated exception desk.
4. `kanzlei-work-packet.ts` + `BaoCaseWorkPacket.tsx` — one-page case preparation.
5. `BaoAutopilotWelcome.tsx` + routing — public/private boundary.
6. `ui-contract.test.mjs` + CI — regression protection.

No external communication provider or beA submission is added in this PR.
