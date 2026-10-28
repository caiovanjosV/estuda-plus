const state = { activities: [], history: [], disciplines: [], goals: [] };

// Persistência local: os registros continuam disponíveis ao recarregar a página.
let currentUserId = null;
const STORAGE_PREFIX = "estudamais_state_user_";
function saveState(){
  if (!currentUserId) return;
  localStorage.setItem(STORAGE_PREFIX + currentUserId, JSON.stringify(state));
}
function loadState(){
  try {
    const saved = currentUserId ? JSON.parse(localStorage.getItem(STORAGE_PREFIX + currentUserId)) : null;
    if(saved){
      if(Array.isArray(saved.activities)) state.activities = saved.activities;
      if(Array.isArray(saved.history)) state.history = saved.history;
      if(Array.isArray(saved.disciplines)) state.disciplines = saved.disciplines;
      if(Array.isArray(saved.goals)) state.goals = saved.goals;
    }
  } catch(e) { console.warn("Não foi possível carregar os dados salvos.", e); }
}

const pages = {
  dashboard:"Dashboard", disciplinas:"Disciplinas", atividades:"Atividades",
  metas:"Metas de Estudo", estudos:"Registrar Estudo", historico:"Histórico", perfil:"Meu Perfil"
};

document.querySelectorAll("[data-page]").forEach(el=>{
  el.addEventListener("click",()=>{
    const p=el.dataset.page;
    if(p) showPage(p);
  });
});

function updateDashboard(){
  const totalMinutes = state.history.reduce((sum,h)=>sum + Number(h.minutes || 0), 0);
  const totalActivities = state.activities.filter(a=>a.status === "Concluída").length;
  const hoursEl = document.querySelector("#page-dashboard .stat-card:nth-child(1) strong");
  const activitiesEl = document.querySelector("#page-dashboard .stat-card:nth-child(2) strong");
  if(hoursEl) hoursEl.textContent = formatMinutes(totalMinutes);
  if(activitiesEl) activitiesEl.textContent = totalActivities;
  const statGoals = document.querySelector("#page-dashboard .stat-card:nth-child(3) strong");
  const statDisciplines = document.querySelector("#page-dashboard .stat-card:nth-child(4) strong");
  if(statGoals) statGoals.textContent = state.goals.length;
  if(statDisciplines) statDisciplines.textContent = state.disciplines.length;
  const dashboardGoals = document.getElementById("dashboardGoals");
  if (dashboardGoals) dashboardGoals.innerHTML = state.goals.length ? state.goals.slice(0,3).map(g => `<div class="goal"><div class="goal-top"><strong>${g.name}</strong><span>${g.progress}%</span></div><div class="progress"><i style="width:${g.progress}%"></i></div><small>${g.detail}</small></div>`).join("") : '<strong>Nenhuma meta cadastrada.</strong><p>Crie suas metas para acompanhar seu progresso.</p>';
  const dashboardActivities = document.getElementById("dashboardActivities");
  if (dashboardActivities) dashboardActivities.innerHTML = state.activities.length ? state.activities.slice(0,3).map(a => `<div class="activity-row"><span class="dot purple-dot"></span><div><strong>${a.name}</strong><small>${a.discipline} • ${a.date}</small></div><span class="tag">${a.status}</span></div>`).join("") : '<strong>Nenhuma atividade por enquanto.</strong><p>Quando cadastrar suas atividades, elas aparecerão aqui.</p>';
  const tip = document.querySelector("#page-estudos .tip-stat strong");
  if(tip) tip.textContent = formatMinutes(totalMinutes);
}

