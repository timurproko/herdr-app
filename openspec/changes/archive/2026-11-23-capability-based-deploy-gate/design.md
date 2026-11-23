# Design

## Context

See proposal.md for motivation. Read-only reproduction on the installed App returned version 0.1.17, reviewed false, empty missingApi/missingCommands/directImports and exit 1. The exact HOST_PROFILES membership conjunct causes the refusal. The automatic tab-move audit returned source-unavailable (GitHub HTTP 403) with passing synthetic fixtures; auditHostTabMove already preserves the public verdict.

A second failure path remains after this gate: deploy writes owned customization output, invokes startup-frames, and returns patches.ok false for an unknown opted-in target; the CLI and deploy-all worker then fail the deployment. Doctor likewise treats inactive optional patches as fatal issues. deploy-all-worker currently collapses definite installer failures into deployment failed; inspect output, which the update runner and row faithfully retain.

Read-only frame inventory: both patches have opt-in records. Live palette main.js is neither a reviewed original nor recorded owned output (SHA-256 bd625652992f7a35b776d3e42d0ca269a234014780ad658570447dd84061098f). Live feedback main.js still matches its installed patch hash and imports custom helpers; it is not evidence of 0.1.17 stock compatibility. The installed executable SHA-256 is 75527414eb23a95c9f0a15e88a17996223f12cc9b18d0b87c4726cc64e6c1ac2; neither canonical reviewed palette nor feedback original occurs byte-for-byte in it. Do not call the live feedback patch a new upstream original.

Integration tests load baselines/${appVersion}.json unconditionally, but reviewed baselines stop at 0.1.16. Shell-only deploy already builds and installs just four owned shell files without host/frame checks. All-machine source/peer eligibility and Settings managed-clone/lock/deadline gates remain necessary and unchanged.

## Goals / Non-Goals

**Goals:** Independently represent public capability eligibility, optional native-byte eligibility and review coverage; preserve clear causes through every deployment entrypoint; prove updates using disposable fixtures and the read-only real host check.

**Non-Goals:** No 0.1.17 allowlist addition, native patch rebase, implicit opt-in, native rebuild, installation, real deployment, managed-clone mutation, peer contact, live UI operation, session mutation or automatic rollback. No claims that static capabilities prove all future semantics.

## Decisions

### 1. Central version policy independent of review metadata

Add an explicit minimum supported public-host version (0.1.13, preserving the oldest existing public profile) and strict numeric version comparison in the central compatibility module. Tab-move keeps its separate higher App/Core minima. Keep HOST_PROFILES and reviewedVersions as exact historical evidence and alias mappings, not forward-version permission. The host result succeeds only with usable version evidence at or above minimum and no missing APIs, commands or direct imports. It retains reviewed false and exposes a visible newer-than-last-reviewed advisory for 0.1.17 and later unreviewed versions. Invalid version evidence fails clearly. Preserve automatic tab-move audit execution and its bounded/advisory outcome even on network or fixture failures. Reject adding 0.1.17 to the exact profile: that merely postpones recurrence.

### 2. Typed optional-patch eligibility, not catch-all error suppression

Separate patch inspection from mutation so refresh and doctor use one classification. Reviewed stock, recognized owned output, unsupported target/native provenance, dependency conflict and corrupt record must be distinct. Automatic refresh skips unsupported native bytes with a structured status and advisory and leaves entrypoint, dependencies, opt-in and original backup byte-for-byte unchanged. It never overwrites a personal/unknown target. Safe supported patches retain existing apply ordering, hashes and recovery behavior; corrupt records, dependency conflicts and concurrent-write errors remain real failures.

Native review evidence is byte-based, not an App version allowlist. Where an old owned patch masks the current shipped source, its ownership hash alone must not establish compatibility with a newly changed binary: check reviewed-original provenance against the installed host's embedded bytes through read-only inspection, with an injectable fixture seam. Missing/unverifiable native provenance is a conservative optional skip, never authorization to apply. Keep explicit apply refusal and restore's unknown-stock preservation; never downgrade new stock from an old backup.

On this observed 0.1.17 installation, palette remains unchanged and inactive because its live bytes are unknown. Feedback's previously owned file is not overwritten or refreshed absent reviewed 0.1.17 native provenance; diagnostics explicitly distinguish a retained old owned patch from a supported current patch. A host reset to new feedback stock similarly skips it. Neither case enables/rebases a patch or blocks ordinary mods/layout/theme/shell deployment. Skipping writes is safe for installation because these are optional visual exceptions, not prerequisites for private mods. It cannot certify a retained old patch's native semantics, so documentation must make that limitation explicit rather than claim feedback is newly reviewed.

### 3. Preserve stage/cause through existing result plumbing

Recognize host-check result output separately from the final installer result, extracting only bounded known fields (version, missing capabilities/imports and version refusal), not arbitrary console text as an authority. Preserve a concise host check refused Herdr 0.1.17-style reason with actual missing requirements; retain build, ownership/install and patch causes when those stages fail. Keep timeout/missing-result unknown outcomes and existing no-replay locks distinct from definite failure. Pass the cause through deploy-all result, Settings job and row without losing matching detail paths or rollback guidance. Successful optional skips do not masquerade as peer failures or invalidate installed revision evidence.

### 4. Honest baseline and pipeline coverage

Do not manufacture 0.1.17 stock hashes or use live patched feedback as provenance. Make stock baseline selection explicit: reviewed release mismatches still fail; absent release coverage reports an unreviewed-stock advisory while independent fixture regressions continue. Preserve reviewed baseline files. Update public docs that currently demand exact version review for deployment.

Exercise actual npm deploy/deploy:all/deploy:shell script composition and Settings runner in disposable checkouts/homes with synthetic host/binary/transport fixtures. Include 0.1.17-capable/unreviewed, future-capable, too-old, missing API/command, forbidden import, tab-audit failures, unknown palette/feedback targets, old owned patches over changed native provenance, valid reviewed repair, personal dependency conflict, corrupt record, doctor severity and all-machine/Settings cause propagation. Do not run real deployment as evidence.

## Risks / Trade-offs

- Public declarations and command presence do not prove semantic compatibility → retain adapters, runtime guards, review advisories and explicit limitations.
- Native provenance can be unavailable or differ by platform → skip only optional patch mutation with a clear advisory; never infer permission from the public-host gate.
- An existing old feedback patch may remain on disk → expose retained/unreviewed status without silently restoring or deleting user-owned bytes; no new native compatibility claim.
- Parsing npm output can swallow a cause or expose noisy/private content → bound known diagnostic fields, prioritize typed results and cover banners/mixed output in fixtures.
- Missing stock review is not proof stock is unchanged → report uncovered coverage visibly and keep known baseline mismatches fatal.

## Migration Plan

No schema migration or operational changes run in this task. After approval, implement the outcomes in order, rerun the real npm run check:host-api to show 0.1.17 passing with advisories, and run CI=true npm run test:ci before implementation handoff. Report actual fixture evidence separately from unperformed real deployment.

After merge, the person opens Settings → Updates, uses Check now on herdr-app-custom, then Update once offered. The existing installed runner fetches the fixed published main into ~/.local/share/herdr-app and runs deploy:all from that managed clone, so it does not need the failing old host check to install the source fix. The failed prior receipt is cleared for retry only by the existing fresh successful check and normal unlocked/no-unknown-process guards. Do not delete locks or reset the managed clone. If blocked, inspect the matching update.log/result and report the concrete refusal. Normal documented backup-ID rollback remains manual; this task deploys nothing.
