// 从主讲义提取独立 JS 示例；不重写行为，不安装依赖。
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(resolve('apps/web/package.json'));
const vue=require('vue');
const text=readFileSync('docs/knowledge/chinese-guides/vue-02-ref-reactive-computed-boundaries.md','utf8');
const results=[];
for(const match of text.matchAll(/```js example=(\S+)[^\n]*\n([\s\S]*?)\n```/g)){
 const [,id,source]=match;
 const expected=[...source.matchAll(/\/\/ => (.*)/g)].map(m=>m[1]);
 const logs=[];
 const code=source.replace(/import \{([^}]+)\} from 'vue';/g,'const {$1}=vue;');
 new Function('vue','console',code)(vue,{log:(...values)=>logs.push(values.map(String).join(' '))});
 assert.deepEqual(logs,expected,id);
 results.push({id,expected,actual:logs});
}
writeFileSync('docs/auto-coding/evidence/framework-foundation-route/examples.json',JSON.stringify({node:process.version,vue:vue.version,scope:'正文全部独立 JS 片段；未运行 SFC、真实地图、IME 或 React 组件',results},null,2)+'\n');
console.log(`${results.length} 个正文 JS 片段输出与原注释一致，Vue ${vue.version}`);
