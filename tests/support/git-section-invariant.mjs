import assert from 'node:assert/strict';
import {nodes,find} from './choice-menu.mjs';

// Check actual rendered sections, not just the reveal model's item array.
export function assertTaskSections(tree,panel) {
  const sections=nodes(tree).filter(node=>{
    const id=node.attrs?.id?.[0];
    return typeof id==='string'&&id.startsWith('task-repo-')&&find(node,`task-repo-header-${id.slice('task-repo-'.length)}`);
  });
  const eligible=new Set(panel.aggregate.rows(panel.view).map(row=>row.repo));
  for(const section of sections) {
    const repo=section.attrs.id[0].slice('task-repo-'.length);
    assert.ok(eligible.has(repo)||panel.aggregate.readNotice(repo,panel.view),`Empty section ${repo} in ${panel.view}`);
    assert.ok(find(section,`task-repo-header-${repo}`));
    if(panel.foldedRepositories.has(repo))continue; // Intentionally folded, not empty.
    const body=find(section,`task-repo-body-${repo}`);
    assert.ok(body,`Orphan unfolded header ${repo} in ${panel.view}`);
    assert.ok(nodes(body).some(node=>String(node.attrs?.id?.[0]??'').startsWith(`pr-${repo}#`))||find(body,`task-error-${repo}`),`Header ${repo} has neither row nor visible notice`);
  }
}
