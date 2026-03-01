const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const outDir = 'C:/Users/User/.openclaw/workspace/products/ai-researcher/test-artifacts';
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } }
  });

  await context.addInitScript(() => {
    const project = { id:'p1', name:'Demo Project', goal:'demo', path:'/demo', created_at:new Date().toISOString(), updated_at:new Date().toISOString(), skills:[] };
    let workflows = [{
      id:'daily-brief', project_id:'p1', name:'Daily Brief', description:'Morning digest workflow',
      steps:[{id:'s1',name:'Collect',step_type:'Skill',config:{parameters:{}},depends_on:[]}],
      version:'1.0.0', created:new Date().toISOString(), updated:new Date().toISOString(),
      schedule:{ enabled:true, cron:'0 8 * * *', timezone:'Asia/Jerusalem', next_run_at:new Date(Date.now()+3600e3).toISOString(), last_triggered_at:null }
    }];

    const inv = async (cmd, args) => {
      switch (cmd) {
        case 'is_first_install': return false;
        case 'get_all_projects': return [project];
        case 'get_project': return project;
        case 'get_project_files': return [];
        case 'get_chat_files': return [];
        case 'load_chat_history': return [];
        case 'get_all_skills': return [{id:'s1',name:'Research Skill',description:'Demo'}];
        case 'list_artifacts': return [];
        case 'get_global_settings': return { activeProvider:'ollama', customClis:[] };
        case 'list_available_providers': return ['ollama'];
        case 'get_ollama_models': return ['qwen2.5:0.5b'];
        case 'detect_ollama': return { installed:true, running:true };
        case 'detect_claude_code': return { installed:false };
        case 'detect_gemini': return { installed:false };
        case 'detect_all_cli_tools': return [{ installed:false }, { installed:true, running:true }, { installed:false }];
        case 'get_mcp_servers': return [];
        case 'fetch_mcp_marketplace': return [];
        case 'get_project_workflows': return workflows;
        case 'set_workflow_schedule': {
          const i = workflows.findIndex(w => w.id === args.workflowId);
          if (i >= 0) workflows[i] = { ...workflows[i], schedule: args.schedule };
          return workflows[i];
        }
        case 'save_workflow': return true;
        default: return null;
      }
    };

    window.__TAURI_INTERNALS__ = { transformCallback: cb => cb, invoke: (cmd,args) => inv(cmd,args) };
    window.__TAURI__ = { core: { invoke: (cmd,args) => inv(cmd,args), transformCallback: cb => cb }, event: { listen: async()=>()=>{}, emit: async()=>{} } };
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  await page.getByTitle('Workflows').click().catch(()=>{});
  await page.waitForTimeout(500);
  await page.getByText('Daily Brief', { exact:false }).first().click().catch(()=>{});
  await page.waitForTimeout(700);

  // pause from toolbar
  await page.getByRole('button', { name: /Pause Schedule/i }).first().click().catch(()=>{});
  await page.waitForTimeout(900);

  // resume from same toolbar button
  await page.getByRole('button', { name: /Resume Schedule/i }).first().click().catch(()=>{});
  await page.waitForTimeout(1000);

  await page.screenshot({ path: `${outDir}/39-toolbar-pause-resume.png`, fullPage: true });

  const videoPath = await page.video().path();
  await context.close();
  await browser.close();
  fs.copyFileSync(videoPath, `${outDir}/toolbar-pause-resume-demo.webm`);
})();
