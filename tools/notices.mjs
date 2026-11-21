import fs from 'node:fs';
import path from 'node:path';
export const NOTICE_SOURCES = Object.freeze({
  'THIRD-PARTY.txt': 'THIRD-PARTY.md',
  'Apache-2.0.txt': 'LICENSES/Apache-2.0.txt',
  'Lucide-ISC.txt': 'LICENSES/Lucide-ISC.txt',
  'Feather-MIT.txt': 'LICENSES/Feather-MIT.txt',
  'Herdr-Lucide.txt': 'LICENSES/Herdr-Lucide.txt',
  'ASSET-PROVENANCE.json': 'docs/ASSET-PROVENANCE.json',
});
export function noticeEntries(root, features) {
  return Object.entries(NOTICE_SOURCES).flatMap(([name, source]) => {
    const bytes = fs.readFileSync(path.join(root, source));
    const destinations = [`licenses/${name}`, ...features.map(feature => `mods/${feature.mod}/${name === 'THIRD-PARTY.txt' ? 'NOTICE.txt' : name}`)];
    return destinations.map(dest => ({dest, source, bytes}));
  });
}
