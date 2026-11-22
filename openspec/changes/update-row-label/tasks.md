# Tasks

## 1. Update row displays herdr-app-custom consistently

- [ ] 1.1 Rename only CUSTOMIZATION_LABEL and matching test/fixture expectations; run `node tests/update-check.test.mjs` and `node --experimental-vm-modules tests/update-row.test.mjs` against checkout fixtures only.
- [ ] 1.2 Replace old-label quotations in README, docs and current/archived specs through this change; search tracked files for `Customizations` and inspect the diff for unrelated wording changes.
- [ ] 1.3 Retain native row identities, layout and actions unchanged; inspect label consumers and native update state/commands and record that the label is display-only, with no native-name comparison or parsing.
