import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require=createRequire(resolve('apps/web/package.json'));
const { chromium }=require('@playwright/test');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const evidence=resolve('docs/auto-coding/evidence/framework-foundation-route');
const records=[];
for(const [name,path] of [['today','/'],['plan','/plan'],['detail','/knowledge/REACT-02'],['reader','/knowledge/materials/react-02-component-boundaries-data-flow-composition.md/react-02']]){
 await page.goto('http://127.0.0.1:42831'+path);
 await page.waitForLoadState('networkidle');
 console.log(name);
 await page.screenshot({path:resolve(evidence,name+'.png'),fullPage:false, animations:'disabled'});
 const text=await page.locator('body').innerText();
 writeFileSync(resolve(evidence,name+'.txt'),text);
 if(name==='detail') { await page.getByText('依据路线与前置继续学习',{exact:true}).scrollIntoViewIfNeeded(); await page.screenshot({path:resolve(evidence,'detail-branches.png'),animations:'disabled'}); }
 if(name==='reader') { await page.getByText('接着读 →',{exact:true}).scrollIntoViewIfNeeded(); await page.screenshot({path:resolve(evidence,'reader-navigation.png'),animations:'disabled'}); }
 records.push({name,url:page.url(),browser:browser.version(),viewport:{width:1440,height:1000},capturedAt:new Date().toISOString(),screenshot:name+'.png'});
}
writeFileSync(resolve(evidence,'pages.json'),JSON.stringify(records,null,2)+'\n');
await browser.close();
