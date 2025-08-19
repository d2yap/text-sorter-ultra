// Pairwise comparison sorter
const importBtn = document.getElementById('importBtn');
const inputText = document.getElementById('inputText');
const fileInput = document.getElementById('fileInput');
// dynamic choice buttons (for k-mode)
const choicesContainer = document.getElementById('choicesContainer');
const compareSection = document.getElementById('compareSection');
const importSection = document.getElementById('importSection');
const resultSection = document.getElementById('resultSection');
const outputText = document.getElementById('outputText');
const progress = document.getElementById('progress');
const restartBtn = document.getElementById('restartBtn');
const pickDoneBtn = document.getElementById('pickDoneBtn');

let items = [];
let sortOrder = [];
let pairs = [];
let currentPair = 0;
let voteCount = 0;
let mode = 'pairwise';
let k = 3;
let scores = [];
let pickModeSelected = []; // indices of items chosen in pick-then-rank
let pickSampled = []; // the sampled items shown in pick grid


function generatePairs(arr) {
    // All unique pairs (i < j)
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            result.push([i, j]);
        }
    }
    return result;
}

function startSort() {
    sortOrder = Array.from(items.keys());
    voteCount = 0;
    scores = Array(items.length).fill(0);
    mode = document.getElementById('modeSelect').value;
    k = Math.max(2, Math.min(20, parseInt(document.getElementById('kInput').value || '3')));
    importSection.style.display = 'none';
    compareSection.style.display = '';
    resultSection.style.display = 'none';
    // hide pick-done when not in pick grid mode
    if (pickDoneBtn && mode !== 'pickthenk') pickDoneBtn.style.display = 'none';
    if (mode === 'pairwise') {
        pairs = generatePairs(items);
        currentPair = 0;
        showNextPair();
    } else {
        if (mode === 'bestofk') {
            // best-of-k flow
            currentPair = 0;
            showNextKGroup();
        } else if (mode === 'pickthenk') {
            // pick-then-rank: sample up to 100 items, show pick grid
            preparePickGrid();
        }
    }
}

function preparePickGrid() {
    // sample up to 100 items from the full list (or use all if <=100)
    const n = Math.min(100, items.length);
    const pool = items.slice(0);
    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const sampled = pool.slice(0, n);
    pickSampled = sampled;
    // render as a grid of toggles
    choicesContainer.innerHTML = '';
    pickModeSelected = [];
    sampled.forEach((text, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'pick-item';
        wrapper.style.border = '1px solid rgba(255,255,255,0.04)';
        wrapper.style.padding = '8px';
        wrapper.style.borderRadius = '6px';
        wrapper.style.minWidth = '160px';
        wrapper.style.cursor = 'pointer';
        wrapper.textContent = text;
        wrapper.onclick = () => {
            if (pickModeSelected.includes(idx)) {
                pickModeSelected = pickModeSelected.filter(x=>x!==idx);
                wrapper.style.background='';
            } else {
                pickModeSelected.push(idx);
                wrapper.style.background='rgba(120,120,255,0.08)';
            }
            document.getElementById('pickDoneBtn').style.display = pickModeSelected.length? 'inline-block':'none';
            progress.textContent = `Pick your favorites (selected ${pickModeSelected.length})`;
        };
        choicesContainer.appendChild(wrapper);
    });
    progress.textContent = `Pick your favorites (selected ${pickModeSelected.length})`;
    document.getElementById('pickDoneBtn').style.display = 'none';
}

document.getElementById('pickDoneBtn').onclick = () => {
    // convert pickModeSelected indices (into sampled list) to real items array
    // The sampled items were the first n elements of a shuffled pool inside preparePickGrid; easier: reconstruct the same sampled array here
    const selected = pickModeSelected.map(i => pickSampled[i]).filter(Boolean);
    if (selected.length < 2) { alert('Please pick at least two items to rank.'); return; }
    // switch to best-of-k on the selected items
    items = selected;
    inputText.value = items.join('\n');
    // set k to 20 for the ranking phase
    document.getElementById('kInput').value = '20';
    mode = 'bestofk';
    scores = Array(items.length).fill(0);
    currentPair = 0;
    // hide the pick-done control once ranking begins
    if (pickDoneBtn) pickDoneBtn.style.display = 'none';
    showNextKGroup();
};

