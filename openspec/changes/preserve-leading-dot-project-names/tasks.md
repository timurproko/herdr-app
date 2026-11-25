# Tasks

## 1. Crew project names keep one leading dot

- [ ] 1.1 Change `PROJECT_NAME` in `src/plugins/crew/plugin.js` to `/^(?=.{1,40}$)(?!.*\.\.)(?!.*\.$)\.?[a-z0-9][a-z0-9.-]*$/` so listed rows starting with a dot are kept.
- [ ] 1.2 Make `projectName` keep one leading dot when the folder's last segment starts with `.`, normalise the rest as today, cut the whole name to 40 characters, trim trailing dots and dashes, and validate it; update the naming guidance text.
- [ ] 1.3 Update `plugin.test.mjs`: derived names (`/git/.hidden` -> `.hidden`, `/git/.xrbuild` -> `.xrbuild`, `/git/..x` -> `.x`, `/git/.-x` -> `.x`, a 40-character dotted case), `.a` valid, `.`, `..a`, `.-a` invalid; Projects flow with `xrbuild` listed adds `D:/Git/xrbuild/.xrbuild` as exactly `project add .xrbuild ...`, shows the `.xrbuild` row and removes it with `project remove .xrbuild`; an older Crew's `Invalid project name` refusal gives the update message after one request.

## 2. A folder already registered is not registered again

- [ ] 2.1 Before `project add`, check the listed rows for the same folder under another name; when found, send nothing and show that the folder is already added; cover it in `plugin.test.mjs`.

## 3. Spec and docs describe the leading dot

- [ ] 3.1 Update `docs/PLUGIN-UI.md` naming description to include one leading dot and the already-added case.