function showPage(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  document.getElementById("page-"+page)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  document.getElementById("pageTitle").textContent=pages[page]||"Dashboard";
  document.querySelector(".sidebar")?.classList.remove("open");
  if(page==="disciplinas") renderDisciplines();
  if(page==="atividades") renderActivities();
  if(page==="metas") renderGoals();
  if(page==="historico") renderHistory();
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderDisciplines(){
  const el=document.getElementById("disciplinasList");
  if (!state.disciplines.length) { el.innerHTML = '<div class="empty-state"><strong>Você ainda não cadastrou disciplinas.</strong><p>Adicione sua primeira disciplina para começar a organizar os estudos.</p><button class="primary" onclick="document.getElementById(\'addDisciplina\').click()">+ Nova disciplina</button></div>'; renderStudyDisciplineOptions(); return; }
  el.innerHTML=state.disciplines.map((d,i)=>`
    <article class="card subject-card">
      <div class="subject-head"><div class="subject-color">${d.code}</div><button class="table-action" onclick="removeDiscipline(${i})">Excluir</button></div>
      <h3>${d.name}</h3><p>${d.activities} atividades cadastradas</p>
      <div class="mini-progress"><span>Progresso</span><strong>${d.progress}%</strong></div>
      <div class="progress"><i style="width:${d.progress}%"></i></div>
    </article>`).join("");
  renderStudyDisciplineOptions();
}

function renderActivities(){
  const el=document.getElementById("activitiesTable");
  el.innerHTML=state.activities.map((a,i)=>`
    <tr><td><strong>${a.name}</strong></td><td>${a.discipline}</td><td>${a.date}</td>
    <td><span class="status ${a.status==="Concluída"?"done":"pending"}">${a.status}</span></td>
    <td><button class="table-action" onclick="toggleActivity(${i})">${a.status==="Concluída"?"Reabrir":"Concluir"}</button> <button class="table-action" onclick="removeActivity(${i})">Excluir</button></td></tr>`).join("");
  if (!state.activities.length) el.innerHTML = '<tr><td colspan="5" class="empty-cell">Nenhuma atividade cadastrada. Clique em “Nova atividade” para adicionar a primeira.</td></tr>';
  const filter = document.getElementById("activityDisciplineFilter");
  if (filter) { const selected = filter.value; filter.innerHTML = '<option value="">Todas as disciplinas</option>' + state.disciplines.map(d => `<option value="${d.name}">${d.name}</option>`).join(""); filter.value = selected; }
}
function renderGoals(){
  document.getElementById("metasList").innerHTML=state.goals.map((g,i)=>`
    <article class="card subject-card"><div class="subject-head"><div class="subject-color">◉</div><button class="table-action" onclick="removeGoal(${i})">Excluir</button></div>
    <h3>${g.name}</h3><p>${g.detail}</p><div class="mini-progress"><span>Progresso</span><strong>${g.progress}%</strong></div>
    <div class="progress"><i style="width:${g.progress}%"></i></div></article>`).join("");
  if (!state.goals.length) document.getElementById("metasList").innerHTML = '<div class="empty-state"><strong>Nenhuma meta definida ainda.</strong><p>Crie uma meta para acompanhar seu progresso.</p></div>';
}
function renderHistory(){
  document.getElementById("historyTable").innerHTML=state.history.map((h,i)=>`
    <tr><td>${h.date}</td><td>${h.discipline}</td><td>${h.content}</td><td>${formatMinutes(h.minutes)}</td>
    <td><button class="table-action" onclick="removeHistory(${i})">Excluir</button></td></tr>`).join("");
  if (!state.history.length) document.getElementById("historyTable").innerHTML = '<tr><td colspan="5" class="empty-cell">Seu histórico de estudos aparecerá aqui depois do primeiro registro.</td></tr>';
}
function formatMinutes(m){return `${Math.floor(m/60)}h ${String(m%60).padStart(2,"0")}min`;}

function openModal(title, html, onSubmit){
  document.getElementById("modalTitle").textContent=title;
  const form=document.getElementById("modalForm"); form.innerHTML=html;
  document.getElementById("modal").classList.add("show");
  form.onsubmit=e=>{e.preventDefault();onSubmit(new FormData(form));closeModal();}
}
function closeModal(){document.getElementById("modal").classList.remove("show");}
document.getElementById("modalClose").onclick=closeModal;
document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});

