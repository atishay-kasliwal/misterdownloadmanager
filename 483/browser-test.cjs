const { chromium, firefox } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const repo = process.env.MDM_REPO || process.cwd();
const out = __dirname;
const kind = process.env.BROWSER || 'chromium';
const stage = process.env.STAGE || 'baseline';
const source = process.env.SOURCE_REF
  ? execFileSync('git', ['show', `${process.env.SOURCE_REF}:extension/video.js`], { cwd:repo,encoding:'utf8' })
  : fs.readFileSync(`${repo}/extension/video.js`, 'utf8');
const html = `<!doctype html><html><head><title>MDM video focus regression</title><style>
body{margin:32px;background:#f2f4f7;color:#18212d;font:16px system-ui}video{display:block;width:640px;height:360px;background:#18212d}
</style></head><body><video id="video"></video></body></html>`;
(async () => {
  const { videoFocus } = await import(pathToFileURL(`${repo}/tools/extension/e2e.mjs`));
  const server = http.createServer((req,res) => {res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(html);});
  await new Promise((r) => server.listen(8101,'127.0.0.1',r));
  const browser = await (kind==='chrome'?chromium:({chromium,firefox})[kind]).launch(kind==='chrome'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{});
  const page = await browser.newPage({viewport:{width:1000,height:650},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const session={
    navigate: async url => {
      await page.goto(url);
      await page.evaluate(() => {
        globalThis.browser={
          i18n:{getMessage:()=>''},
          runtime:{id:'mdm-focus-test',sendMessage:async m=>m.type==='panel'?{on:true}:{ok:true}},
          storage:{local:{get:async d=>d,set:async()=>{}}}
        };
      });
      await page.addScriptTag({content:source});
    },
    evaluate: expression => page.evaluate(expression),
    mouse: async (x,y,act='move') => {await page.mouse.move(x,y);if(act==='click')await page.mouse.click(x,y);},
    key: k=>page.keyboard.press(k)
  };
  let failed=false;
  try {
    console.log(kind,browser.version(),stage);
    console.log(await videoFocus(session));
    if(errors.length)throw new Error(`page errors: ${errors.join('; ')}`);
  }catch(e){
    failed=true;
    console.error(e.stack);
    console.log(await page.evaluate(()=>({active:document.activeElement?.id,focusVisible:document.activeElement?.matches(':focus-visible'),fullscreen:document.fullscreenElement?.id,buttonDisplay:document.querySelector('mdm-video-button')?.style.display})));
    await page.screenshot({path:`${out}/${stage}-${kind}-failure.png`});
  }finally{
    await browser.close();
    await new Promise(r=>server.close(r));
  }
  if(failed)process.exitCode=1;
})();
