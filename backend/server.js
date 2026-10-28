const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'estuda-plus-local-dev-secret-change-before-deploy', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 8 * 60 * 60 * 1000 } }));
function requireAuth(req, res, next) { if (!req.session.userId) return res.status(401).json({ error: 'Faça login para continuar.' }); next(); }
app.post('/api/auth/register', async (req, res) => {
 const nome=String(req.body?.nome||'').trim(), email=String(req.body?.email||'').trim().toLowerCase(), senha=String(req.body?.senha||'');
 if(nome.length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || senha.length<8) return res.status(400).json({error:'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.'});
 try { const hash=await bcrypt.hash(senha,12); const [r]=await db.query('INSERT INTO usuarios (nome,email,senha_hash) VALUES (?,?,?)',[nome,email,hash]); req.session.userId=r.insertId; req.session.userName=nome; res.status(201).json({id:r.insertId,nome,email}); }
 catch(err){ if(err.code==='ER_DUP_ENTRY') return res.status(409).json({error:'Este e-mail já possui cadastro.'}); console.error(err); res.status(500).json({error:'Não foi possível criar a conta.'}); }
});
app.post('/api/auth/login', async (req,res)=>{ const email=String(req.body?.email||'').trim().toLowerCase(), senha=String(req.body?.senha||''); try { const [rows]=await db.query('SELECT id,nome,email,senha_hash FROM usuarios WHERE email=? LIMIT 1',[email]); if(!rows.length || !(await bcrypt.compare(senha,rows[0].senha_hash))) return res.status(401).json({error:'E-mail ou senha incorretos.'}); req.session.userId=rows[0].id; req.session.userName=rows[0].nome; res.json({id:rows[0].id,nome:rows[0].nome,email:rows[0].email}); } catch(err){console.error(err);res.status(500).json({error:'Não foi possível entrar.'});} });
app.get('/api/auth/me',(req,res)=>req.session.userId?res.json({authenticated:true,user:{id:req.session.userId,nome:req.session.userName}}):res.status(401).json({authenticated:false}));
app.post('/api/auth/logout',(req,res)=>req.session.destroy(err=>{if(err)return res.status(500).json({error:'Não foi possível sair.'});res.clearCookie('connect.sid');res.json({ok:true});}));
app.use(express.static(path.join(__dirname, '..')));

app.get('/api/health', async (_req, res) => {
  try { await db.query('SELECT 1'); res.json({ ok: true, database: 'connected' }); }
  catch (err) { res.status(500).json({ ok: false, error: 'Não foi possível conectar ao banco.' }); }
});

app.get('/api/studies', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.data_estudo AS date, r.duracao_minutos AS minutes, r.conteudo AS content,
              COALESCE(d.nome, 'Sem disciplina') AS discipline
       FROM registros_estudo r LEFT JOIN disciplinas d ON d.id = r.disciplina_id
       WHERE r.usuario_id = ? ORDER BY r.data_estudo DESC, r.id DESC`, [req.session.userId]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao consultar estudos.' }); }
});

app.post('/api/studies', requireAuth, async (req, res) => {
  const { date, minutes, content, discipline } = req.body || {};
  const mins = Number(minutes);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !Number.isInteger(mins) || mins < 1 || mins > 1440 || !String(content || '').trim() || !String(discipline || '').trim()) {
    return res.status(400).json({ error: 'Informe disciplina, data, conteúdo e duração válida (1 a 1440 minutos).' });
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let [subjects] = await conn.query('SELECT id FROM disciplinas WHERE usuario_id = ? AND nome = ? LIMIT 1', [req.session.userId, discipline]);
    let subjectId;
    if (subjects.length) subjectId = subjects[0].id;
    else {
      const [created] = await conn.query('INSERT INTO disciplinas (usuario_id, nome) VALUES (?, ?)', [req.session.userId, discipline]);
      subjectId = created.insertId;
    }
    const [result] = await conn.query(
      'INSERT INTO registros_estudo (usuario_id, disciplina_id, data_estudo, duracao_minutos, conteudo) VALUES (?, ?, ?, ?, ?)',
      [req.session.userId, subjectId, date, mins, String(content).trim()]);
    await conn.commit();
    res.status(201).json({ id: result.insertId, date, minutes: mins, content: String(content).trim(), discipline });
  } catch (err) {
    await conn.rollback(); console.error(err); res.status(500).json({ error: 'Não foi possível salvar o estudo.' });
  } finally { conn.release(); }
});

app.delete('/api/studies/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Identificador inválido.' });
  try {
    const [result] = await db.query('DELETE FROM registros_estudo WHERE id = ? AND usuario_id = ?', [id, req.session.userId]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Registro não encontrado.' });
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao excluir registro.' }); }
});

// Atividades: persistência no MariaDB por usuário autenticado.
app.get('/api/activities', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT a.id, a.titulo AS name, COALESCE(d.nome, '') AS discipline,
      DATE_FORMAT(a.data_entrega, '%Y-%m-%d') AS isoDate, a.concluida AS completed
      FROM atividades a LEFT JOIN disciplinas d ON d.id = a.disciplina_id
      WHERE a.usuario_id = ? ORDER BY a.id DESC`, [req.session.userId]);
    res.json(rows.map(a => ({ ...a, status: a.completed ? 'Concluída' : 'Pendente', date: a.isoDate ? a.isoDate.split('-').reverse().join('/') : '' })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao consultar atividades.' }); }
});
app.post('/api/activities', requireAuth, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const discipline = String(req.body?.discipline || '').trim();
  const date = String(req.body?.date || '');
  if (!name || !discipline || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Informe nome, disciplina e prazo válido.' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let [subjects] = await conn.query('SELECT id FROM disciplinas WHERE usuario_id = ? AND nome = ? LIMIT 1', [req.session.userId, discipline]);
    let subjectId;
    if (subjects.length) subjectId = subjects[0].id;
    else { const [created] = await conn.query('INSERT INTO disciplinas (usuario_id, nome) VALUES (?, ?)', [req.session.userId, discipline]); subjectId = created.insertId; }
    const [result] = await conn.query('INSERT INTO atividades (usuario_id, disciplina_id, titulo, data_entrega, concluida) VALUES (?, ?, ?, ?, 0)', [req.session.userId, subjectId, name, date]);
    await conn.commit();
    res.status(201).json({ id: result.insertId, name, discipline, isoDate: date, date: date.split('-').reverse().join('/'), status: 'Pendente' });
  } catch (err) { await conn.rollback(); console.error(err); res.status(500).json({ error: 'Não foi possível salvar a atividade.' }); }
  finally { conn.release(); }
});
app.patch('/api/activities/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Identificador inválido.' });
  try {
    const [rows] = await db.query('SELECT concluida FROM atividades WHERE id = ? AND usuario_id = ?', [id, req.session.userId]);
    if (!rows.length) return res.status(404).json({ error: 'Atividade não encontrada.' });
    const completed = !Boolean(rows[0].concluida);
    await db.query('UPDATE atividades SET concluida = ? WHERE id = ? AND usuario_id = ?', [completed, id, req.session.userId]);
    res.json({ id, status: completed ? 'Concluída' : 'Pendente' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Não foi possível atualizar a atividade.' }); }
});
app.delete('/api/activities/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM atividades WHERE id = ? AND usuario_id = ?', [Number(req.params.id), req.session.userId]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Atividade não encontrada.' });
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Não foi possível excluir a atividade.' }); }
});

