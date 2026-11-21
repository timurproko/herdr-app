// Public runtime facts only, deliberately outside exported plugin preferences.
// Never put tokens, secret fingerprints or credential contents in this record.
import {shared,setShared} from '../api.js';
export const GIT_NOTICE_STATE='custom.git.webhook-state';
export const noticeState=()=>shared(GIT_NOTICE_STATE);
export function updateNoticeState(relay,repositories=null){
  const previous=noticeState(),members={};
  for(const row of repositories??[])if(typeof row.name==='string'&&typeof row.checked==='boolean')members[row.name.toLowerCase()]=row.checked;
  setShared(GIT_NOTICE_STATE,{version:1,relay,revision:(Number.isSafeInteger(previous?.revision)?previous.revision:0)+1,members});
}