function showNextPair() {
    if (currentPair >= pairs.length) {
        // Sorting done
        // convert scores to order
        sortOrder = scores.map((s,i)=>i).sort((x,y)=>scores[y]-scores[x]);
        showResults();
        return;
    }
    const [a, b] = pairs[currentPair];
    // a and b are item indices into `items`
    choicesContainer.innerHTML = '';
    const btnA = document.createElement('button');
    btnA.className = 'choiceBtn';
    btnA.textContent = items[a];
    btnA.onclick = () => { handleChoiceForPair(a,b,0) };
    const btnB = document.createElement('button');
    btnB.className = 'choiceBtn';
    btnB.textContent = items[b];
    btnB.onclick = () => { handleChoiceForPair(a,b,1) };
    choicesContainer.appendChild(btnA);
    const vs = document.createElement('div'); vs.textContent = 'vs'; vs.style.color = '#9aa3c7'; vs.style.alignSelf='center'; vs.style.margin='0 8px';
    choicesContainer.appendChild(vs);
    choicesContainer.appendChild(btnB);
    progress.textContent = `Comparison ${currentPair + 1} of ${pairs.length}`;
}

function showNextKGroup() {
    // choose k distinct random items
    choicesContainer.innerHTML = '';
    const seq = [];
    const available = Array.from({length: items.length}, (_,i)=>i);
    for (let i=0;i<Math.min(k, items.length); i++) {
        const idx = Math.floor(Math.random()*available.length);
        seq.push(available.splice(idx,1)[0]);
    }
    seq.forEach(idx => {
        const b = document.createElement('button');
        b.className = 'choiceBtn';
        b.textContent = items[idx];
        b.onclick = () => { handleChoiceK(seq, idx) };
        choicesContainer.appendChild(b);
    });
    progress.textContent = `Round ${currentPair + 1} — choose best of ${seq.length}`;
}

function handleChoiceForPair(a,b,winner) {
    // update scores lightly
    if (winner === 0) scores[a] += 1; else scores[b] += 1;
    voteCount++;
    currentPair++;
    showNextPair();
}

function handleChoiceK(seq, chosenIdx) {
    // increment score for winner and small penalty for others
    seq.forEach(i => { if (i===chosenIdx) scores[i]+=2; else scores[i]+=0; });
    voteCount++;
    currentPair++;
    // simple stopping rule: do about n*log2(n)/log2(k) rounds
    const target = Math.max(10, Math.floor(items.length * Math.log2(Math.max(2, items.length)) / Math.log2(Math.max(2,k))));
    if (currentPair >= target) {
        // finish and rank by scores
        sortOrder = scores.map((s,i)=>i).sort((x,y)=>scores[y]-scores[x]);
        showResults();
    } else {
        showNextKGroup();
    }
}

// legacy pair button handlers removed (using dynamic buttons now)