// Metas de estudo: cria, lista e exclui metas no banco. A coluna descricao é adicionada
// automaticamente para instalações que já tinham criado a tabela antes desta versão.
app.get('/api/goals', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, titulo AS name, COALESCE(descricao, 'Meta pessoal') AS detail,
      CASE WHEN horas_objetivo > 0 THEN LEAST(100, ROUND((horas_realizadas / horas_objetivo) * 100)) ELSE 0 END AS progress
      FROM metas WHERE usuario_id = ? ORDER BY id DESC`, [req.session.userId]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao consultar metas.' }); }
});
app.post('/api/goals', requireAuth, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const detail = String(req.body?.detail || 'Meta pessoal').trim() || 'Meta pessoal';
  if (!name) return res.status(400).json({ error: 'Informe o nome da meta.' });
  try {
    const [result] = await db.query('INSERT INTO metas (usuario_id, titulo, descricao, horas_objetivo, horas_realizadas) VALUES (?, ?, ?, 100, 0)', [req.session.userId, name, detail]);
    res.status(201).json({ id: result.insertId, name, detail, progress: 0 });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Não foi possível salvar a meta.' }); }
});
app.delete('/api/goals/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM metas WHERE id = ? AND usuario_id = ?', [Number(req.params.id), req.session.userId]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Meta não encontrada.' });
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Não foi possível excluir a meta.' }); }
});

app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const [[study]] = await db.query('SELECT COALESCE(SUM(duracao_minutos),0) AS minutes, COUNT(*) AS sessions FROM registros_estudo WHERE usuario_id = ?', [req.session.userId]);
    const [[subjects]] = await db.query('SELECT COUNT(*) AS total FROM disciplinas WHERE usuario_id = ?', [req.session.userId]);
    const [[activities]] = await db.query('SELECT COUNT(*) AS total, COALESCE(SUM(concluida = 1),0) AS completed FROM atividades WHERE usuario_id = ?', [req.session.userId]);
    const [[goals]] = await db.query('SELECT COUNT(*) AS total FROM metas WHERE usuario_id = ?', [req.session.userId]);
    res.json({ minutes: Number(study.minutes), sessions: Number(study.sessions), disciplines: Number(subjects.total), activities: Number(activities.total), completedActivities: Number(activities.completed), goals: Number(goals.total) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao carregar dashboard.' }); }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

(async () => {
  try {
    try { await db.query('ALTER TABLE metas ADD COLUMN descricao TEXT NULL'); } catch (migrationError) { if (migrationError.code !== 'ER_DUP_FIELDNAME') throw migrationError; }
    app.listen(PORT, () => console.log(`Estuda+ disponível em http://localhost:${PORT}`));
  } catch (err) {
    console.error('Falha ao iniciar. Confira se o MariaDB está ativo e se o arquivo .env está correto.');
    console.error(err.message);
    process.exit(1);
  }
})();
