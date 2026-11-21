// Eager GPUI checks in a disposable app home, never a native app build.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {build} from './build.mjs';
import {deploy,nativeCheck,app} from './deploy.mjs';
import {json,put,read} from './files.mjs';
import {checkClaudeAccountStates} from '../tests/features/claude-account-native.mjs';
import {checkTabMoveStates,checkTabArrivalStates} from '../tests/features/tab-move-native.mjs';
import {checkReorderStates} from '../tests/features/reorder-native.mjs';
import {checkPinnedPullStates} from '../tests/features/pinned-pr-native.mjs';
import {checkRenameSelection} from '../tests/features/rename-selection-native.mjs';
import {checkPanelPinStates} from '../tests/features/panel-pin-native.mjs';
import {checkFileDeleteStates} from '../tests/features/file-delete-native.mjs';
import {checkSidebarPluginStates} from '../tests/features/sidebar-plugins-native.mjs';
import {checkUsagePluginStates} from '../tests/features/usage-plugin-native.mjs';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'herdr-custom-native-'));
try {
 const {output}=build();deploy(output,home,{repair:false});
 const result=nativeCheck(home),runtime=path.join(home,'.customizations/runtime');
 const {framePatch}=await import(new URL('../dist/scripts/frame-patch.mjs',import.meta.url));
 const registry=json(path.join(runtime,'frame-patches/registry.json'));
 for(const patch of registry.patches){put(path.join(home,patch.target,'main.js'),read(path.join(runtime,patch.originals[0])));framePatch('apply',home,runtime,patch.id);app(['check',path.join(home,patch.target)],home);}
 const claudeAccountFixtures=checkClaudeAccountStates(home,app);
 const tabMoveFixtures=checkTabMoveStates(home,app);
 const tabArrivalFixtures=checkTabArrivalStates(home,app);
 const reorderFixtures=checkReorderStates(home,app);
 const pinnedPullFixtures=checkPinnedPullStates(home,app);
 const renameSelectionFixtures=checkRenameSelection(home,app);
 const panelPinFixtures=checkPanelPinStates(home,app);
 const fileDeleteFixtures=checkFileDeleteStates(home,app);
 const sidebarPluginFixtures=checkSidebarPluginStates(home,app);
 const usagePluginFixtures=checkUsagePluginStates(home,app);
 console.log(JSON.stringify({privateMods:result.checked,compatibilityFixtures:registry.patches.length,claudeAccountFixtures,tabMoveFixtures,tabArrivalFixtures,reorderFixtures,pinnedPullFixtures,renameSelectionFixtures,panelPinFixtures,fileDeleteFixtures,sidebarPluginFixtures,usagePluginFixtures,scope:'disposable native initial checks; live interaction still required'},null,2));
} finally {fs.rmSync(home,{recursive:true,force:true});}
