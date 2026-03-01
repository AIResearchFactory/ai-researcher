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
    let workflows = [
      {
        id:'daily-brief', project_id:'p1', name:'Daily Brief', description:'Morning digest workflow',
        steps:[{id:'s1',name:'Collect',step_type:'Skill',config:{parameters:{}},depends_on:[]}],
        version:'1.0.0', created:new Date().toISOString(), updated:new Date().toISOString(),
        schedule:{ enabled:true, cron:'0 8 * * *', timezone:'Asia/Jerusalem', next_run_at:new Date(Date.now()+3600e3).toISOString(), last_triggered_at:null }
      },
      {
        id:'weekly-report', project_id:'p1', name:'Weekly Report', description:'Friday summary',
        steps:[{id:'s1',name:'Compile',step_type:'Skill',config:{parameters:{}},depends_on:[]}],
        version:'1.0.0', created:new Date().toISOString(), updated:new Date().toISOString(),
        schedule:undefined
      }
    ];

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
        case 'save_workflow': {
          const w = { ...args.workflow };
          const i = workflows.findIndex(x => x.id === w.id);
          if (i >= 0) workflows[i] = w; else workflows = [w, ...workflows];
          return true;
        }
        case 'set_workflow_schedule': {
          const i = workflows.findIndex(x => x.id === args.workflowId);
          if (i >= 0) workflows[i] = { ...workflows[i], schedule: args.schedule };
          return workflows[i];
        }
        case 'clear_workflow_schedule': {
          const i = workflows.findIndex(x => x.id === args.workflowId);
          if (i >= 0) workflows[i] = { ...workflows[i], schedule: undefined };
          return workflows[i];
        }
        default: return null;
      }
    };

    window.__TAURI_INTERNALS__ = { transformCallback: cb => cb, invoke: (cmd,args) => inv(cmd,args) };
    window.__TAURI__ = { core: { invoke: (cmd,args) => inv(cmd,args), transformCallback: cb => cb }, event: { listen: async()=>()=>{}, emit: async()=>{} } };
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1) Open workflows and show list + flow hint
  await page.getByTitle('Workflows').click().catch(()=>{});
  await page.waitForTimeout(1200);

  // 2) Create workflow via dedicated screen
  await page.getByRole('button', { name: /Create Workflow/i }).click().catch(()=>{});
  await page.waitForTimeout(700);
  await page.locator('#wf-name').fill('UX Review Workflow').catch(()=>{});
  await page.locator('#wf-desc').fill('Created from dedicated create screen').catch(()=>{});

  // show disabled schedule defaults first, then enable and set preset
  await page.waitForTimeout(800);
  await page.getByRole('switch').first().click().catch(()=>{});
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Daily 08:00/i }).click().catch(()=>{});
  await page.getByRole('button', { name: /Create workflow/i }).click().catch(()=>{});
  await page.waitForTimeout(1200);

  // 3) Edit existing workflow through row action then save
  await page.getByTitle('Workflows').click().catch(()=>{});
  await page.waitForTimeout(700);
  await page.getByText('Daily Brief', { exact:false }).first().hover().catch(()=>{});
  await page.getByTitle('Edit Workflow').first().click().catch(()=>{});
  await page.waitForTimeout(700);
  await page.locator('#wf-desc').fill('Edited from dedicated edit screen').catch(()=>{});
  await page.getByRole('button', { name: /Save changes/i }).click().catch(()=>{});
  await page.waitForTimeout(1200);

  await page.screenshot({ path: `${outDir}/38-workflow-ux-review.png`, fullPage: true });

  const videoPath = await page.video().path();
  await context.close();
  await browser.close();

  const final = `${outDir}/workflow-ux-review-demo.webm`;
  fs.copyFileSync(videoPath, final);
  console.log(`VIDEO=${final}`);
})();
