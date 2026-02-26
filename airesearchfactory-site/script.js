const ORG = 'AIResearchFactory';

function fmtDate(iso) {
  if (!iso) return 'n/a';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function installCommand(name) {
  return [
    `git clone https://github.com/${ORG}/${name}`,
    `cd ${name}`,
    'npm install',
    'npm run dev'
  ].join('\n');
}

async function boot() {
  const repoCount = document.getElementById('repoCount');
  const starCount = document.getElementById('starCount');
  const latestRepo = document.getElementById('latestRepo');
  const productsGrid = document.getElementById('productsGrid');
  const repoSelect = document.getElementById('repoSelect');
  const cmd = document.getElementById('cmd');

  try {
    const res = await fetch(`https://api.github.com/orgs/${ORG}/repos?per_page=100&sort=updated`);
    if (!res.ok) throw new Error(`GitHub API failed: ${res.status}`);

    const repos = await res.json();
    if (!Array.isArray(repos) || repos.length === 0) throw new Error('No repositories found for org');

    const stars = repos.reduce((n, r) => n + (r.stargazers_count || 0), 0);
    repoCount.textContent = `${repos.length} repos`;
    starCount.textContent = `${stars} stars`;
    latestRepo.textContent = `latest: ${repos[0].name}`;

    productsGrid.innerHTML = repos
      .map((r) => {
        const desc = r.description || 'No description provided yet.';
        const lang = r.language || 'n/a';
        return `
          <article class="card">
            <h3>${r.name}</h3>
            <p>${desc}</p>
            <div class="meta">
              <span>★ ${r.stargazers_count}</span>
              <span>${lang}</span>
              <span>Updated ${fmtDate(r.updated_at)}</span>
            </div>
            <a href="${r.html_url}" target="_blank" rel="noreferrer">Open repository</a>
          </article>
        `;
      })
      .join('');

    repoSelect.innerHTML = repos.map((r) => `<option value="${r.name}">${r.name}</option>`).join('');
    const updateCmd = () => {
      cmd.textContent = installCommand(repoSelect.value);
    };
    repoSelect.addEventListener('change', updateCmd);
    updateCmd();
  } catch (err) {
    console.error(err);
    productsGrid.innerHTML = `
      <article class="card">
        <h3>Could not load live data</h3>
        <p>Reason: ${err.message}</p>
        <a href="https://github.com/${ORG}" target="_blank" rel="noreferrer">Open GitHub organization</a>
      </article>
    `;
    repoSelect.innerHTML = '<option value="ai-researcher">ai-researcher</option>';
    cmd.textContent = installCommand('ai-researcher');
  }
}

boot();