document.getElementById("addDisciplina").onclick=()=>openModal("Nova disciplina",`
  <label>Nome da disciplina<input name="name" required placeholder="Ex.: Banco de Dados"></label>
  <label>Código<input name="code" required placeholder="Ex.: BD"></label>
  <button class="primary full">Cadastrar disciplina</button>`,f=>{
    state.disciplines.push({name:f.get("name"),code:f.get("code").toUpperCase(),color:"purple",progress:0,activities:0});
    saveState(); renderDisciplines(); renderStudyDisciplineOptions(); updateDashboard(); toast("Disciplina cadastrada com sucesso!");
});
document.getElementById("addAtividade").onclick=()=>{ if (!state.disciplines.length) { toast("Cadastre uma disciplina antes de criar atividades."); showPage("disciplinas"); return; } openModal("Nova atividade",`
  <label>Atividade<input name="name" required placeholder="Nome da atividade"></label>
  <label>Disciplina<select name="discipline">${state.disciplines.map(d=>`<option value="${d.name}">${d.name}</option>`).join("")}</select></label>
  <label>Prazo<input name="date" type="date" required></label>
  <button class="primary full">Cadastrar atividade</button>`,async f=>{
    const isoDate=f.get("date");
    try {
      const response=await fetch('/api/activities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.get("name"),discipline:f.get("discipline"),date:isoDate})});
      const result=await response.json().catch(()=>({})); if(!response.ok) throw new Error(result.error||'Erro ao salvar atividade.');
      state.activities.unshift(result); saveState(); renderActivities(); updateDashboard(); toast("Atividade salva no banco de dados!");
    } catch(err) { toast(err.message); }
}); };
document.getElementById("addMeta").onclick=()=>openModal("Nova meta",`
  <label>Nome da meta<input name="name" required placeholder="Ex.: Estudar 15 horas"></label>
  <label>Descrição<input name="detail" placeholder="Ex.: Meta semanal"></label>
  <button class="primary full">Criar meta</button>`,async f=>{
    try {
      const response=await fetch('/api/goals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.get("name"),detail:f.get("detail")||"Meta pessoal"})});
      const result=await response.json().catch(()=>({})); if(!response.ok) throw new Error(result.error||'Erro ao salvar meta.');
      state.goals.unshift(result); saveState(); renderGoals(); updateDashboard(); toast("Meta salva no banco de dados!");
    } catch(err) { toast(err.message); }
});

async function loadActivitiesFromApi(){
  try { const response=await fetch('/api/activities'); if(!response.ok) throw new Error('Não foi possível carregar atividades.'); state.activities=await response.json(); saveState(); renderActivities(); updateDashboard(); }
  catch(err){ console.warn(err.message); }
}
async function loadGoalsFromApi(){
  try { const response=await fetch('/api/goals'); if(!response.ok) throw new Error('Não foi possível carregar metas.'); state.goals=await response.json(); saveState(); renderGoals(); updateDashboard(); }
  catch(err){ console.warn(err.message); }
}
async function removeActivity(i){
  if(!confirm('Excluir esta atividade?')) return; const item=state.activities[i];
  try { const response=await fetch(`/api/activities/${item.id}`,{method:'DELETE'}); if(!response.ok) throw new Error('Não foi possível excluir a atividade do banco.'); state.activities.splice(i,1); saveState(); renderActivities(); updateDashboard(); toast('Atividade excluída.'); }
  catch(err){ toast(err.message); }
}

async function loadStudiesFromApi(){
  try {
    const response = await fetch('/api/studies');
    if(!response.ok) throw new Error('API indisponível');
    const rows = await response.json();
    state.history = rows.map(row => ({
      id: row.id,
      date: String(row.date).split('-').reverse().join('/'),
      isoDate: String(row.date),
      discipline: row.discipline,
      content: row.content,
      minutes: Number(row.minutes),
      fromApi: true
    }));
    renderHistory(); updateDashboard();
  } catch(err) {
    console.warn('API de estudos indisponível; usando os dados locais do navegador.', err);
  }
}

document.getElementById("studyForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const isoDate = document.getElementById("studyDate").value;
  const d = isoDate.split("-").reverse().join("/");
  const discipline = document.getElementById("studyDiscipline").value;
  if (!state.disciplines.length || !discipline) { toast("Cadastre e selecione uma disciplina antes de registrar o estudo."); showPage("disciplinas"); return; }
  const minutes = Number(document.getElementById("studyMinutes").value);
  const content = document.getElementById("studyContent").value || "Sessão de estudo";

  try {
    const response = await fetch('/api/studies', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({date:isoDate, discipline, minutes, content})
    });
    const result = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(result.error || 'Não foi possível salvar no banco.');
    state.history.unshift({id:result.id, date:d, isoDate, discipline, content, minutes, fromApi:true});
  } catch(err) {
    toast('Erro ao salvar no banco: ' + err.message);
    return;
  }

  const subject = state.disciplines.find(x => x.name === discipline);
  if(subject) subject.progress = Math.min(100, Number(subject.progress || 0) + 5);
  saveState(); e.target.reset(); renderHistory(); renderDisciplines(); updateDashboard();
  toast('Estudo salvo no banco de dados!');
});
document.getElementById("saveProfile").onclick=()=>toast("Perfil atualizado com sucesso!");

