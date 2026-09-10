import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!sessionStorage.getItem('migration-tested')) {localStorage.setItem('circle-band',JSON.stringify({kasumi:'ksm',ksm:'ksm',saki_ave:'saki_ave'}));sessionStorage.setItem('migration-tested','1');}});
 await page.goto('http://localhost:5173/');
 await page.waitForFunction(()=>document.querySelector('[data-slot]')?.disabled===false);
 assert.equal(await page.locator('[data-slot]').count(),5);
 assert.equal(await page.locator('[data-slot="kasumi"] option').count(),7);
 assert.equal(await page.locator('option[value="ksm"]').count(),0);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('circle-band')));assert.equal(saved.kasumi,'kasumi');assert.equal(Object.keys(saved).length,5);
 await page.evaluate(()=>{const s=document.querySelector('[data-slot="kasumi"]');s.value='saki_ave';s.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.waitForFunction(()=>window.__LIVE__.characters.characters.some(c=>c.member.id==='kasumi'&&c.source.id==='saki_ave'));
 assert.equal(await page.evaluate(()=>window.__LIVE__.characters.characters.length),5);
 await page.reload();await page.waitForFunction(()=>document.querySelector('[data-slot]')?.disabled===false);
 assert.equal(await page.locator('[data-slot="kasumi"]').inputValue(),'saki_ave');assert.deepEqual(errors,[]);
 const result={slots:5,models:6,ksmRemoved:true,staleStorageMigrated:true,newModelSwitchAndReload:true,errors};
 await fs.writeFile('reports/model-slots-qa.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}
