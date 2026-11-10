// 研究方案的参考模型，不导入生产规划器；通过只表示合同案例自洽。
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
const root='docs/auto-coding/evidence/framework-foundation-route';
const graph={
 'JS-01':[], 'JS-03':[], 'WEB-01':[], 'JS-04':['JS-01'], 'JS-05':['JS-04'],
 'REACT-01':['JS-01','JS-03','WEB-01'], 'REACT-02':['REACT-01'], 'REACT-03':['REACT-02'], 'REACT-04':['REACT-03','JS-05'],
 'VUE-01':['WEB-01'], 'VUE-02':['VUE-01'], 'VUE-03':['VUE-02'], 'VUE-04':['VUE-03'], 'VUE-05':['VUE-04','JS-05']
};
const tracks={REACT:['REACT-01','REACT-02','REACT-03','REACT-04'],VUE:['VUE-01','VUE-02','VUE-03','VUE-04','VUE-05'],NONE:['JS-01','JS-03','WEB-01','JS-04','JS-05']};
const catalog=readdirSync('docs/knowledge/materials').filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(readFileSync('docs/knowledge/materials/'+f)).chapters);
for(const [node,edges] of Object.entries(graph)) {
 assert(catalog.some(c=>c.id===node),node);
 for(const edge of edges){assert(graph[edge],edge);assert(!(node.startsWith('VUE')&&edge.startsWith('REACT')||node.startsWith('REACT')&&edge.startsWith('VUE')));}
 const walk=(id,path=[])=>{assert(!path.includes(id),`环 ${path}/${id}`);graph[id].forEach(p=>walk(p,[...path,id]));};walk(node);
}
const readingGraph={...graph,'PREJS-04':[],'PREJS-07':['PREJS-04'],'JS-04':['JS-01','PREJS-07']};
for(const node of Object.keys(readingGraph)){const visit=(id,path=[])=>{assert(readingGraph[id],id);assert(!path.includes(id));readingGraph[id].forEach(p=>visit(p,[...path,id]));};visit(node);}
for(const [file,code] of [['javascript-scheduled-callbacks.md','PREJS-04'],['javascript-promises-and-cancellation.md','PREJS-07']])assert(readFileSync('docs/knowledge/chinese-guides/'+file,'utf8').includes(code));
for(const c of catalog.filter(c=>graph[c.id])) assert(existsSync('docs/knowledge/chinese-guides/'+c.guide),c.guide);
function plan(input){
 const {choice='UNDECIDED',learned=[],deferred=[],missing=[],focus}=input;
 const result=(outcome,code=null,blocker=null)=>({outcome,code,blocker});
 if(focus)return result('STEP',focus);
 if(choice==='UNDECIDED')return result('CHOOSE_FRAMEWORK');
 const target=tracks[choice].find(c=>!learned.includes(c));
 if(!target)return result(choice==='NONE'?'NO_RECOMMENDATION':'AUDITED_CHAIN_COMPLETE');
 if(missing.includes(target))return result('DATA_GAP',null,target);
 if(deferred.includes(target))return result('PAUSED_POINT',null,target);
 function pending(code){for(const p of graph[code]){if(missing.includes(p))return {outcome:'DATA_GAP',code:null,blocker:p};if(learned.includes(p))continue;if(deferred.includes(p))return result('PAUSED_PREREQUISITE',null,p);return pending(p)??result('STEP',p);}return null;}
 return pending(target)??result('STEP',target);
}
const base=['JS-01','JS-03','WEB-01'];
const cases=[
 ['未知偏好不得从历史推断',{learned:['REACT-01']},{outcome:'CHOOSE_FRAMEWORK',code:null,blocker:null}],
 ['React 承接',{choice:'REACT',learned:[...base,'REACT-01']},{outcome:'STEP',code:'REACT-02',blocker:null}],
 ['Vue 入口',{choice:'VUE',learned:['WEB-01']},{outcome:'STEP',code:'VUE-01',blocker:null}],
 ['缺基础',{choice:'REACT',learned:['JS-01','WEB-01']},{outcome:'STEP',code:'JS-03',blocker:null}],
 ['暂缓基础',{choice:'REACT',learned:['JS-01','WEB-01'],deferred:['JS-03']},{outcome:'PAUSED_PREREQUISITE',code:null,blocker:'JS-03'}],
 ['缺目录',{choice:'VUE',missing:['WEB-01']},{outcome:'DATA_GAP',code:null,blocker:'WEB-01'}],
 ['切偏好保留焦点',{choice:'VUE',focus:'REACT-03'},{outcome:'STEP',code:'REACT-03',blocker:null}],
 ['Effect 补异步',{choice:'REACT',learned:[...base,'REACT-01','REACT-02','REACT-03']},{outcome:'STEP',code:'JS-04',blocker:null}],
 ['Vue 链完成',{choice:'VUE',learned:tracks.VUE},{outcome:'AUDITED_CHAIN_COMPLETE',code:null,blocker:null}],
 ['双框架历史不自动续另一轨',{choice:'REACT',learned:[...tracks.REACT,'VUE-01','VUE-02']},{outcome:'AUDITED_CHAIN_COMPLETE',code:null,blocker:null}],
 ['切 Vue 续旧进度',{choice:'VUE',learned:['WEB-01','VUE-01']},{outcome:'STEP',code:'VUE-02',blocker:null}],
 ['旧 BRANCH 不隐式恢复',{choice:'VUE',learned:['WEB-01','VUE-01'],deferred:['VUE-02','VUE-03']},{outcome:'PAUSED_POINT',code:null,blocker:'VUE-02'}],
 ['暂不进框架',{choice:'NONE'},{outcome:'STEP',code:'JS-01',blocker:null}],
 ['无可推荐',{choice:'NONE',learned:tracks.NONE},{outcome:'NO_RECOMMENDATION',code:null,blocker:null}],
 ['未审焦点仍可继续',{choice:'VUE',focus:'VUE-07'},{outcome:'STEP',code:'VUE-07',blocker:null}]
].map(([name,input,expected])=>{const before=JSON.stringify(input);const actual=plan(input);assert.deepEqual(actual,expected,name);assert.equal(JSON.stringify(input),before);return {name,input,expected,actual};});
writeFileSync(root+'/route-cases.json',JSON.stringify({scope:'参考模型；不证明生产实现。STEP 的 kind、reading blockers、focus 元数据尚待生产测试。',graph,readingEdges:[['PREJS-04','PREJS-07'],['PREJS-07','JS-04']],cases},null,2)+'\n');
// 同时核对工作区存在性和 Git 索引，防止被忽略的本地证据造成假通过。
const repository=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const tracked=new Set(execFileSync('git',['ls-files','--cached','-z'],{cwd:repository,encoding:'utf8'}).split('\0').filter(Boolean));
const docs=['docs/auto-coding/framework-foundation-route-contract.md',root+'/README.md'];
let linkCount=0;
for(const doc of docs){
 const links=[...readFileSync(doc,'utf8').matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]).filter(x=>!/^https?:/.test(x));
 for(const link of links){
  const target=resolve(dirname(doc),decodeURIComponent(link.split('#')[0]));
  const gitPath=relative(repository,target).split(sep).join('/');
  assert(existsSync(target),`${doc}: 链接目标不存在：${link}`);
  assert(tracked.has(gitPath),`${doc}: 链接目标未纳入 Git 索引：${link}`);
  linkCount++;
 }
}
console.log(`合同模型：${cases.length} 案例通过，${Object.keys(graph).length} 点无环/可解析/无跨框架硬边；${docs.length} 份文档的 ${linkCount} 个本地文件链接存在且已纳入 Git 索引。短文另按阅读辅助检查，不伪造知识 ID。`);