importBtn.onclick = () => {
    items = inputText.value.split(/\r?\n/).filter(line => line.trim() !== '');
    if (items.length < 2) {
        alert('Please enter at least two items.');
        return;
    }
    // if dataset large, prompt to sample
    const LARGE = 2000;
    const selectedMode = document.getElementById('modeSelect')?.value;
    if (selectedMode === 'pickthenk') {
        // for pick-then-rank mode, don't warn about large datasets — we sample up to 100
        startSort();
        return;
    }
    if (items.length > LARGE) {
        showLargeDatasetModal(items.length);
    } else {
        startSort();
    }
};

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        const txt = evt.target.result;
        // if csv, try to parse 'name' header using PapaParse; handle headerless CSVs
        if (file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv')) {
            const delim = document.getElementById('csvDelimiterSelect')?.value || 'auto';
            const papaCfg = { header: true, skipEmptyLines: true };
            if (delim !== 'auto') papaCfg.delimiter = delim;
            const parsed = Papa.parse(txt, papaCfg);
            // If header mode found a 'name' column, use it
            if (parsed && parsed.data && parsed.data.length) {
                const headerKeys = Object.keys(parsed.data[0] || {}).map(h=>h.trim().toLowerCase());
                const nameKey = headerKeys.find(k => k === 'name');
                if (nameKey) {
                    const extracted = parsed.data.map(r => r[nameKey]).filter(Boolean).map(s=>s.trim());
                    if (extracted.length) {
                        inputText.value = extracted.join('\n');
                        importBtn.click();
                        return;
                    }
                }
            }
            // No name header — try headerless parsing and extract values
            const parsedNoHeader = Papa.parse(txt, { header: false, skipEmptyLines: true, delimiter: (document.getElementById('csvDelimiterSelect')?.value||'auto') });
            if (parsedNoHeader && parsedNoHeader.data && parsedNoHeader.data.length) {
                // If single row with many columns, treat that row as items
                let extracted = [];
                if (parsedNoHeader.data.length === 1 && parsedNoHeader.data[0].length > 1) {
                    extracted = parsedNoHeader.data[0].map(c => (c||'').toString().trim()).filter(Boolean);
                } else {
                    // Flatten all cells into a single list
                    extracted = parsedNoHeader.data.flat().map(c => (c||'').toString().trim()).filter(Boolean);
                }
                if (extracted.length) {
                    inputText.value = extracted.join('\n');
                    importBtn.click();
                    return;
                }
            }
        }
        // fallback: treat as plain text
        inputText.value = txt;
        importBtn.click();
    };
    reader.readAsText(file);
};