async function toggleActivity(i){
  const item=state.activities[i]; if(!item) return;
  try { const response=await fetch(`/api/activities/${item.id}`,{method:'PATCH'}); const result=await response.json().catch(()=>({})); if(!response.ok) throw new Error(result.error||'Não foi possível atualizar.');
    item.status=result.status; item.completed=result.status==='Concluída'; saveState(); renderActivities(); updateDashboard(); toast("Status atualizado e salvo!");
  } catch(err) { toast(err.message); }
}
function removeDiscipline(i){if(confirm("Excluir esta disciplina?")){state.disciplines.splice(i,1);saveState();renderDisciplines();toast("Disciplina excluída.")}}
async function removeGoal(i){if(!confirm("Excluir esta meta?")) return; const item=state.goals[i]; try { const response=await fetch(`/api/goals/${item.id}`,{method:'DELETE'}); if(!response.ok) throw new Error('Não foi possível excluir a meta do banco.'); state.goals.splice(i,1); saveState(); renderGoals(); updateDashboard(); toast("Meta excluída."); } catch(err) { toast(err.message); }}
async function removeHistory(i){
  if(!confirm("Excluir este registro?")) return;
  const item = state.history[i];
  if(item && item.fromApi && item.id){
    try {
      const response = await fetch(`/api/studies/${item.id}`, {method:'DELETE'});
      if(!response.ok) throw new Error('Não foi possível excluir do banco.');
    } catch(err) { toast(err.message); return; }
  }
  state.history.splice(i,1); saveState(); renderHistory(); updateDashboard(); toast("Registro excluído.");
}

