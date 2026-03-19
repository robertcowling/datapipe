// ═══════════════ PIPELINE CONTROLLER ═══════════════
// Handles the demo/live flow, API calls, and UI state

let currentMode = 'demo';
let sourceText = "";
let pipelineText = "";
let relevancyResult = null;
let extractionResult = null;
let severityResult = null;

// On Load
document.addEventListener('DOMContentLoaded', () => {
  setMode('demo');
  updateCharCount();
  
  // Text area auto-update
  const textarea = document.getElementById('source-text');
  textarea.addEventListener('input', () => {
    updateCharCount();
    sourceText = textarea.value;
  });
});

// ═══════════════ CORE FUNCTIONS ═══════════════

function setMode(mode) {
  currentMode = mode;
  const btnDemo = document.getElementById('btn-demo');
  const btnLive = document.getElementById('btn-live');
  const badgeText = document.getElementById('mode-badge-text');
  const footerMode = document.getElementById('footer-mode');
  const banner = document.getElementById('demo-banner-1');

  if (mode === 'demo') {
    btnDemo.classList.add('active');
    btnLive.classList.remove('active');
    badgeText.textContent = "🎬 DEMO";
    footerMode.textContent = "Demo Mode";
    banner.style.display = 'flex';
    loadDemoText();
  } else {
    btnDemo.classList.remove('active');
    btnLive.classList.add('active');
    badgeText.textContent = "🌐 LIVE";
    footerMode.textContent = "Live Mode";
    banner.style.display = 'none';
    clearText();
  }
}

function updateCharCount() {
  const count = document.getElementById('source-text').value.length;
  document.getElementById('char-count').textContent = `${count} characters`;
}

function loadDemoText() {
  const demoText = `Heavy flooding has struck the Somerset Levels overnight, with the A361 between Taunton and Glastonbury reported as completely impassable due to standing water reaching up to one metre in places. Emergency services mounted a rescue operation in the early hours, recovering three people stranded on the roof of a vehicle near Burrowbridge. The Environment Agency has confirmed river levels on the River Parrett are at their highest since 2014. Approximately 40 properties in the Langport area are currently flooded and residents have been evacuated to a rest centre at Langport Town Hall. Somerset Council has declared a major incident. Power outages are affecting around 500 homes in the Bridgwater and Taunton areas. Network Rail has suspended services between Taunton and Castle Cary due to flooding of the track at Cogload Junction. [Source: BBC News, 18 March 2026]`;
  document.getElementById('source-text').value = demoText;
  sourceText = demoText;
  updateCharCount();
}

function clearText() {
  document.getElementById('source-text').value = "";
  sourceText = "";
  updateCharCount();
  resetPipeline(0);
}

function resetPipeline(fromStep) {
  // Lock subsequent steps
  for (let i = fromStep + 1; i <= 4; i++) {
    const step = document.getElementById(`step-${i}`);
    const po = document.getElementById(`po-${i}`);
    step.classList.add('locked');
    step.classList.remove('active-step');
    po.classList.remove('active');
  }
}

// ═══════════════ ANIMATIONS & UTILS ═══════════════

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function playTerminalAnimation(terminalElementId, lines) {
  const terminal = document.getElementById(terminalElementId);
  terminal.innerHTML = '';
  for (let i = 0; i < lines.length; i++) {
    const div = document.createElement('div');
    div.className = 'terminal-line';
    div.textContent = `> ${lines[i]}`;
    terminal.appendChild(div);
    // Auto-scroll to bottom of terminal container if it exceeds max height
    if (terminal.children.length > 3) {
        terminal.removeChild(terminal.firstChild);
    }
    await sleep(400); // Wait 400ms between lines
  }
}

// ═══════════════ PIPELINE STEPS ═══════════════