const rawUrlInput = document.getElementById('rawUrlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const autoStartUrl = document.getElementById('autoStartUrl');
const copySettingsBtn = document.getElementById('copySettingsBtn');

loadUrlBtn.onclick = async () => {
    const url = (rawUrlInput.value || '').trim();
    if (!url) { alert('Please enter a URL'); return; }
    try {
        const fetchUrl = convertToRawUrl(url);
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('Fetch failed: '+res.status);
        const txt = await res.text();
        // Decide if this is CSV: by URL extension, content-type header, or content heuristic
        const delimSel = document.getElementById('csvDelimiterSelect')?.value || 'auto';
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        const urlLower = url.toLowerCase();
        let isCsv = false;
        if (urlLower.endsWith('.csv')) isCsv = true;
        if (contentType.includes('csv')) isCsv = true;
        // basic heuristic: header line contains common delimiters
        if (!isCsv) {
            const firstLine = txt.split(/\r?\n/)[0] || '';
            if (firstLine.includes(',') || firstLine.includes(';') || firstLine.includes('\t') || firstLine.includes('|')) isCsv = true;
        }
        if (isCsv) {
            const delim = document.getElementById('csvDelimiterSelect')?.value || 'auto';
            const papaCfg = { header: true, skipEmptyLines: true };
            if (delim !== 'auto') papaCfg.delimiter = delim;
            const parsed = Papa.parse(txt, papaCfg);
            // If header mode found a 'name' column, use it
            if (parsed && parsed.data && parsed.data.length) {
                const headerKeys = Object.keys(parsed.data[0] || {}).map(h=>h.trim().toLowerCase());
                const nameKey = headerKeys.find(k => k === 'name');
                if (nameKey) {
                    const extracted = parsed.data.map(r => r[nameKey]).filter(Boolean).map(s=>s.trim());
                    if (extracted.length) {
                        inputText.value = extracted.join('\n');
                        if (autoStartUrl.checked) importBtn.click();
                        return;
                    }
                }
            }
            // No name header — try headerless parsing and extract values
            const parsedNoHeader = Papa.parse(txt, { header: false, skipEmptyLines: true, delimiter: (document.getElementById('csvDelimiterSelect')?.value||'auto') });
            if (parsedNoHeader && parsedNoHeader.data && parsedNoHeader.data.length) {
                let extracted = [];
                if (parsedNoHeader.data.length === 1 && parsedNoHeader.data[0].length > 1) {
                    extracted = parsedNoHeader.data[0].map(c => (c||'').toString().trim()).filter(Boolean);
                } else {
                    extracted = parsedNoHeader.data.flat().map(c => (c||'').toString().trim()).filter(Boolean);
                }
                if (extracted.length) {
                    inputText.value = extracted.join('\n');
                    if (autoStartUrl.checked) importBtn.click();
                    return;
                }
            }
        }
        // fallback: treat as plain text
        inputText.value = txt;
        if (autoStartUrl.checked) importBtn.click();
    } catch (err) {
        alert('Failed to load URL: '+err.message);
    }
};

function convertToRawUrl(url) {
    try {
        const u = new URL(url);
        // GitHub blob URL -> raw.githubusercontent
        if (u.hostname === 'github.com') {
            // path: /user/repo/blob/branch/path
            const parts = u.pathname.split('/').filter(Boolean);
            const blobIndex = parts.indexOf('blob');
            if (blobIndex > 0) {
                const user = parts[0];
                const repo = parts[1];
                const branch = parts[blobIndex+1];
                const pathParts = parts.slice(blobIndex+2);
                return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${pathParts.join('/')}`;
            }
        }
        // gist.github.com -> append /raw if missing
        if (u.hostname === 'gist.github.com') {
            if (!u.pathname.endsWith('/raw')) return url.replace(/\/?$/, '/raw');
        }
        // pastebin.com -> use pastebin raw domain
        if (u.hostname === 'pastebin.com') {
            const id = u.pathname.split('/').pop();
            return `https://pastebin.com/raw/${id}`;
        }
        return url;
    } catch (e) {
        return url;
    }
}

copySettingsBtn.onclick = () => {
    const modeVal = document.getElementById('modeSelect')?.value || 'pairwise';
    const kVal = document.getElementById('kInput')?.value || '3';
    const urlVal = (rawUrlInput.value || '').trim();
    const params = new URLSearchParams();
    params.set('mode', modeVal);
    params.set('k', kVal);
    // include csv delimiter and autostart preference
    const delimVal = document.getElementById('csvDelimiterSelect')?.value || 'auto';
    params.set('delim', delimVal);
    const autoStartVal = document.getElementById('autoStartUrl')?.checked ? '1' : '0';
    params.set('autostart', autoStartVal);
    if (urlVal) params.set('raw', urlVal);
    const link = location.origin + location.pathname + '?' + params.toString();
    navigator.clipboard.writeText(link).then(()=>{
        alert('Settings link copied to clipboard');
    }).catch(()=>{ alert('Could not copy link; here it is:\n'+link); });
};

// On page load, read query params and populate fields (and optionally load remote raw)
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    const m = params.get('mode'); if (m) document.getElementById('modeSelect').value = m;
    const kv = params.get('k'); if (kv) document.getElementById('kInput').value = kv;
    const raw = params.get('raw'); if (raw) { rawUrlInput.value = raw; }
    const delim = params.get('delim'); if (delim) document.getElementById('csvDelimiterSelect').value = delim;
    const as = params.get('autostart'); if (as === '1') {
        document.getElementById('autoStartUrl').checked = true;
        // if raw URL provided, auto-load it
        if (raw) {
            // trigger the same load logic
            // small timeout to ensure other handlers are ready
            setTimeout(() => { loadUrlBtn.click(); }, 50);
        }
    }
});

// Minimal CSV parser that handles quoted fields and commas
// CSV parsing now uses PapaParse (included in index.html)

// modal elements
const largeModal = document.getElementById('largeDatasetModal');
const modalCount = document.getElementById('modalCount');
const modalSample500 = document.getElementById('modalSample500');
const modalSample1000 = document.getElementById('modalSample1000');
const modalSampleCustom = document.getElementById('modalSampleCustom');
const modalCustomSize = document.getElementById('modalCustomSize');
const modalProceedAll = document.getElementById('modalProceedAll');
const modalCancel = document.getElementById('modalCancel');

function showLargeDatasetModal(count) {
    modalCount.textContent = count;
    // ensure the modal is shown (use 'flex' to match .modal CSS)
    largeModal.style.display = 'flex';
}

function closeLargeModal() { largeModal.style.display = 'none'; }

