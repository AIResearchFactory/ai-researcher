const healthPanelEl = document.getElementById('healthPanel');
const refreshHealthBtnEl = document.getElementById('refreshHealthBtn');
const panicBtnEl = document.getElementById('panicBtn');
const runtimeControlsEl = document.getElementById('runtimeControls');
const panicHintEl = document.getElementById('panicHint');

const validateBtnEl = document.getElementById('validateBtn');
const applyOptimizeBtnEl = document.getElementById('applyOptimizeBtn');
const keepCurrentBtnEl = document.getElementById('keepCurrentBtn');

const validatorResultEl = document.getElementById('validatorResult');
const approvalNoteEl = document.getElementById('approvalNote');
const currentSetupEl = document.getElementById('currentSetup');
const recommendedSetupEl = document.getElementById('recommendedSetup');

const competitorCountEl = document.getElementById('competitorCount');
const fanoutStepsEl = document.getElementById('fanoutSteps');
const perTaskRamMbEl = document.getElementById('perTaskRamMb');

let panicMode = false;
let lastHealth = null;
let lastValidation = null;

function collectPlanInput() {
  return {
    competitorCount: Number(competitorCountEl.value || 0),
    fanoutSteps: Number(fanoutStepsEl.value || 0),
    perTaskRamMb: Number(perTaskRamMbEl.value || 0)
  };
}

function renderSetupPanels() {
  const currentMax = lastHealth?.maxWorkers ?? '-';
  const currentSafe = lastHealth?.safeProfile?.enforced ? 'Enabled' : 'Disabled';
  currentSetupEl.innerHTML = `
    <div class="stat">Max parallel workers: <strong>${currentMax}</strong></div>
    <div class="stat">Safe profile: <strong>${currentSafe}</strong></div>
    <div class="stat">Current mode: <strong>${lastHealth?.mode || '-'}</strong></div>
  `;

  if (!lastValidation) {
    recommendedSetupEl.innerHTML = '<div class="stat">Run "Analyze Workflow" to get recommendations.</div>';
    return;
  }

  const sMap = new Map(lastValidation.suggestions.map((s) => [s.path, s.value]));
  recommendedSetupEl.innerHTML = `
    <div class="stat">Recommended max workers: <strong>${sMap.get('globalMaxParallel') ?? '-'}</strong></div>
    <div class="stat">Recommended batch size: <strong>${sMap.get('batchSize') ?? '-'}</strong></div>
    <div class="stat">Recommended timeout: <strong>${sMap.get('stepDefaults.timeoutMs') ?? '-'} ms</strong></div>
    <div class="stat">Risk level: <strong>${lastValidation.risk.toUpperCase()}</strong></div>
  `;
}

function renderHealth(state) {
  panicMode = Boolean(state.panicMode);
  lastHealth = state;
  const runActive = Number(state.activeWorkers || 0) > 0;

  healthPanelEl.innerHTML = `
    <div class="stat">System mode: <strong>${state.mode}</strong></div>
    <div class="stat">Active workers: <strong>${state.activeWorkers}/${state.maxWorkers}</strong></div>
    <div class="stat">Memory usage: <strong>${state.memory.usedPct}%</strong> (${state.memory.usedMb}MB / ${state.memory.totalMb}MB)</div>
    <div class="stat">Queue waiting: <strong>${state.queueDepth}</strong></div>
    <div class="stat">Last system note: <strong>${state.lastReason || 'None'}</strong></div>
  `;

  runtimeControlsEl.classList.toggle('hidden', !runActive);
  panicHintEl.classList.toggle('hidden', !runActive);
  panicBtnEl.textContent = panicMode ? 'Disable Panic Mode' : 'Activate Panic Mode';

  renderSetupPanels();
}

async function refreshHealth() {
  const res = await fetch('/api/runtime/health');
  const state = await res.json();
  renderHealth(state);
}

async function togglePanic() {
  const res = await fetch('/api/runtime/panic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enable: !panicMode })
  });
  const data = await res.json();
  renderHealth(data.state);
}

async function runValidation() {
  validatorResultEl.textContent = 'Analyzing workflow...';
  const plan = collectPlanInput();
  const res = await fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Validation failed');

  lastValidation = data;
  const issueText = data.issues.length
    ? data.issues.map((i) => `${i.severity.toUpperCase()}: ${i.message}`).join(' | ')
    : 'No major issues found.';

  validatorResultEl.textContent = `Risk: ${data.risk.toUpperCase()} • Estimated concurrent units: ${data.projection.projectedWorkers} • Estimated peak memory: ${data.projection.projectedPeakRamPct}% • ${issueText}`;
  approvalNoteEl.textContent = data.risk === 'low'
    ? 'Workflow looks safe. You can keep current setup or still apply recommendations.'
    : 'Workflow has risk. We recommend approving the safer setup before run.';

  renderSetupPanels();
}

async function applySafeOptimization() {
  const plan = collectPlanInput();
  const res = await fetch('/api/optimize/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to apply safe profile');

  lastValidation = data.validation;
  approvalNoteEl.textContent = `Approved and applied: max workers ${data.profile.globalMaxParallel}, batch size ${data.profile.batchSize}, timeout ${data.profile.timeoutMs}ms.`;
  await refreshHealth();
}

function keepCurrentSetup() {
  approvalNoteEl.textContent = 'Kept current setup. No optimization changes were applied.';
}

refreshHealthBtnEl.addEventListener('click', () => refreshHealth().catch((e) => (validatorResultEl.textContent = e.message)));
panicBtnEl.addEventListener('click', () => togglePanic().catch((e) => (validatorResultEl.textContent = e.message)));
validateBtnEl.addEventListener('click', () => runValidation().catch((e) => (validatorResultEl.textContent = e.message)));
applyOptimizeBtnEl.addEventListener('click', () => applySafeOptimization().catch((e) => (validatorResultEl.textContent = e.message)));
keepCurrentBtnEl.addEventListener('click', keepCurrentSetup);

refreshHealth().catch((e) => {
  validatorResultEl.textContent = e.message;
});
