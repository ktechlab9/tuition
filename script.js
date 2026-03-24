// KJ Learning Portal - demo frontend
// Stores homework & files in localStorage as base64 data URLs so downloads work in demo

// --------- Utilities ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function uid() { return Math.random().toString(36).slice(2,9); }
function nowISO() { return new Date().toISOString(); }
function formatDate(iso){ const d=new Date(iso); return d.toLocaleString(); }

// File -> base64 data URL (Promise)
function fileToDataURL(file){
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = () => rej('read-error');
    reader.readAsDataURL(file);
  });
}

// Local storage helpers
const LS_KEY = 'kj_homeworks_v1';
const LS_STUDENTS = 'kj_students_v1';
function save(data){ localStorage.setItem(LS_KEY, JSON.stringify(data)); }
function load(){ return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
function saveStudents(list){ localStorage.setItem(LS_STUDENTS, JSON.stringify(list)); }
function loadStudents(){ return JSON.parse(localStorage.getItem(LS_STUDENTS) || '[]'); }

// --------- App State ----------
let ROLE = localStorage.getItem('kj_role') || 'teacher';
let currentPage = 'dashboard';

// --------- Init ----------
document.addEventListener('DOMContentLoaded', init);

function init(){
  // UI binds
  $('#roleSelect').value = ROLE;
  $('#roleSelect').addEventListener('change', (e) => {
    ROLE = e.target.value;
    localStorage.setItem('kj_role', ROLE);
    renderRole();
  });

  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-item').forEach(n=>n.classList.remove('active'));
      btn.classList.add('active');
      navTo(btn.dataset.page);
    });
  });

  $('#collapseBtn').addEventListener('click', () => {
    const sb = $('#sidebar');
    sb.style.width = sb.style.width === '72px' ? '260px' : '72px';
    $('#collapseBtn i').classList.toggle('fa-angle-right');
  });

  $('#searchInput').addEventListener('input', () => renderHomeworkTable());
  setInterval(() => { $('#clock').innerText = new Date().toLocaleTimeString(); }, 1000);

  // load demo data if none exists
  if (!localStorage.getItem(LS_KEY)) seedDemo();
  if (!localStorage.getItem(LS_STUDENTS)) {
    saveStudents(['Alice', 'David', 'Priya']);
  }

  renderRole();
  renderAll();
}

// --------- Navigation ----------
function navTo(page){
  currentPage = page;
  $$('.page').forEach(p => p.classList.remove('active'));
  $('#' + page).classList.add('active');
  if (page === 'homework') renderHomeworkTable();
  if (page === 'dashboard') renderDashboard();
}

// --------- Render Everything ----------
function renderAll(){
  renderDashboard();
  renderHomeworkTable();
  renderStudents();
}

// --------- Role view changes ----------
function renderRole(){
  // teacherPanel only visible to teacher
  $('#teacherPanel').style.display = (ROLE === 'teacher') ? 'flex' : 'none';
  // student can't see add buttons etc
  renderHomeworkTable();
}

// --------- Dashboard ----------
function renderDashboard(){
  const list = load();
  const pending = list.filter(h => h.status === 'Pending').length;
  const submitted = list.filter(h => h.status === 'Submitted').length;
  const checked = list.filter(h => h.status === 'Checked').length;
  $('#summaryPending').innerText = pending;
  $('#summarySubmitted').innerText = submitted;
  $('#summaryChecked').innerText = checked;

  // recent list
  const recent = list.slice().reverse().slice(0,6);
  const $recent = $('#recentList');
  $recent.innerHTML = '';
  recent.forEach(h => {
    const el = document.createElement('div');
    el.className = 'recent-item';
    el.innerHTML = `
      <div class="recent-left">
        <div style="width:52px;height:52px;border-radius:10px;background:linear-gradient(135deg,#fff,#f7f7ff);display:flex;align-items:center;justify-content:center;font-weight:700">${h.title.charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-weight:700">${h.title}</div>
          <div class="muted" style="font-size:12px">${h.teacherFile?.name || 'No file'} • Due ${h.due ? new Date(h.due).toLocaleDateString() : '—'}</div>
        </div>
      </div>
      <div>
        <div class="${badgeClass(h.status)}">${h.status}</div>
      </div>
    `;
    $recent.appendChild(el);
  });
}