async function runRelevancy() {
  if (!sourceText.trim()) {
    alert("Please provide some source text first.");
    return;
  }

  pipelineText = sourceText;

  // UI Setup
  resetPipeline(1);
  const step2 = document.getElementById('step-2');
  const po2 = document.getElementById('po-2');
  const spinner = document.getElementById('llm-thinking-2');
  const checklist = document.getElementById('relevancy-checklist');
  const verdict = document.getElementById('relevancy-verdict');
  const actions = document.getElementById('step2-actions');

  step2.classList.remove('locked');
  step2.classList.add('active-step');
  po2.classList.add('active');
  spinner.style.display = 'flex';
  checklist.style.display = 'none';
  verdict.style.display = 'none';
  actions.style.display = 'none';

  // Smooth scroll
  step2.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Terminal Animation
  const animPromise = playTerminalAnimation('thinking-terminal-2', [
    "Initializing relevancy agent...",
    "Tokenizing input text...",
    "Evaluating against framework criteria...",
    "Validating source recency...",
    "Synthesizing relevancy report..."
  ]);

  // API Call
  const endpoint = currentMode === 'demo' ? '/api/demo/relevancy' : '/api/live/relevancy';
  try {
    const [response, _] = await Promise.all([
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pipelineText })
      }),
      animPromise // Ensure animation completes
    ]);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    
    relevancyResult = data;

    // Render Checklist
    spinner.style.display = 'none';
    checklist.style.display = 'grid';
    await renderRelevancyChecklist(data.checks);

    // Render Verdict
    verdict.style.display = 'block';
    
    if (data.overall) {
      verdict.className = "relevancy-verdict pass";
      verdict.innerHTML = `<strong>PASS:</strong> ${data.summary}`;
      actions.style.display = 'flex';

      // Auto-proceed to extraction
      const proceedBtn = document.getElementById('btn-run-extraction');
      proceedBtn.innerHTML = `
        <div class="thinking-spinner" style="width: 14px; height: 14px; border-width: 2px; margin-right: 8px;"></div>
        Auto-proceeding to Impact Extraction...
      `;
      setTimeout(() => {
        proceedBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Proceed to Impact Extraction
        `;
        runExtraction();
      }, 1500);

    } else {
      verdict.className = "relevancy-verdict fail";
      verdict.innerHTML = `<strong>REJECTED:</strong> ${data.summary}`;
    }

  } catch (err) {
    spinner.style.display = 'none';
    alert("Error running relevancy: " + err.message);
  }
}

async function renderRelevancyChecklist(checks) {
  const container = document.getElementById('relevancy-checklist');
  container.innerHTML = "";

  for (let idx = 0; idx < checks.length; idx++) {
    const c = checks[idx];
    const icon = c.result 
      ? `<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    
    const card = document.createElement('div');
    card.className = `check-card ${c.result ? 'pass' : 'fail'}`;
    card.style.animation = `fadeSlideIn 0.3s ease forwards`;
    card.style.opacity = 0;

    card.innerHTML = `
      <div class="check-header">
        ${icon}
        <span>${c.label}</span>
      </div>
      <div class="check-reasoning">${c.reasoning}</div>
    `;
    container.appendChild(card);
    await sleep(200); // Wait 200ms before rendering the next card
  }
}

async function runExtraction() {
  // UI Setup
  resetPipeline(2);
  const step3 = document.getElementById('step-3');
  const po3 = document.getElementById('po-3');
  const spinner = document.getElementById('llm-thinking-3');
  const results = document.getElementById('extraction-results');

  step3.classList.remove('locked');
  step3.classList.add('active-step');
  po3.classList.add('active');
  spinner.style.display = 'flex';
  results.style.display = 'none';

  step3.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Terminal Animation
  const animPromise = playTerminalAnimation('thinking-terminal-3', [
    "Parsing relevant text segments...",
    "Identifying locations and entities...",
    "Geocoding locations to highest resolution...",
    "Extracting impact types and descriptions...",
    "Structuring output as GeoJSON..."
  ]);

  // API Call
  const endpoint = currentMode === 'demo' ? '/api/demo/extraction' : '/api/live/extraction';
  try {
    const [response, _] = await Promise.all([
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pipelineText })
      }),
      animPromise // Ensure animation completes
    ]);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    extractionResult = data;

    // Render
    document.getElementById('source-chip').innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
      Source: ${data.source_label} (${data.source_quality})
    `;

    document.getElementById('geojson-pre').textContent = JSON.stringify(data.geojson, null, 2);

    spinner.style.display = 'none';
    results.style.display = 'block';

    await renderImpactCards(data.geojson.features);

    // Auto-proceed to severity
    const proceedBtn = document.getElementById('btn-run-severity');
    proceedBtn.innerHTML = `
      <div class="thinking-spinner" style="width: 14px; height: 14px; border-width: 2px; margin-right: 8px;"></div>
      Auto-proceeding to Severity Assessment...
    `;
    setTimeout(() => {
      proceedBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Run Severity Assessment
      `;
      runSeverity();
    }, 1500);

  } catch (err) {
    spinner.style.display = 'none';
    alert("Error running extraction: " + err.message);
  }
}

async function renderImpactCards(features) {
  const container = document.getElementById('impact-cards-grid');
  container.innerHTML = "";

  for (let idx = 0; idx < features.length; idx++) {
    const f = features[idx];
    const p = f.properties;
    const card = document.createElement('div');
    card.className = "impact-card";
    card.style.animation = `fadeSlideIn 0.3s ease forwards`;
    card.style.opacity = 0;
    
    // Map category to color if needed (from style guide)
    const catColor = getCategoryColor(p.impact_category);

    card.innerHTML = `
      <div class="card-top">
        <span class="impact-id">${p.impact_id}</span>
        <span class="impact-cat-pill" style="border-left: 3px solid ${catColor}">${p.impact_category}</span>
      </div>
      <div class="impact-loc">${p.location_name}</div>
      <div class="impact-res">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
        Resolution: ${p.location_resolution}
      </div>
      <div class="impact-desc">${p.impact_description}</div>
    `;
    container.appendChild(card);
    await sleep(200); // Wait 200ms before rendering the next card
  }
}

