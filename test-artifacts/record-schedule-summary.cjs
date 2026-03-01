const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const outDir = 'C:/Users/User/.openclaw/workspace/products/ai-researcher/test-artifacts';
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: outDir, size: { width: 1280, height: 720 } } });

  await context.addInitScript(() => {
    const p = { id:'p1', name:'Demo Project', goal:'demo', path:'/demo', created_at:new Date().toISOString(), updated_at:new Date().toISOString(), skills:[] };
    const wf = { id:'wf-1', project_id:'p1', name:'Proof Workflow', description:'demo', steps:[{id:'s1',name:'Step 1',step_type:'Skill',config:{parameters:{}},depends_on:[]}], version:'1.0.0', created:new Date().toISOString(), updated:new Date().toISOString(), schedule:{ enabled:true, cron:'30 8 * * 1-5', timezone:'Asia/Jerusalem', next_run_at:new Date(Date.now()+3600e3).toISOString(), last_triggered_at:new Date(Date.now()-3600e3).toISOString() } };
    const inv = async (cmd,args)=>{ switch(cmd){ case 'is_first_install': return false; case 'get_all_projects': return [p]; case 'get_project': return p; case 'get_project_files': return []; case 'get_chat_files': return []; case 'load_chat_history': return []; case 'get_all_skills': return [{id:'s1',name:'Skill',description:'d'}]; case 'get_global_settings': return {activeProvider:'ollama'}; case 'get_project_workflows': return [wf]; case 'detect_ollama': return {installed:true,running:true}; default: return null; } };
    window.__TAURI_INTERNALS__ = { transformCallback: cb=>cb, invoke:(cmd,args)=>inv(cmd,args) };
    window.__TAURI__ = { core:{ invoke:(cmd,args)=>inv(cmd,args), transformCallback:cb=>cb }, event:{ listen: async()=>()=>{}, emit: async()=>{} } };
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByTitle('Workflows').click().catch(()=>{});
  await page.getByText('Proof Workflow', { exact:false }).first().click().catch(()=>{});
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${outDir}/35-schedule-summary.png`, fullPage: true });
  const v = await page.video().path();
  await context.close();
  await browser.close();
  fs.copyFileSync(v, `${outDir}/schedule-summary-demo.webm`);
})();