// --------- Homework CRUD & UI ----------
async function handleNewHomework(){
  const title = $('#newHwTitle').value.trim();
  const due = $('#newHwDue').value || null;
  const fileInput = $('#newHwFile');

  if (!title) return alert('Enter a homework title');
  if (!fileInput.files.length) return alert('Attach a teacher file');

  const file = fileInput.files[0];
  const dataUrl = await fileToDataURL(file);
  const list = load();

  const item = {
    id: uid(),
    title,
    due,
    teacherFile: { name: file.name, data: dataUrl, uploadedAt: nowISO() },
    studentFile: null,   // { name, data, studentName, uploadedAt }
    markedFile: null,    // { name, data, uploadedAt }
    status: 'Pending',
    history: [
      { action: 'Created', by: 'Teacher', at: nowISO(), note: file.name }
    ]
  };
  list.push(item);
  save(list);

  // reset inputs
  $('#newHwTitle').value = '';
  $('#newHwDue').value = '';
  $('#newHwFile').value = '';

  renderHomeworkTable();
  renderDashboard();
  navTo('homework');
}

// Render homework table or cards based on view mode
function renderHomeworkTable(){
  const view = $('#viewMode').value;
  const list = load();
  const container = $('#hwContainer');
  const q = $('#searchInput').value.trim().toLowerCase();

  // filter by search
  const filtered = list.filter(h => {
    if (!q) return true;
    return h.title.toLowerCase().includes(q) || (h.teacherFile?.name || '').toLowerCase().includes(q) || (h.studentFile?.name || '').toLowerCase().includes(q);
  });

  if (view === 'cards'){
    container.innerHTML = '';
    const grid = document.createElement('div'); grid.className = 'cards-grid';
    filtered.forEach(h => {
      const card = document.createElement('div'); card.className = 'hw-card';
      card.innerHTML = `
        <h3>${h.title}</h3>
        <div class="muted" style="margin-top:6px">Due: ${h.due ? new Date(h.due).toLocaleDateString() : '—'}</div>
        <div class="hw-meta">
          <div class="small">${h.teacherFile?.name || '—'}</div>
          <div class="small">${h.studentFile?.name || '—'}</div>
          <div class="small">${h.markedFile?.name || '—'}</div>
          <div style="margin-left:auto">${badgeHtml(h.status)}</div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
          <button class="btn" onclick="viewHistory('${h.id}')"><i class="fa-solid fa-clock-rotate-left"></i> History</button>
          <button class="btn" onclick="downloadTeacherFile('${h.id}')"><i class="fa-solid fa-download"></i> Teacher File</button>
          ${ROLE==='student' ? `<button class="btn" onclick="openSubmitModal('${h.id}')"><i class="fa-solid fa-upload"></i> Submit</button>` : `<button class="btn" onclick="openMarkedModal('${h.id}')"><i class="fa-solid fa-check"></i> Marked</button>`}
        </div>
      `;
      grid.appendChild(card);
    });
    container.appendChild(grid);
    return;
  }

  // TABLE view
  container.innerHTML = `
    <table class="table">
      <thead><tr>
        <th>Homework</th><th>Teacher File</th><th>Student File</th><th>Marked File</th><th>Status</th><th>Action</th>
      </tr></thead>
      <tbody id="hwTableBody"></tbody>
    </table>
  `;
  const tbody = $('#hwTableBody');
  tbody.innerHTML = '';
  filtered.forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="min-width:220px">
        <div style="font-weight:700">${h.title}</div>
        <div class="muted" style="font-size:12px">Due: ${h.due ? new Date(h.due).toLocaleDateString() : '—'}</div>
      </td>
      <td>${h.teacherFile ? `<a href="#" onclick="downloadTeacherFile('${h.id}')">${h.teacherFile.name}</a><div class="muted" style="font-size:12px">${formatDate(h.teacherFile.uploadedAt)}</div>` : '—'}</td>
      <td>${h.studentFile ? `<a href="#" onclick="downloadStudentFile('${h.id}')">${h.studentFile.name}</a><div class="muted" style="font-size:12px">${formatDate(h.studentFile.uploadedAt)} • ${h.studentFile.studentName || ''}</div>` : (ROLE==='student' ? `<a href="#" onclick="openSubmitModal('${h.id}')">Upload now</a>` : '—')}</td>
      <td>${h.markedFile ? `<a href="#" onclick="downloadMarkedFile('${h.id}')">${h.markedFile.name}</a><div class="muted" style="font-size:12px">${formatDate(h.markedFile.uploadedAt)}</div>` : '—'}</td>
      <td>${badgeHtml(h.status)}</td>
      <td>
        ${ROLE==='teacher' ? (h.status === 'Submitted' ? `<button class="btn primary" onclick="openMarkedModal('${h.id}')">Mark & Upload</button>` : `<button class="btn" onclick="viewHistory('${h.id}')">History</button>`) : (h.status === 'Checked' ? `<button class="btn" onclick="viewMarked('${h.id}')">View Marked</button>` : (h.status === 'Pending' ? '<span class="muted">Not submitted</span>' : `<button class="btn" onclick="viewHistory('${h.id}')">Details</button>`)) }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --------- File actions (download) ----------
function findHw(id){ return load().find(h => h.id === id); }

function downloadDataFile(dataUrl, name){
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadTeacherFile(id){
  const h = findHw(id);
  if (!h?.teacherFile) return alert('No teacher file');
  downloadDataFile(h.teacherFile.data, h.teacherFile.name);
}
function downloadStudentFile(id){
  const h = findHw(id);
  if (!h?.studentFile) return alert('No student submission');
  downloadDataFile(h.studentFile.data, h.studentFile.name);
}
function downloadMarkedFile(id){
  const h = findHw(id);
  if (!h?.markedFile) return alert('No marked file');
  downloadDataFile(h.markedFile.data, h.markedFile.name);
}

// --------- Modal helpers (openSubmit, openMarked, viewHistory) ----------
function openSubmitModal(id){
  const h = findHw(id);
  if (!h) return;
  showModal(`
    <h3>Submit: ${h.title}</h3>
    <p class="muted">Attach your completed work below.</p>
    <div style="margin-top:8px">
      <input id="submitStudentName" placeholder="Your name (for demo)" style="padding:10px;border-radius:8px;border:1px solid #e6e9f2;width:100%;margin-bottom:8px"/>
      <input id="submitFile" type="file" />
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn primary" onclick="submitStudent('${id}')">Submit</button>
      </div>
    </div>
  `);
}

async function submitStudent(id){
  const name = $('#submitStudentName').value.trim() || $('#submitStudentName').placeholder;
  const fileInput = $('#submitFile');
  if (!fileInput.files.length) return alert('Attach a file');
  const file = fileInput.files[0];
  const data = await fileToDataURL(file);
  const list = load();
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) return alert('Not found');

  list[idx].studentFile = { name: file.name, data, studentName: name, uploadedAt: nowISO() };
  list[idx].status = 'Submitted';
  list[idx].history.push({ action: 'Submitted', by: name, at: nowISO(), note: file.name });
  save(list);
  closeModal();
  renderHomeworkTable();
  renderDashboard();
}

function openMarkedModal(id){
  const h = findHw(id);
  if (!h) return;
  showModal(`
    <h3>Upload Marked File for: ${h.title}</h3>
    <p class="muted">When you mark the student's work, upload the corrected file here to return it.</p>
    <div style="margin-top:8px">
      <input id="markedFileInput" type="file" />
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn primary" onclick="uploadMarkedFile('${id}')">Upload & Mark Checked</button>
      </div>
    </div>
  `);
}

async function uploadMarkedFile(id){
  const fileInput = $('#markedFileInput');
  if (!fileInput.files.length) return alert('Attach a file');
  const file = fileInput.files[0];
  const data = await fileToDataURL(file);
  const list = load();
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) return alert('Not found');

  list[idx].markedFile = { name: file.name, data, uploadedAt: nowISO() };
  list[idx].status = 'Checked';
  list[idx].history.push({ action: 'Checked & Returned', by: 'Teacher', at: nowISO(), note: file.name });
  save(list);
  closeModal();
  renderHomeworkTable();
  renderDashboard();
}

