// ═══════════════ PIPELINE CONTROLLER ═══════════════
// Handles the demo/live flow, API calls, and UI state

let currentMode = 'demo';
let sourceText = "";
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

// ═══════════════ PIPELINE STEPS ═══════════════

async function runRelevancy() {
  if (!sourceText.trim()) {
    alert("Please provide some source text first.");
    return;
  }

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

  // API Call
  const endpoint = currentMode === 'demo' ? '/api/demo/relevancy' : '/api/live/relevancy';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sourceText })
    });
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    
    relevancyResult = data;

    // Render Checklist
    renderRelevancyChecklist(data.checks);
    
    // Render Verdict
    spinner.style.display = 'none';
    checklist.style.display = 'grid';
    verdict.style.display = 'block';
    
    if (data.overall) {
      verdict.className = "relevancy-verdict pass";
      verdict.innerHTML = `<strong>PASS:</strong> ${data.summary}`;
      actions.style.display = 'flex';
    } else {
      verdict.className = "relevancy-verdict fail";
      verdict.innerHTML = `<strong>REJECTED:</strong> ${data.summary}`;
    }

  } catch (err) {
    spinner.style.display = 'none';
    alert("Error running relevancy: " + err.message);
  }
}

function renderRelevancyChecklist(checks) {
  const container = document.getElementById('relevancy-checklist');
  container.innerHTML = "";

  checks.forEach((c, idx) => {
    const icon = c.result 
      ? `<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    
    const card = document.createElement('div');
    card.className = `check-card ${c.result ? 'pass' : 'fail'}`;
    card.style.animation = `fadeSlideIn 0.3s ease forwards ${idx * 0.1}s`;
    card.style.opacity = 0;

    card.innerHTML = `
      <div class="check-header">
        ${icon}
        <span>${c.label}</span>
      </div>
      <div class="check-reasoning">${c.reasoning}</div>
    `;
    container.appendChild(card);
  });
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

  // API Call
  const endpoint = currentMode === 'demo' ? '/api/demo/extraction' : '/api/live/extraction';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sourceText })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    extractionResult = data;

    // Render
    document.getElementById('source-chip').innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
      Source: ${data.source_label} (${data.source_quality})
    `;

    renderImpactCards(data.geojson.features);
    document.getElementById('geojson-pre').textContent = JSON.stringify(data.geojson, null, 2);

    spinner.style.display = 'none';
    results.style.display = 'block';

  } catch (err) {
    spinner.style.display = 'none';
    alert("Error running extraction: " + err.message);
  }
}

function renderImpactCards(features) {
  const container = document.getElementById('impact-cards-grid');
  container.innerHTML = "";

  features.forEach((f, idx) => {
    const p = f.properties;
    const card = document.createElement('div');
    card.className = "impact-card";
    card.style.animation = `fadeSlideIn 0.3s ease forwards ${idx * 0.1}s`;
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
  });
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

  // API Call
  const endpoint = currentMode === 'demo' ? '/api/demo/severity' : '/api/live/severity';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ impacts: extractionResult.geojson.features })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    severityResult = data;

    renderSeverityCards(data.assessments);
    renderConfidence(data.confidence);
    
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

  } catch (err) {
    spinner.style.display = 'none';
    alert("Error running severity assessment: " + err.message);
  }
}

function renderSeverityCards(assessments) {
  const container = document.getElementById('severity-cards-grid');
  container.innerHTML = "";

  assessments.forEach((a, idx) => {
    const card = document.createElement('div');
    card.className = "sev-card";
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
  });
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
