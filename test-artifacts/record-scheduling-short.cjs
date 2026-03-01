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
    const fakeProject = {
      id: 'p1', name: 'Demo Project', goal: 'Schedule flows', path: '/demo',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), skills: []
    };

    let wf = {
      id: 'wf-1', project_id: 'p1', name: 'Daily Research Brief', description: 'Generate daily brief',
      steps: [{ id: 's1', name: 'Collect Sources', step_type: 'agent', config: { parameters: {} }, depends_on: [] }],
      version: '1.0.0', created: new Date().toISOString(), updated: new Date().toISOString(),
      schedule: { enabled: true, cron: '0 9 * * *', timezone: 'Asia/Jerusalem', next_run_at: new Date(Date.now()+3600e3).toISOString() }
    };

    const inv = async (cmd, args) => {
      switch (cmd) {
        case 'is_first_install': return false;
        case 'get_all_projects': return [fakeProject];
        case 'get_project': return fakeProject;
        case 'get_project_files': return [];
        case 'get_chat_files': return [];
        case 'load_chat_history': return [];
        case 'get_all_skills': return [{ id: 's1', name: 'Research Skill', description: 'Demo' }];
        case 'list_artifacts': return [];
        case 'get_global_settings': return { activeProvider: 'ollama', theme: 'dark', customClis: [] };
        case 'list_available_providers': return ['ollama','hostedApi','liteLlm'];
        case 'get_ollama_models': return ['qwen2.5:0.5b'];
        case 'detect_ollama': return { installed: true, running: true };
        case 'detect_claude_code': return { installed: false };
        case 'detect_gemini': return { installed: false };
        case 'detect_all_cli_tools': return [{ installed: false }, { installed: true, running: true }, { installed: false }];
        case 'get_mcp_servers': return [];
        case 'fetch_mcp_marketplace': return [];
        case 'get_project_workflows': return [wf];
        case 'save_workflow': wf = { ...wf, ...args.workflow }; return wf;
        case 'set_workflow_schedule': wf = { ...wf, schedule: args.schedule, updated: new Date().toISOString() }; return wf;
        case 'clear_workflow_schedule': wf = { ...wf, schedule: undefined, updated: new Date().toISOString() }; return wf;
        case 'get_app_data_directory': return 'C:/Users/User/AppData/Roaming/ai-researcher';
        case 'check_installation_status': return { complete: true };
        case 'verify_installation_integrity': return { ok: true };
        case 'check_and_preserve_structure': return true;
        case 'verify_directory_structure': return true;
        case 'send_message': return { content: 'Mock response', done: true };
        default: return null;
      }
    };

    window.__TAURI_INTERNALS__ = { transformCallback: (cb) => cb, invoke: (cmd, args) => inv(cmd, args) };
    window.__TAURI__ = { core: { invoke: (cmd, args) => inv(cmd, args), transformCallback: (cb) => cb }, event: { listen: async () => () => {}, emit: async () => {} } };
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // 1) Show schedule chip in workflow list/dashboard
  await page.getByTitle('Workflows').click().catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/30-short-1-list.png`, fullPage: true });

  // 2) Open workflow + schedule dialog
  await page.getByText('Daily Research Brief', { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Schedule|Scheduled/i }).first().click().catch(() => {});
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${outDir}/31-short-2-dialog.png`, fullPage: true });

  // 3) Pick preset + save
  await page.getByRole('button', { name: /Weekdays/i }).click().catch(() => {});
  await page.getByRole('button', { name: /Save schedule/i }).click().catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/32-short-3-saved.png`, fullPage: true });

  // 4) Quick chat scheduling command
  await page.getByText('Copilot', { exact: false }).click().catch(() => {});
  const ta = page.locator('textarea').last();
  await ta.fill('schedule #Daily Research Brief daily at 8:30 in Asia/Jerusalem').catch(() => {});
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${outDir}/33-short-4-chat.png`, fullPage: true });

  const v = await page.video().path();
  await context.close();
  await browser.close();
  const finalVideo = `${outDir}/scheduling-demo-short.webm`;
  try { fs.copyFileSync(v, finalVideo); } catch {}
  console.log(`VIDEO=${finalVideo}`);
})();
