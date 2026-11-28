// Real new scroll dependencies for the older hand-linked ordinary-panel VMs.
import fs from 'node:fs';
import vm from 'node:vm';
const files={
 './task-reveal.js':'../../src/plugins/git/mod/task-reveal.js',
 './repository-disclosure.js':'../../src/plugins/git/mod/repository-disclosure.js',
 './row-presentation.js':'../../src/plugins/git/mod/row-presentation.js',
 './sidebar-scroll.js':'../../src/ui/sidebar-scroll.js',
 './scroll-fade.js':'../../src/ui/scroll-fade.js',
};
export function scrollModule(context,name) {
 return files[name] ? new vm.SourceTextModule(fs.readFileSync(new URL(files[name],import.meta.url),'utf8'),{context}) : null;
}
export const Background={linear_gradient:()=>({color_space(){return this;}})};