function viewHistory(id){
  const h = findHw(id);
  if (!h) return;
  const hist = (h.history || []).slice().reverse().map(it => `<div style="margin-bottom:8px"><strong>${it.action}</strong> • <span class="muted">${it.by}</span> • <span class="muted">${formatDate(it.at)}</span><div class="muted" style="font-size:13px">${it.note || ''}</div></div>`).join('');
  showModal(`
    <h3>History — ${h.title}</h3>
    <div style="margin-top:8px">${hist || '<div class="muted">No history</div>'}</div>
    <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" onclick="closeModal()">Close</button>
    </div>
  `);
}

function viewMarked(id){
  const h = findHw(id);
  if (!h?.markedFile) return alert('No marked file');
  downloadDataFile(h.markedFile.data, h.markedFile.name);
}

// --------- Students CRUD ----------
function renderStudents(){
  const list = loadStudents();
  const container = $('#studentList');
  container.innerHTML = '';
  list.forEach(s => {
    const pill = document.createElement('div'); pill.className = 'student-pill'; pill.innerText = s;
    container.appendChild(pill);
  });
}

function addStudent(){
  const name = $('#newStudentName').value.trim();
  if (!name) return;
  const list = loadStudents();
  list.push(name);
  saveStudents(list);
  $('#newStudentName').value = '';
  renderStudents();
}

