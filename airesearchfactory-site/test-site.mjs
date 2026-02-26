import { readFile } from 'node:fs/promises';

const ORG_API = 'https://api.github.com/orgs/AIResearchFactory/repos?per_page=100&sort=updated';

const results = [];

function record(name, pass, details) {
  results.push({ name, pass, details });
}

async function run() {
  // Test 1: GitHub API availability
  try {
    const res = await fetch(ORG_API, { headers: { 'User-Agent': 'OpenClaw-Site-Test' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const repos = await res.json();
    record('GitHub API reachable', true, `Loaded ${repos.length} repositories.`);
    record('Organization has products/repos', Array.isArray(repos) && repos.length > 0, repos.length > 0 ? `First repo: ${repos[0].name}` : 'No repositories returned.');
  } catch (err) {
    record('GitHub API reachable', false, String(err.message || err));
    record('Organization has products/repos', false, 'Skipped because API request failed.');
  }

  // Test 2: Required HTML structure
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const requiredIds = ['repoCount', 'starCount', 'latestRepo', 'productsGrid', 'repoSelect', 'cmd'];
  for (const id of requiredIds) {
    record(`HTML contains #${id}`, html.includes(`id="${id}"`), html.includes(`id="${id}"`) ? 'Present' : 'Missing');
  }

  // Test 3: Security/robustness checks
  record('External links use rel="noreferrer"', /target="_blank"\s+rel="noreferrer"/.test(html), 'Checked anchor hardening for reverse-tabnabbing.');
  record('Page has meta description', /<meta name="description"/i.test(html), 'SEO/preview support.');

  // Test 4: JS syntax
  try {
    const js = await readFile(new URL('./script.js', import.meta.url), 'utf8');
    // basic parser check using Function constructor
    new Function(js);
    record('script.js syntax valid', true, 'No parse errors.');
    record('Client code includes error fallback', js.includes('Could not load live data'), 'Graceful failure path exists.');
  } catch (err) {
    record('script.js syntax valid', false, String(err.message || err));
    record('Client code includes error fallback', false, 'Skipped due to parse failure.');
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(JSON.stringify({ passed, failed, results }, null, 2));
}

run();
