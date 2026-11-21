// One palette mapping for startup and live space -> A1 color matching.
const SPACE_TO_AGENT = Object.freeze({ansi4:'blue',ansi2:'green',ansi3:'orange',ansi1:'pink',ansi5:'purple',ansi6:'cyan','#8e98a8':'grey'});
const PALETTE = Object.freeze({blue:'#82a0f1',green:'#68b78d',orange:'#e78753',pink:'#df7ac7',purple:'#a798d7',cyan:'#5db3ba',grey:'#a3a3a3'});
export function agentColorForSpace(value) {
  if(Object.prototype.hasOwnProperty.call(SPACE_TO_AGENT,value))return SPACE_TO_AGENT[value];
  if(!/^#[a-f0-9]{6}$/i.test(value??''))return null;
  const rgb=hex=>[1,3,5].map(at=>parseInt(hex.slice(at,at+2),16)),source=rgb(value);
  const distance=hex=>rgb(hex).reduce((sum,channel,i)=>sum+(channel-source[i])**2,0);
  return Object.keys(PALETTE).reduce((best,color)=>distance(PALETTE[color])<distance(PALETTE[best])?color:best,'blue');
}
