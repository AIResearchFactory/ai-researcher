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
    let workflows = [];

    const makeWorkflow = (name='Daily 08:00 Demo Workflow') => ({
      id: `wf-${Date.now()}`,
      project_id: 'p1',
      name,
      description: 'Created in demo',
      steps: [{ id:'s1', name:'Step 1', step_type:'Skill', config:{ parameters:{} }, depends_on:[] }],
      version:'1.0.0', created:new Date().toISOString(), updated:new Date().toISOString(),
      schedule: undefined, status: null, last_run: null
    });

    const inv = async (cmd, args) => {
      switch (cmd) {
        case 'is_first_install': return false;
        case 'get_all_projects': return [project];
        case 'get_project': return project;
        case 'get_project_files': return [];
        case 'get_chat_files': return [];
        case 'load_chat_history': return [];
        case 'get_all_skills': return [{id:'s1', name:'Research Skill', description:'Demo'}];
        case 'list_artifacts': return [];
        case 'get_global_settings': return { activeProvider:'ollama', customClis:[] };
        case 'list_available_providers': return ['ollama'];
        case 'get_ollama_models': return ['qwen2.5:0.5b'];
        case 'detect_ollama': return { installed:true, running:true };
        case 'detect_claude_code': return { installed:false };
        case 'detect_gemini': return { installed:false };
        case 'detect_all_cli_tools': return [{ installed:false },{ installed:true, running:true },{ installed:false }];
        case 'get_mcp_servers': return [];
        case 'fetch_mcp_marketplace': return [];
        case 'get_project_workflows': return workflows;
        case 'create_workflow': {
          const wf = makeWorkflow(args?.name || 'Daily 08:00 Demo Workflow');
          workflows = [wf, ...workflows];
          return wf;
        }
        case 'save_workflow': {
          const i = workflows.findIndex(w => w.id === args.workflow.id);
          if (i >= 0) workflows[i] = { ...workflows[i], ...args.workflow, updated:new Date().toISOString() };
          return workflows[i] || args.workflow;
        }
        case 'set_workflow_schedule': {
          const i = workflows.findIndex(w => w.id === args.workflowId);
          if (i >= 0) workflows[i] = { ...workflows[i], schedule: args.schedule, updated:new Date().toISOString() };
          return workflows[i];
        }
        case 'execute_workflow': {
          const i = workflows.findIndex(w => w.id === args.workflowId);
          if (i >= 0) {
            workflows[i].status = 'Completed';
            workflows[i].last_run = new Date().toISOString();
          }
          return {
            workflow_id: args.workflowId,
            status: 'Completed',
            started: new Date().toISOString(),
            completed: new Date().toISOString(),
            steps_total: 1,
            steps_completed: 1,
            steps_failed: 0,
            step_results: [],
            errors: []
          };
        }
        default: return null;
      }
    };

    window.__TAURI_INTERNALS__ = { transformCallback: cb => cb, invoke: (cmd,args) => inv(cmd,args) };
    window.__TAURI__ = { core:{ invoke:(cmd,args)=>inv(cmd,args), transformCallback: cb=>cb }, event:{ listen: async()=>()=>{}, emit: async()=>{} } };
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // open workflows and create
  await page.getByTitle('Workflows').click().catch(()=>{});
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /New Workflow/i }).click().catch(()=>{});
  await page.waitForTimeout(700);

  // set name if field visible
  const nameInput = page.locator('input').first();
  if (await nameInput.count()) {
    await nameInput.fill('Daily 08:00 Demo Workflow').catch(()=>{});
  }

  // save workflow
  await page.getByRole('button', { name: /^Save$/i }).first().click().catch(()=>{});
  await page.waitForTimeout(900);

  // open schedule dialog
  await page.getByRole('button', { name: /Schedule|Scheduled/i }).first().click().catch(()=>{});
  await page.waitForTimeout(500);

  // set daily 08:00 via cron input for decisiveness
  const cronInput = page.locator('#wf-cron');
  if (await cronInput.count()) {
    await cronInput.fill('0 8 * * *').catch(()=>{});
  }
  const tzInput = page.locator('#wf-timezone');
  if (await tzInput.count()) {
    await tzInput.fill('Asia/Jerusalem').catch(()=>{});
  }
  await page.getByRole('button', { name: /Save schedule/i }).click().catch(()=>{});
  await page.waitForTimeout(1100);

  // execute now (manual run)
  await page.getByRole('button', { name: /^Run$/i }).first().click().catch(()=>{});
  await page.waitForTimeout(1500);

  await page.screenshot({ path: `${outDir}/36-creation-to-execution.png`, fullPage: true });

  const v = await page.video().path();
  await context.close();
  await browser.close();

  const final = `${outDir}/creation-to-execution-demo.webm`;
  try { fs.copyFileSync(v, final); } catch {}
  console.log(`VIDEO=${final}`);
})();
