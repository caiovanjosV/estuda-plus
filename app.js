const state = {
  activities: [
    {name:"Finalizar documentação do TCC", discipline:"Desenvolvimento de Aplicações", date:"30/09/2026", status:"Pendente"},
    {name:"Estudar funções matemáticas", discipline:"Matemática Discreta", date:"01/10/2026", status:"Pendente"},
    {name:"Revisar requisitos do sistema", discipline:"TCC", date:"02/10/2026", status:"Concluída"},
    {name:"Revisar conteúdo para avaliação", discipline:"Estágio Supervisionado", date:"05/10/2026", status:"Pendente"}
  ],
  history: [
    {date:"30/09/2026", discipline:"Desenvolvimento de Aplicações", content:"Estrutura inicial do front-end", minutes:90},
    {date:"29/09/2026", discipline:"Matemática Discreta", content:"Revisão de funções", minutes:120},
    {date:"28/09/2026", discipline:"TCC", content:"Documentação e requisitos", minutes:180},
    {date:"27/09/2026", discipline:"Desenvolvimento de Aplicações", content:"HTML, CSS e JavaScript", minutes:120}
  ],
  disciplines: [
    {name:"Matemática Discreta", code:"MAT", color:"purple", progress:40, activities:10},
    {name:"Desenvolvimento de Aplicações", code:"DEV", color:"blue", progress:70, activities:8},
    {name:"TCC", code:"TCC", color:"orange", progress:60, activities:5},
    {name:"Estágio Supervisionado", code:"EST", color:"green", progress:35, activities:6}
  ],
  goals: [
    {name:"Estudar 20 horas", detail:"Meta semanal", progress:75},
    {name:"Concluir TCC", detail:"5 etapas", progress:60},
    {name:"Revisar Matemática Discreta", detail:"10 atividades", progress:40},
    {name:"Manter 7 dias de sequência", detail:"Meta pessoal", progress:100}
  ]
};

// Persistência local: os registros continuam disponíveis ao recarregar a página.
const STORAGE_KEY = "estudamais_state_v1";
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
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
  el.innerHTML=state.disciplines.map((d,i)=>`
    <article class="card subject-card">
      <div class="subject-head"><div class="subject-color">${d.code}</div><button class="table-action" onclick="removeDiscipline(${i})">Excluir</button></div>
      <h3>${d.name}</h3><p>${d.activities} atividades cadastradas</p>
      <div class="mini-progress"><span>Progresso</span><strong>${d.progress}%</strong></div>
      <div class="progress"><i style="width:${d.progress}%"></i></div>
    </article>`).join("");
}

function renderActivities(){
  const el=document.getElementById("activitiesTable");
  el.innerHTML=state.activities.map((a,i)=>`
    <tr><td><strong>${a.name}</strong></td><td>${a.discipline}</td><td>${a.date}</td>
    <td><span class="status ${a.status==="Concluída"?"done":"pending"}">${a.status}</span></td>
    <td><button class="table-action" onclick="toggleActivity(${i})">${a.status==="Concluída"?"Reabrir":"Concluir"}</button></td></tr>`).join("");
}
function renderGoals(){
  document.getElementById("metasList").innerHTML=state.goals.map((g,i)=>`
    <article class="card subject-card"><div class="subject-head"><div class="subject-color">◉</div><button class="table-action" onclick="removeGoal(${i})">Excluir</button></div>
    <h3>${g.name}</h3><p>${g.detail}</p><div class="mini-progress"><span>Progresso</span><strong>${g.progress}%</strong></div>
    <div class="progress"><i style="width:${g.progress}%"></i></div></article>`).join("");
}
function renderHistory(){
  document.getElementById("historyTable").innerHTML=state.history.map((h,i)=>`
    <tr><td>${h.date}</td><td>${h.discipline}</td><td>${h.content}</td><td>${formatMinutes(h.minutes)}</td>
    <td><button class="table-action" onclick="removeHistory(${i})">Excluir</button></td></tr>`).join("");
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
    saveState(); renderDisciplines(); toast("Disciplina cadastrada com sucesso!");
});
document.getElementById("addAtividade").onclick=()=>openModal("Nova atividade",`
  <label>Atividade<input name="name" required placeholder="Ex.: Fazer exercícios"></label>
  <label>Disciplina<select name="discipline"><option>Matemática Discreta</option><option>Desenvolvimento de Aplicações</option><option>TCC</option><option>Estágio Supervisionado</option></select></label>
  <label>Prazo<input name="date" type="date" required></label>
  <button class="primary full">Cadastrar atividade</button>`,f=>{
    const date=f.get("date").split("-").reverse().join("/");
    state.activities.push({name:f.get("name"),discipline:f.get("discipline"),date,status:"Pendente"});
    saveState(); renderActivities(); updateDashboard(); toast("Atividade cadastrada!");
});
document.getElementById("addMeta").onclick=()=>openModal("Nova meta",`
  <label>Nome da meta<input name="name" required placeholder="Ex.: Estudar 15 horas"></label>
  <label>Descrição<input name="detail" placeholder="Ex.: Meta semanal"></label>
  <button class="primary full">Criar meta</button>`,f=>{
    state.goals.push({name:f.get("name"),detail:f.get("detail")||"Meta pessoal",progress:0});
    saveState(); renderGoals(); toast("Meta criada com sucesso!");
});

document.getElementById("studyForm").addEventListener("submit",e=>{
  e.preventDefault();
  const isoDate = document.getElementById("studyDate").value;
  const d = isoDate.split("-").reverse().join("/");
  const discipline = document.getElementById("studyDiscipline").value;
  const minutes = Number(document.getElementById("studyMinutes").value);
  const content = document.getElementById("studyContent").value || "Sessão de estudo";

  state.history.unshift({date:d, discipline, content, minutes});

  // Atualiza o progresso da disciplina automaticamente.
  const subject = state.disciplines.find(x => x.name === discipline);
  if(subject){
    subject.progress = Math.min(100, Number(subject.progress || 0) + 5);
  }

  saveState();
  e.target.reset();
  renderHistory();
  renderDisciplines();
  updateDashboard();
  toast("Estudo registrado com sucesso! Dados salvos.");
});
document.getElementById("saveProfile").onclick=()=>toast("Perfil atualizado com sucesso!");

function toggleActivity(i){state.activities[i].status=state.activities[i].status==="Concluída"?"Pendente":"Concluída";saveState();renderActivities();updateDashboard();toast("Status atualizado!")}
function removeDiscipline(i){if(confirm("Excluir esta disciplina?")){state.disciplines.splice(i,1);saveState();renderDisciplines();toast("Disciplina excluída.")}}
function removeGoal(i){if(confirm("Excluir esta meta?")){state.goals.splice(i,1);saveState();renderGoals();toast("Meta excluída.")}}
function removeHistory(i){if(confirm("Excluir este registro?")){state.history.splice(i,1);saveState();renderHistory();updateDashboard();toast("Registro excluído.")}}

function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
document.getElementById("mobileMenu").onclick=()=>document.querySelector(".sidebar").classList.toggle("open");
document.getElementById("activitySearch").addEventListener("input",e=>{
  const q=e.target.value.toLowerCase();
  document.querySelectorAll("#activitiesTable tr").forEach(row=>row.style.display=row.innerText.toLowerCase().includes(q)?"":"none");
});
loadState();
renderDisciplines();renderActivities();renderGoals();renderHistory();updateDashboard();