// --------- Helpers ----------
function badgeHtml(status){
  if (status === 'Pending') return `<span class="tag pending">${status}</span>`;
  if (status === 'Submitted') return `<span class="tag submitted">${status}</span>`;
  if (status === 'Checked') return `<span class="tag checked">${status}</span>`;
  return `<span class="tag">${status}</span>`;
}
function badgeClass(status){
  if (status === 'Pending') return 'tag pending';
  if (status === 'Submitted') return 'tag submitted';
  if (status === 'Checked') return 'tag checked';
  return 'tag';
}

// --------- Modal control ----------
function showModal(html){
  $('#modalBody').innerHTML = html;
  $('#modal').classList.remove('hidden');
  $('#modal').setAttribute('aria-hidden', 'false');
}
function closeModal(){
  $('#modal').classList.add('hidden');
  $('#modal').setAttribute('aria-hidden', 'true');
  $('#modalBody').innerHTML = '';
}

// --------- Reset demo ----------
function clearAll(){
  if (!confirm('Clear all demo data? This will remove saved files.')) return;
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_STUDENTS);
  localStorage.removeItem('kj_role');
  location.reload();
}

// --------- Demo seed data ----------
async function seedDemo(){
  // small text file as demo teacher file
  const demoText = 'This is a demo homework file (teacher version).';
  const demoData = 'data:text/plain;base64,' + btoa(demoText);
  const list = [
    {
      id: uid(),
      title: 'Math — Fractions',
      due: new Date(Date.now()+5*24*3600*1000).toISOString().slice(0,10),
      teacherFile: { name: 'fractions.pdf', data: demoData, uploadedAt: nowISO() },
      studentFile: null,
      markedFile: null,
      status: 'Pending',
      history: [{ action:'Created', by:'Teacher', at: nowISO(), note:'fractions.pdf' }]
    },
    {
      id: uid(),
      title: 'Science — Plant Life',
      due: new Date(Date.now()+8*24*3600*1000).toISOString().slice(0,10),
      teacherFile: { name: 'plants.docx', data: demoData, uploadedAt: nowISO() },
      studentFile: { name: 'plants_done.pdf', data: demoData, studentName:'Priya', uploadedAt: nowISO() },
      markedFile: null,
      status: 'Submitted',
      history: [{ action:'Created', by:'Teacher', at: nowISO(), note:'plants.docx' }, { action:'Submitted','by':'Priya','at': nowISO(), note:'plants_done.pdf' }]
    },
    {
      id: uid(),
      title: 'English — Short Story',
      due: new Date(Date.now()+2*24*3600*1000).toISOString().slice(0,10),
      teacherFile: { name: 'story.pdf', data: demoData, uploadedAt: nowISO() },
      studentFile: { name: 'story_rev.pdf', data: demoData, studentName:'David', uploadedAt: nowISO() },
      markedFile: { name: 'story_marked.pdf', data: demoData, uploadedAt: nowISO() },
      status: 'Checked',
      history: [{ action:'Created', by:'Teacher', at: nowISO(), note:'story.pdf' }, { action:'Submitted','by':'David','at': nowISO(), note:'story_rev.pdf' }, { action:'Checked & Returned','by':'Teacher','at': nowISO(), note:'story_marked.pdf' }]
    }
  ];
  save(list);
  saveStudents(['Alice','David','Priya']);
}