function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
document.getElementById("mobileMenu").onclick=()=>document.querySelector(".sidebar").classList.toggle("open");
document.getElementById("activitySearch").addEventListener("input",e=>{
  const q=e.target.value.toLowerCase();
  document.querySelectorAll("#activitiesTable tr").forEach(row=>row.style.display=row.innerText.toLowerCase().includes(q)?"":"none");
});
// Autenticação real via API (sessão local no navegador).
const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authError = document.getElementById('authError');
const authSwitch = document.getElementById('authSwitch');
let showingRegister = false;
function showAuthError(message) { authError.textContent = message || ''; }
function setAuthenticated(user) {
  const changedUser = String(currentUserId) !== String(user.id);
  currentUserId = user.id;
  if (changedUser) { state.activities = []; state.history = []; state.disciplines = []; state.goals = []; loadState(); }
  authScreen.classList.add('hidden'); appShell.classList.remove('hidden');
  document.querySelectorAll('.mini-profile strong').forEach(el => el.textContent = user.nome || 'Estudante');
  const welcome = document.getElementById('welcomeTitle'); if (welcome) welcome.textContent = 'Olá, ' + (user.nome || 'estudante').split(' ')[0] + '! 👋';
  const pill = document.querySelector('.profile-pill'); if (pill) pill.innerHTML = '<span class="avatar small">' + (user.nome||'E').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase() + '</span> ' + (user.nome || 'Estudante');
  renderDisciplines(); renderActivities(); renderGoals(); renderHistory(); renderStudyDisciplineOptions(); updateDashboard(); loadStudiesFromApi(); loadActivitiesFromApi(); loadGoalsFromApi();
}
function toggleAuthMode() {
  showingRegister = !showingRegister; loginForm.classList.toggle('hidden', showingRegister); registerForm.classList.toggle('hidden', !showingRegister);
  authTitle.textContent = showingRegister ? 'Crie sua conta' : 'Bem-vindo de volta!';
  authSubtitle.textContent = showingRegister ? 'Comece a organizar sua rotina de estudos.' : 'Entre na sua conta para organizar seus estudos.';
  document.getElementById('authSwitchText').textContent = showingRegister ? 'Já tem uma conta?' : 'Ainda não tem conta?';
  authSwitch.textContent = showingRegister ? 'Fazer login' : 'Cadastre-se'; showAuthError('');
}
authSwitch.addEventListener('click', toggleAuthMode);
loginForm.addEventListener('submit', async e => {
 e.preventDefault(); showAuthError(''); const button=loginForm.querySelector('button[type="submit"]'); button.disabled=true;
 try { const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.getElementById('loginEmail').value,senha:document.getElementById('loginPassword').value})}); const data=await r.json(); if(!r.ok) throw new Error(data.error||'Não foi possível entrar.'); setAuthenticated(data); }
 catch(err){showAuthError(err.message);} finally{button.disabled=false;}
});
registerForm.addEventListener('submit', async e => {
 e.preventDefault(); showAuthError(''); const button=registerForm.querySelector('button[type="submit"]'); button.disabled=true;
 try { const r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome:document.getElementById('registerName').value,email:document.getElementById('registerEmail').value,senha:document.getElementById('registerPassword').value})}); const data=await r.json(); if(!r.ok) throw new Error(data.error||'Não foi possível criar a conta.'); setAuthenticated(data); }
 catch(err){showAuthError(err.message);} finally{button.disabled=false;}
});
fetch('/api/auth/me').then(async r=>{if(!r.ok) throw new Error('not-authenticated'); return r.json();}).then(data=>setAuthenticated(data.user)).catch(()=>{authScreen.classList.remove('hidden');appShell.classList.add('hidden');});


function renderStudyDisciplineOptions() {
  const select = document.getElementById("studyDiscipline");
  if (!select) return;
  const selected = select.value;
  select.innerHTML = '<option value="">' + (state.disciplines.length ? 'Selecione...' : 'Cadastre uma disciplina primeiro') + '</option>' + state.disciplines.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
  if (state.disciplines.some(d => d.name === selected)) select.value = selected;
}

const logoutButton = document.getElementById('logoutButton');
if (logoutButton) logoutButton.addEventListener('click', async () => {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) { console.warn('Não foi possível encerrar a sessão no servidor.', e); }
  currentUserId = null;
  state.activities = []; state.history = []; state.disciplines = []; state.goals = [];
  loginForm.reset(); registerForm.reset(); showAuthError('');
  appShell.classList.add('hidden'); authScreen.classList.remove('hidden');
  showingRegister = false; loginForm.classList.remove('hidden'); registerForm.classList.add('hidden');
  authTitle.textContent = 'Bem-vindo de volta!'; authSubtitle.textContent = 'Entre na sua conta para organizar seus estudos.';
  document.getElementById('authSwitchText').textContent = 'Ainda não tem conta?'; authSwitch.textContent = 'Cadastre-se';
});