function sampleAndStart(size) {
    const n = Math.min(size, items.length);
    // sample without replacement
    const pool = Array.from(items);
    const sampled = [];
    for (let i=0;i<n;i++) {
        const idx = Math.floor(Math.random()*pool.length);
        sampled.push(pool.splice(idx,1)[0]);
    }
    items = sampled;
    closeLargeModal();
    inputText.value = items.join('\n');
    startSort();
}

modalSample500.onclick = () => sampleAndStart(500);
modalSample1000.onclick = () => sampleAndStart(1000);
modalSampleCustom.onclick = () => sampleAndStart(Math.max(10, Math.min(200000, parseInt(modalCustomSize.value || '500'))));
modalProceedAll.onclick = () => { closeLargeModal(); startSort(); };
modalCancel.onclick = () => { closeLargeModal(); };

function showResults() {
    compareSection.style.display = 'none';
    resultSection.style.display = '';
    outputText.value = sortOrder.map(i => items[i]).join('\n');
    // Show ranked results into tiers
    const tierLabels = ['EX','SSS+','SSS','SS+','SS','S+','S','A+','A','B+','B','C+','C','D+','D','E+','E','G+','G','Z'];
    const rankedDiv = document.getElementById('rankedResults');
    rankedDiv.innerHTML = `<h3>Ranking</h3>`;

    const m = sortOrder.length;
    // choose which tiers to use; if fewer items than tiers, center the selection
    let usedTiers = tierLabels;
    if (m < tierLabels.length) {
        const start = Math.floor((tierLabels.length - m) / 2);
        usedTiers = tierLabels.slice(start, start + m);
    }

    const T = usedTiers.length;
    const tiersContainer = document.createElement('div');
    tiersContainer.className = 'tiers';

    for (let t = 0; t < T; t++) {
        const startIdx = Math.floor(m * t / T);
        const endIdx = Math.floor(m * (t + 1) / T);
        const count = endIdx - startIdx;
        if (count <= 0) continue; // skip empty tiers

    const tierDiv = document.createElement('div');
    // add normalized tier class (e.g. 'tier-sssplus' for 'SSS+') so CSS can color tiers
    const norm = usedTiers[t].replace(/\+/g, 'plus').replace(/[^a-z0-9]/gi, '').toLowerCase();
    tierDiv.className = `tier tier-${norm}`;
        const header = document.createElement('div');
        header.className = 'tier-header';
        header.textContent = usedTiers[t];
        tierDiv.appendChild(header);

        const ul = document.createElement('ul');
        ul.className = 'tier-items';
        for (let k = startIdx; k < endIdx; k++) {
            const li = document.createElement('li');
            li.textContent = items[sortOrder[k]];
            ul.appendChild(li);
        }
        tierDiv.appendChild(ul);
        tiersContainer.appendChild(tierDiv);
    }

    rankedDiv.appendChild(tiersContainer);
}

restartBtn.onclick = () => {
    importSection.style.display = '';
    compareSection.style.display = 'none';
    resultSection.style.display = 'none';
    inputText.value = '';
    items = [];
    sortOrder = [];
    pairs = [];
    currentPair = 0;
    voteCount = 0;
    closeLargeModal();
};

const exportBtn = document.getElementById('exportImageBtn');
if (exportBtn) exportBtn.onclick = () => {
    const node = document.getElementById('rankedResults');
    if (!node) { alert('Nothing to export'); return; }
    // determine background color (prefer node's computed background, fallback to body or black)
    const nodeStyle = window.getComputedStyle(node);
    const bodyStyle = window.getComputedStyle(document.body);
    const bgColor = nodeStyle.backgroundColor && nodeStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && nodeStyle.backgroundColor !== 'transparent'
        ? nodeStyle.backgroundColor
        : (bodyStyle.backgroundColor && bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ? bodyStyle.backgroundColor : '#0b0d11');
    // use html2canvas to render and download with a forced background
    html2canvas(node, {backgroundColor: bgColor, scale: 2}).then(canvas => {
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ranking.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });
    }).catch(err => { console.error(err); alert('Export failed: '+err.message); });
};