function getCategoryColor(cat) {
  const cats = {
    "Transport": "#446b82",
    "Communities": "#4e828a",
    "Utilities": "#8a7d4e",
    "Power": "#8a7d4e",
    "Structures": "#5b61a1"
  };
  return cats[cat] || "#64748b";
}

let isGeoJsonVisible = false;
function toggleGeoJson() {
  const viewer = document.getElementById('geojson-viewer');
  isGeoJsonVisible = !isGeoJsonVisible;
  viewer.style.display = isGeoJsonVisible ? 'block' : 'none';
}

async function runSeverity() {
  // UI Setup
  resetPipeline(3);
  const step4 = document.getElementById('step-4');
  const po4 = document.getElementById('po-4');
  const spinner = document.getElementById('llm-thinking-4');
  const results = document.getElementById('severity-results');

  step4.classList.remove('locked');
  step4.classList.add('active-step');
  po4.classList.add('active');
  spinner.style.display = 'flex';
  results.style.display = 'none';

  step4.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Terminal Animation
  const animPromise = playTerminalAnimation('thinking-terminal-4', [
    "Loading National Flood Impact Framework...",
    "Cross-referencing impact categories...",
    "Assessing scale and disruption duration...",
    "Determining confidence based on source quality...",
    "Finalizing severity classification..."
  ]);

  // API Call
  const endpoint = currentMode === 'demo' ? '/api/demo/severity' : '/api/live/severity';
  try {
    const [response, _] = await Promise.all([
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ impacts: extractionResult.geojson.features })
      }),
      animPromise // Ensure animation completes
    ]);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    severityResult = data;

    // Overall Summary
    const overall = document.getElementById('overall-summary');
    overall.innerHTML = `
      <div class="overall-label">National Impact Level — Pipeline Final Result</div>
      <div class="overall-val" style="color: ${data.overall_severity === 'Severe' ? '#fff' : '#fff'}">${data.overall_severity}</div>
      <div class="overall-info" style="opacity: 0.8; font-size: 0.9rem;">
        Pipeline processing complete. ${data.assessments.length} impacts validated and ranked.
      </div>
    `;

    spinner.style.display = 'none';
    results.style.display = 'block';

    await renderSeverityCards(data.assessments);
    renderConfidence(data.confidence);

  } catch (err) {
    spinner.style.display = 'none';
    alert("Error running severity assessment: " + err.message);
  }
}

async function renderSeverityCards(assessments) {
  const container = document.getElementById('severity-cards-grid');
  container.innerHTML = "";

  for (let idx = 0; idx < assessments.length; idx++) {
    const a = assessments[idx];
    const card = document.createElement('div');
    card.className = "sev-card";
    card.style.animation = `fadeSlideIn 0.3s ease forwards`;
    card.style.opacity = 0;
    const sLevel = a.severity_level || 1;
    
    card.innerHTML = `
      <div class="sev-level-indicator s${sLevel}">
        <div style="font-size: 1.5rem; font-weight: 800;">L${sLevel}</div>
        <div class="sev-label">${a.severity}</div>
      </div>
      <div class="sev-card-body">
        <div class="sev-card-loc">${a.location}</div>
        <div class="sev-card-desc">${a.description}</div>
      </div>
      <div class="sev-card-rationale">
        <div class="rationale-label">Framework Rationale</div>
        <div class="rationale-text">"${a.rationale}"</div>
      </div>
    `;
    container.appendChild(card);
    await sleep(200); // Wait 200ms before rendering the next card
  }
}

function renderConfidence(conf) {
  const container = document.getElementById('confidence-panel');
  const ratingClass = conf.rating.toLowerCase(); // e.g. 'high' or 'med'
  
  container.innerHTML = `
    <div class="conf-header">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17 4 12"/></svg>
      <div style="font-weight: 700;">Initial Confidence Rating:</div>
      <div class="conf-pill ${ratingClass}">${conf.rating}</div>
    </div>
    <div style="font-size: 0.85rem; color: var(--clr-primary); padding-left: 30px; border-left: 2px solid var(--clr-border);">
      ${conf.rationale}
    </div>
  `;
}

// ═══════════════ ANIMATIONS ═══════════════
// Animation classes are handled in style.css
