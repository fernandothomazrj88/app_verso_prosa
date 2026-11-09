document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const login = $('#login'), app = $('#app');
  const API_URL = 'https://script.google.com/macros/s/AKfycbzIEdph3F_aJ33J3Z7IgqhvfDcOP4tmMtKzw3ENT7aC5ptzfK1OcPdlYmlsbnPlkm3F/exec';
  let session = null;
  let cloud = { books: [], notes: [], goal: null };
  let filter = 'todos';

  function toast(message) {
    const el = $('#toast'); el.textContent = message; el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2800);
  }
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function showLoginError(message) { $('#loginError').textContent = message || ''; }
  function api(action, data = {}) {
    return new Promise((resolve, reject) => {
      const requestId = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now()) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
      const frameName = 'vp_api_' + requestId.replace(/[^a-zA-Z0-9_]/g, '');
      const frame = document.createElement('iframe');
      frame.name = frameName;
      frame.title = 'Conexão segura com o banco';
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;border:0;';
      const form = document.createElement('form');
      form.method = 'POST'; form.action = API_URL; form.target = frameName;
      form.acceptCharset = 'UTF-8'; form.style.display = 'none';
      const payload = document.createElement('input');
      payload.type = 'hidden'; payload.name = 'payload';
      payload.value = JSON.stringify({ action, ...data });
      const id = document.createElement('input');
      id.type = 'hidden'; id.name = 'requestId'; id.value = requestId;
      form.append(payload, id);
      let finished = false;
      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        clearTimeout(timeout);
        form.remove(); frame.remove();
      };
      const onMessage = event => {
        const msg = event.data;
        if (!msg || msg.type !== 'vp-api-response' || msg.requestId !== requestId) return;
        // A resposta só é aceita quando contém o identificador aleatório desta chamada.
        finished = true; cleanup();
        if (!msg.data || !msg.data.ok) reject(new Error(msg.data?.error || 'Não foi possível concluir a operação.'));
        else resolve(msg.data);
      };
      const timeout = setTimeout(() => {
        if (finished) return;
        finished = true; cleanup();
        reject(new Error('O banco não respondeu. Verifique se o Apps Script foi implantado como Aplicativo da web e tente novamente.'));
      }, 25000);
      window.addEventListener('message', onMessage);
      document.body.append(frame, form);
      try { form.submit(); }
      catch (err) { finished = true; cleanup(); reject(new Error('Não foi possível enviar a solicitação ao banco.')); }
    });
  }
  function saveSession(value) {
    session = value;
    if (value) localStorage.setItem('vp_auth_session', JSON.stringify(value));
    else localStorage.removeItem('vp_auth_session');
  }
  function renderProfile() {
    const name = session?.name || 'Leitor';
    $('#profileLabel').textContent = name;
    $('#welcomeName').textContent = name;
    $('#profileName').textContent = name;
    $('#profileAvatar').textContent = name[0].toUpperCase();
    $('#profileSwitch').textContent = '↪';
  }
  function openPage(id) {
    $$('.page').forEach(p => p.classList.toggle('active', p.id === id));
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (id === 'estante') renderBooks();
    if (id === 'anotacoes') renderNotes();
    if (id === 'calendario') renderGoal();
  }
  function enterApp() {
    login.classList.add('hidden'); app.classList.remove('hidden');
    renderProfile(); openPage('inicio');
  }
  async function loadCloudData() {
    const result = await api('getData', { token: session.token });
    cloud = result.data || { books: [], notes: [], goal: null };
  }
  async function loginWith(email, senha) {
    const result = await api('login', { email, senha });
    saveSession({ token: result.token, name: result.user.name, email: result.user.email });
    await loadCloudData();
    enterApp();
    toast('Bem-vindo(a), ' + session.name + '! Seus dados foram sincronizados.');
  }
  async function restoreSession() {
    try {
      const saved = JSON.parse(localStorage.getItem('vp_auth_session') || 'null');
      if (!saved?.token) return;
      session = saved;
      await loadCloudData();
      enterApp();
    } catch (err) {
      saveSession(null);
      showLoginError('Sua sessão não pôde ser recuperada. Entre novamente com seu e-mail e senha.');
    }
  }
  function logout() {
    saveSession(null); cloud = { books: [], notes: [], goal: null };
    app.classList.add('hidden'); login.classList.remove('hidden');
    $('#loginForm').reset(); showLoginError('');
    toast('Você saiu da sua conta.');
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); showLoginError('');
    const button = e.currentTarget.querySelector('button[type="submit"]');
    const old = button.textContent; button.disabled = true; button.textContent = 'Entrando...';
    try { await loginWith($('#email').value.trim(), $('#senha').value); }
    catch (err) { showLoginError(err.message); }
    finally { button.disabled = false; button.textContent = old; }
  });
  $('#forgotPassword').addEventListener('click', () => showLoginError('A recuperação de senha ainda não está habilitada. Para redefinir, será necessário atualizar a senha da conta pelo painel seguro do banco.'));

  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-page]');
    if (nav) { e.preventDefault(); openPage(nav.dataset.page); }
  });
  $('#profileSwitch').addEventListener('click', logout);
  $('#changeProfile').addEventListener('click', logout);
  $('#logout').addEventListener('click', logout);

  function renderBooks() {
    const term = ($('#buscarLivro').value || '').toLowerCase();
    const filtered = cloud.books.filter(b => {
      const match = (b.titulo + ' ' + b.autor).toLowerCase().includes(term);
      const status = filter === 'todos' || (filter === 'lendo' && b.status === 'Lendo') || (filter === 'lidos' && b.status === 'Lido') || (filter === 'quero-ler' && b.status === 'Quero ler');
      return match && status;
    });
    const target = $('#listaLivros');
    if (!filtered.length) {
      target.innerHTML = '<div class="empty-state"><span>▤</span><b>Sua estante está esperando</b><p>Cadastre seus livros para montar sua biblioteca pessoal.</p><button class="primary compact" data-page="adicionar">Adicionar livro</button></div>';
      return;
    }
    target.innerHTML = filtered.map(b => `<article class="book-card"><div class="book-cover">${b.capa ? `<img src="${escapeHtml(b.capa)}" alt="Capa de ${escapeHtml(b.titulo)}">` : '<span>V<span>&amp;</span>P</span>'}</div><b>${escapeHtml(b.titulo)}</b><small>${escapeHtml(b.autor || 'Autor não informado')}</small><em>${escapeHtml(b.status)}</em></article>`).join('');
  }
  $('#bookForm').addEventListener('submit', async e => {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    const button = form.querySelector('button[type="submit"]'); const old = button.textContent;
    const book = { titulo: f.get('titulo').trim(), autor: f.get('autor').trim(), editora: f.get('editora'), genero: f.get('genero'), paginas: f.get('paginas'), isbn: f.get('isbn'), capa: f.get('capa'), status: f.get('status') };
    button.disabled = true; button.textContent = 'Salvando...';
    try {
      const result = await api('saveBook', { token: session.token, book });
      cloud.books.unshift(result.book); form.reset(); toast('Livro sincronizado com sua conta!'); openPage('estante');
    } catch (err) { toast(err.message); }
    finally { button.disabled = false; button.textContent = old; }
  });
  $('#buscarLivro').addEventListener('input', renderBooks);
  $$('.filter-chip').forEach(chip => chip.addEventListener('click', () => {
    $$('.filter-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); filter = chip.dataset.filter; renderBooks();
  }));
  $('#saveNote').addEventListener('click', async () => {
    const text = $('#noteText').value.trim(); if (!text) { toast('Escreva sua anotação primeiro.'); return; }
    const button = $('#saveNote'); button.disabled = true;
    try {
      const result = await api('saveNote', { token: session.token, note: { book: $('#noteBook').value.trim() || 'Anotação livre', text } });
      cloud.notes.unshift(result.note); $('#noteText').value = ''; $('#noteBook').value = ''; renderNotes(); toast('Anotação sincronizada!');
    } catch (err) { toast(err.message); }
    finally { button.disabled = false; }
  });
  function renderNotes() {
    const target = $('#notesList');
    target.innerHTML = cloud.notes.length ? cloud.notes.map(n => `<article class="note-item"><b>${escapeHtml(n.book)}</b><small class="muted"> · ${escapeHtml(n.date)}</small><p>${escapeHtml(n.text)}</p></article>`).join('') : '<p class="muted">Suas anotações aparecerão aqui.</p>';
  }
  async function saveGoal() {
    const goal = $('#readingGoal').value, book = $('#goalBook').value.trim();
    if (!goal && !book) { toast('Informe uma meta ou um livro.'); return; }
    const button = $('#saveGoal'); button.disabled = true;
    try {
      const result = await api('saveGoal', { token: session.token, goal: { goal, book } });
      cloud.goal = result.goal; $('#goalSaved').textContent = 'Planejamento sincronizado com sua conta.'; toast('Planejamento salvo!');
    } catch (err) { toast(err.message); }
    finally { button.disabled = false; }
  }
  function renderGoal() {
    if (!cloud.goal) return;
    $('#readingGoal').value = cloud.goal.goal || '';
    $('#goalBook').value = cloud.goal.book || '';
    $('#goalSaved').textContent = 'Planejamento carregado da sua conta.';
  }
  $('#saveGoal').addEventListener('click', saveGoal);

  restoreSession();
});
