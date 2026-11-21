document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.VP_MODULES_READY;
  } catch (moduleError) {
    console.error('[Verso & Prosa] inicialização cancelada:', moduleError);
    return;
  }
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const welcome = $('#welcome');
  const login = $('#login');
  const app = $('#app');
  const API_URL = 'https://script.google.com/macros/s/AKfycbzcpPJkdg_ydox7tE8UnFax6R9_aJls4Ildlp_ko9zXRcFZpb1Y8TyLleBexZYtBNCk/exec';

  const PROFILE_BY_EMAIL = Object.freeze({
    'fernandothomaz.rj@gmail.com': Object.freeze({
      key: 'fernando', email: 'fernandothomaz.rj@gmail.com', name: 'Fernando',
      profile: 'fernando', portrait: './assets/profiles/fernando-epoca.webp?v=44',
      portraitAlt: 'Retrato de época de Fernando',
      headline: 'Seja bem-vindo,<br>caro leitor!',
      message: 'Sua biblioteca o aguarda, senhor Fernando.'
    }),
    'leticiathomaz.rj@gmail.com': Object.freeze({
      key: 'leticia', email: 'leticiathomaz.rj@gmail.com', name: 'Letícia',
      profile: 'leticia', portrait: './assets/profiles/lele-epoca.webp?v=44',
      portraitAlt: 'Retrato clássico de Letícia',
      headline: 'Seja bem-vinda,<br>cara leitora!',
      message: 'Sua biblioteca a aguarda, senhora Letícia.'
    })
  });
  const PROFILE_BY_KEY = Object.freeze({
    fernando: PROFILE_BY_EMAIL['fernandothomaz.rj@gmail.com'],
    leticia: PROFILE_BY_EMAIL['leticiathomaz.rj@gmail.com']
  });
  const ACTIVE_PROFILE_KEY = 'vp_active_profile_v44';
  const LEGACY_SESSION_KEY = 'vp_auth_session';

  let session = null;
  let cloud = { books: [], notes: [], goal: null };
  let filter = 'todos';
  let selectedBook = null;

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function profileForEmail(email) {
    return PROFILE_BY_EMAIL[normalizeEmail(email)] || null;
  }

  function sessionStorageKey(profileKey) {
    return 'vp_auth_session_' + profileKey + '_v44';
  }

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function safeImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, window.location.href);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }

  function showLoginError(message) {
    const target = $('#loginError');
    if (target) target.textContent = message || '';
  }

  // O Apps Script Content Service redireciona as respostas para outro domínio.
  // O formulário direcionado a um iframe evita depender de fetch/CORS.
  function api(action, data = {}) {
    return new Promise((resolve, reject) => {
      const requestId = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      const frameName = `vp_api_${requestId.replace(/[^a-zA-Z0-9_]/g, '')}`;
      const frame = document.createElement('iframe');
      frame.name = frameName;
      frame.title = 'Conexão segura com a biblioteca';
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;border:0;';

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = API_URL;
      form.target = frameName;
      form.acceptCharset = 'UTF-8';
      form.style.display = 'none';

      const payload = document.createElement('input');
      payload.type = 'hidden';
      payload.name = 'payload';
      payload.value = JSON.stringify({ action, ...data });
      const id = document.createElement('input');
      id.type = 'hidden';
      id.name = 'requestId';
      id.value = requestId;
      form.append(payload, id);

      let finished = false;
      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        clearTimeout(timeout);
        form.remove();
        frame.remove();
      };
      const onMessage = event => {
        const message = event.data;
        if (!message || message.type !== 'vp-api-response' || message.requestId !== requestId) return;
        finished = true;
        cleanup();
        if (!message.data || !message.data.ok) {
          reject(new Error(message.data?.error || 'Não foi possível concluir a operação.'));
        } else {
          resolve(message.data);
        }
      };
      const timeout = setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error('O banco não respondeu. Confira a implantação do Apps Script e tente novamente.'));
      }, 25000);

      window.addEventListener('message', onMessage);
      document.body.append(frame, form);
      try { form.submit(); }
      catch (_) {
        finished = true;
        cleanup();
        reject(new Error('Não foi possível enviar a solicitação ao banco.'));
      }
    });
  }

  function saveSession(value) {
    if (!value) {
      const currentProfile = profileForEmail(session?.email);
      if (currentProfile) localStorage.removeItem(sessionStorageKey(currentProfile.key));
      if (!session || localStorage.getItem(ACTIVE_PROFILE_KEY) === (currentProfile?.key || '')) {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
      }
      localStorage.removeItem(LEGACY_SESSION_KEY);
      session = null;
      return;
    }

    const identity = profileForEmail(value.email);
    if (!identity) throw new Error('Não foi possível identificar a conta da biblioteca pelo e-mail.');

    // Todos os campos visuais da sessão são canonicalizados pelo e-mail autorizado.
    session = {
      ...value,
      email: identity.email,
      name: identity.name,
      profile: identity.profile
    };
    localStorage.setItem(sessionStorageKey(identity.key), JSON.stringify(session));
    localStorage.setItem(ACTIVE_PROFILE_KEY, identity.key);
    // Remove a sessão única usada pelas versões anteriores para impedir restauração cruzada.
    localStorage.removeItem(LEGACY_SESSION_KEY);
  }

  function renderProfile() {
    const identity = profileForEmail(session?.email);
    if (!identity) {
      throw new Error('A conta autenticada não corresponde a Fernando nem a Letícia. Saia e entre novamente com o e-mail correto.');
    }

    // Mantém a sessão e toda a interface alinhadas à mesma identidade confirmada.
    session.name = identity.name;
    session.email = identity.email;
    session.profile = identity.profile;
    const first = identity.name.charAt(0).toUpperCase();

    $('#profileLabel').textContent = identity.name;
    // Algumas versões do layout não possuem #welcomeName; trate-o como opcional.
    const welcomeName = $('#welcomeName');
    if (welcomeName) welcomeName.textContent = identity.name;
    $('#profileName').textContent = identity.name;
    $('#profileAvatar').textContent = first;
    $('#sidebarName').textContent = identity.name;
    $('#sidebarAvatar').textContent = first;
    $('#profileSwitch').textContent = '↪';

    const portrait = $('#homeCharacterAvatar');
    const greetingHeadline = $('#homeGreetingHeadline');
    const greetingMessage = $('#homeGreetingMessage');
    const heroBanner = document.querySelector('#inicio .home-hero-banner');
    if (!portrait || !greetingHeadline || !greetingMessage || !heroBanner) {
      throw new Error('Não foi possível localizar o card de boas-vindas da Home principal.');
    }

    // A variação de composição do card é mantida para acomodar as duas artes aprovadas.
    heroBanner.classList.toggle('home-is-leticia', identity.key === 'leticia');
    portrait.src = identity.portrait;
    portrait.alt = identity.portraitAlt;
    greetingHeadline.innerHTML = identity.headline;
    greetingMessage.textContent = identity.message;
    document.body.dataset.vpProfile = identity.key;
    console.info('[Verso & Prosa] perfil ativo:', identity.key, identity.email);
  }

  function openPage(id) {
    if (!$('#' + id)) return;
    $$('.page').forEach(page => page.classList.toggle('active', page.id === id));
    $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.page === id));
    $$('.mock-bottom-nav button[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (id === 'inicio') renderHome();
    if (id === 'estante') renderBooks();
    if (id === 'anotacoes') renderNotes();
    if (id === 'calendario') renderGoal();
  }

  function enterApp() {
    // Primeiro confirma a identidade; a interface não aparece se o perfil não for reconhecido.
    renderProfile();
    document.body.classList.remove('auth-flow');
    welcome.classList.add('hidden');
    login.classList.add('hidden');
    app.classList.remove('hidden');
    welcome.style.display = 'none';
    login.style.display = 'none';
    app.style.display = 'block';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Força a mesma Home principal para ambos. Nunca restaura o Ateliê como página inicial.
    history.replaceState(null, '', window.location.pathname + window.location.search);
    openPage('inicio');
  }

  async function loadCloudData() {
    const result = await api('getData', { token: session.token });
    const data = result.data || {};
    cloud = {
      books: Array.isArray(data.books) ? data.books : [],
      notes: Array.isArray(data.notes) ? data.notes : [],
      goal: data.goal || null
    };
  }

  function nomesLegadosDoPerfil(nome) {
    const original = String(nome || '').trim().toLowerCase();
    const nomes = [original];
    if (original.includes('fern')) nomes.push('fernando');
    if (original.includes('let')) nomes.push('letícia', 'leticia');
    return [...new Set(nomes.filter(Boolean))];
  }

  function lerListaLegada(chave) {
    try {
      const valor = JSON.parse(localStorage.getItem(chave) || '[]');
      return Array.isArray(valor) ? valor : [];
    } catch (_) { return []; }
  }

  function salvarListaLegada(chave, lista) {
    localStorage.setItem(chave, JSON.stringify(lista));
  }

  function novoIdLegado() {
    return (window.crypto && crypto.randomUUID)
      ? 'legado-' + crypto.randomUUID()
      : 'legado-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  async function migrarDadosLocais() {
    // Mantém a cópia local intacta. Os IDs são gravados nela antes do envio,
    // para que uma tentativa repetida atualize o mesmo registro sem duplicá-lo.
    const marcador = 'vp_cloud_migrated_v2_' + String(session.email || '').toLowerCase();
    if (localStorage.getItem(marcador) === '1') return { livros: 0, anotacoes: 0, pendencias: 0 };

    let livrosMigrados = 0, anotacoesMigradas = 0, pendencias = 0;
    const nomes = nomesLegadosDoPerfil(session.name);

    for (const nome of nomes) {
      const chaveLivros = 'vp_' + nome + '_books';
      const livros = lerListaLegada(chaveLivros);
      let livrosAlterados = false;
      for (const livro of livros) {
        if (!livro || !String(livro.titulo || '').trim()) continue;
        if (!livro.id) { livro.id = novoIdLegado(); livrosAlterados = true; }
        if (cloud.books.some(b => String(b.id) === String(livro.id))) continue;
        try {
          const result = await api('saveBook', { token: session.token, book: {
            id: livro.id, titulo: livro.titulo, autor: livro.autor || '', editora: livro.editora || '',
            genero: livro.genero || '', paginas: livro.paginas || '', isbn: livro.isbn || '',
            capa: livro.capa || '', status: livro.status || 'Quero ler'
          }});
          cloud.books.unshift(result.book);
          livrosMigrados++;
        } catch (err) { pendencias++; }
      }
      if (livrosAlterados) salvarListaLegada(chaveLivros, livros);

      const chaveNotas = 'vp_' + nome + '_notes';
      const notas = lerListaLegada(chaveNotas);
      let notasAlteradas = false;
      for (const nota of notas) {
        if (!nota || !String(nota.text || '').trim()) continue;
        if (!nota.id) { nota.id = novoIdLegado(); notasAlteradas = true; }
        if (cloud.notes.some(n => String(n.id) === String(nota.id))) continue;
        try {
          const result = await api('saveNote', { token: session.token, note: {
            id: nota.id, book: nota.book || 'Anotação livre', text: nota.text
          }});
          cloud.notes.unshift(result.note);
          anotacoesMigradas++;
        } catch (err) { pendencias++; }
      }
      if (notasAlteradas) salvarListaLegada(chaveNotas, notas);

      const chaveMeta = 'vp_' + nome + '_goal';
      const meta = (() => { try { return JSON.parse(localStorage.getItem(chaveMeta) || 'null'); } catch (_) { return null; } })();
      if (meta && (String(meta.goal || '').trim() || String(meta.book || '').trim())) {
        try {
          const result = await api('saveGoal', { token: session.token, goal: { goal: meta.goal || '', book: meta.book || '' } });
          cloud.goal = result.goal;
        } catch (err) { pendencias++; }
      }
    }

    if (pendencias === 0) localStorage.setItem(marcador, '1');
    return { livros: livrosMigrados, anotacoes: anotacoesMigradas, pendencias };
  }

  function mensagemAposMigracao(resultado) {
    if (!resultado) return;
    const total = resultado.livros + resultado.anotacoes;
    if (total > 0) {
      toast(resultado.pendencias
        ? `Importados ${resultado.livros} livro(s) e ${resultado.anotacoes} anotação(ões). Algumas informações precisam ser reenviadas.`
        : `Dados anteriores importados: ${resultado.livros} livro(s) e ${resultado.anotacoes} anotação(ões).`);
    } else if (resultado.pendencias > 0) {
      toast('A conta entrou, mas alguns dados locais ainda não foram sincronizados.');
    }
  }
  async function loginWith(email, senha) {
    const identity = profileForEmail(email);
    if (!identity) throw new Error('Use o e-mail cadastrado para Fernando ou Letícia.');

    // Limpa os dados em memória antes de iniciar outra autenticação.
    cloud = { books: [], notes: [], goal: null };
    const result = await api('login', { email: identity.email, senha });
    if (!result.token || !result.user) throw new Error('O servidor não retornou uma sessão válida.');

    const serverEmail = normalizeEmail(result.user.email);
    const serverProfile = String(result.user.profile || result.user.perfil || '').trim().toLowerCase();
    if (serverEmail !== identity.email) {
      throw new Error('O servidor autenticou um e-mail diferente do informado. Confira o cadastro na aba USUARIOS.');
    }
    if (serverProfile && serverProfile !== identity.profile) {
      throw new Error('O perfil retornado pelo banco não corresponde ao e-mail autenticado. Confira a aba USUARIOS.');
    }

    saveSession({
      token: result.token,
      userId: String(result.user.id || ''),
      email: identity.email,
      name: identity.name,
      profile: identity.profile
    });

    try {
      await loadCloudData();
      const migracao = await migrarDadosLocais();
      enterApp();
      if (migracao.livros || migracao.anotacoes || migracao.pendencias) mensagemAposMigracao(migracao);
      else toast('Bem-vindo(a), ' + identity.name + '. Sua biblioteca está aberta.');
    } catch (error) {
      saveSession(null);
      cloud = { books: [], notes: [], goal: null };
      throw error;
    }
  }

  async function restoreSession() {
    try {
      const activeProfile = String(localStorage.getItem(ACTIVE_PROFILE_KEY) || '').trim().toLowerCase();
      const identity = PROFILE_BY_KEY[activeProfile];
      if (!identity) {
        // Versões anteriores guardavam os dois usuários numa única chave; ela não é mais confiável.
        localStorage.removeItem(LEGACY_SESSION_KEY);
        return;
      }

      const saved = JSON.parse(localStorage.getItem(sessionStorageKey(identity.key)) || 'null');
      if (!saved?.token || normalizeEmail(saved.email) !== identity.email) {
        localStorage.removeItem(sessionStorageKey(identity.key));
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
        localStorage.removeItem(LEGACY_SESSION_KEY);
        return;
      }

      session = {
        ...saved,
        email: identity.email,
        name: identity.name,
        profile: identity.profile
      };
      await loadCloudData();
      const migracao = await migrarDadosLocais();
      enterApp();
      mensagemAposMigracao(migracao);
    } catch (error) {
      saveSession(null);
      cloud = { books: [], notes: [], goal: null };
      document.body.classList.remove('auth-flow');
      app.classList.add('hidden');
      app.style.display = 'none';
      welcome.classList.remove('hidden');
      welcome.style.display = '';
      login.classList.add('hidden');
      login.style.display = '';
      showLoginError('Não foi possível restaurar esta sessão. Entre novamente com seu e-mail e senha.');
      console.warn('[Verso & Prosa] sessão anterior descartada:', error);
    }
  }

  function showWelcomeAfterExternalAccountChange() {
    session = null;
    cloud = { books: [], notes: [], goal: null };
    app.classList.add('hidden');
    app.style.display = 'none';
    document.body.classList.remove('auth-flow');
    login.classList.add('hidden');
    login.style.display = '';
    welcome.classList.remove('hidden');
    welcome.style.display = '';
    showLoginError('A conta ativa foi alterada em outra janela. Entre novamente para continuar.');
  }

  // Evita que duas janelas do mesmo aplicativo exibam contas diferentes sem avisar.
  window.addEventListener('storage', event => {
    if (event.key !== ACTIVE_PROFILE_KEY) return;
    const nextProfile = String(event.newValue || '').trim().toLowerCase();
    if (session && nextProfile !== String(session.profile || '').toLowerCase()) {
      showWelcomeAfterExternalAccountChange();
    }
  });

  function logout() {
    saveSession(null);
    cloud = { books: [], notes: [], goal: null };
    app.classList.add('hidden');
    app.style.display = 'none';
    document.body.classList.remove('auth-flow');
    login.classList.add('hidden');
    login.style.display = '';
    welcome.classList.remove('hidden');
    welcome.style.display = '';
    $('#loginForm').reset();
    showLoginError('');
    toast('Você saiu da sua biblioteca.');
  }

  function renderHome() {
    const books = Array.isArray(cloud.books) ? cloud.books : [];
    const normalizedStatus = book => String(book.status || '').trim().toLocaleLowerCase('pt-BR');
    const readingBooks = books.filter(book => normalizedStatus(book) === 'lendo');
    const reading = readingBooks[0] || null;
    const finished = books.filter(book => normalizedStatus(book) === 'lido').length;
    const wantRead = books.filter(book => normalizedStatus(book) === 'quero ler').length;

    $('#statBooks').textContent = String(books.length);
    $('#statReading').textContent = String(readingBooks.length);
    $('#statFinished').textContent = String(finished);
    $('#statWantRead').textContent = String(wantRead);

    const cover = $('#homeReadingCover');
    const title = $('#homeReadingTitle');
    const author = $('#homeReadingAuthor');
    const meta = $('#homeReadingMeta');
    const action = $('#homeReadingAction');
    const progressWrap = $('#homeProgressWrap');
    const progressBar = $('#homeProgressBar');
    const progressLabel = $('#homeProgressLabel');

    if (reading) {
      const image = safeImageUrl(reading.capa);
      cover.innerHTML = image
        ? `<img src="${escapeHtml(image)}" alt="Capa de ${escapeHtml(reading.titulo || 'livro')}">`
        : `<span class="fallback-cover-title">${escapeHtml(reading.titulo || 'V&amp;P')}</span>`;
      title.textContent = reading.titulo || 'Livro em leitura';
      author.textContent = reading.autor || 'Autor não informado';
      const pages = Number(reading.paginas || 0);
      meta.innerHTML = pages > 0
        ? `<span>◫ ${pages.toLocaleString('pt-BR')} páginas</span><span>• Em leitura</span>`
        : '<span>Um capítulo de cada vez.</span>';
      const progress = Number(reading.progresso ?? reading.PROGRESSO ?? 0);
      progressWrap.hidden = false;
      if (Number.isFinite(progress) && progress > 0) {
        const percent = Math.max(0, Math.min(100, progress));
        progressBar.style.width = `${percent}%`;
        progressLabel.textContent = `${Math.round(percent)}%`;
      } else {
        progressBar.style.width = '0%';
        progressLabel.textContent = '0%';
      }
      action.textContent = 'Abrir ficha do livro →';
      action.dataset.openCurrentBook = 'true';
      action.dataset.page = '';
    } else {
      cover.innerHTML = '<span class="fallback-cover-title">V&amp;P</span>';
      title.textContent = 'Escolha o próximo volume';
      author.textContent = 'Sua biblioteca está pronta para a próxima jornada.';
      meta.innerHTML = books.length
        ? `<span>${books.length} ${books.length === 1 ? 'volume' : 'volumes'} no acervo</span>`
        : '<span>Sua próxima história começa aqui.</span>';
      progressWrap.hidden = false;
      progressBar.style.width = '0%';
      progressLabel.textContent = 'Sua próxima leitura começa aqui.';
      action.textContent = books.length ? 'Percorrer minhas estantes →' : 'Adicionar primeiro exemplar →';
      action.dataset.openCurrentBook = '';
      action.dataset.page = books.length ? 'estante' : 'adicionar';
    }

    const recentTarget = $('#homeRecentBooks');
    if (recentTarget) {
      const recent = books.slice(0, 3);
      if (!recent.length) {
        recentTarget.innerHTML = '<div class="acquisition-empty"><span>✧</span><b>Sua próxima descoberta começa aqui.</b><button class="outline-button" data-page="adicionar">Adicionar primeiro livro →</button></div>';
      } else {
        recentTarget.innerHTML = recent.map((book, index) => {
          const originalIndex = books.indexOf(book);
          const image = safeImageUrl(book.capa);
          const coverHtml = image
            ? `<img src="${escapeHtml(image)}" alt="Capa de ${escapeHtml(book.titulo || 'livro')}" loading="lazy">`
            : `<span>${escapeHtml(book.titulo || 'V&amp;P')}</span>`;
          return `<button type="button" class="acquisition-book" data-home-book-index="${originalIndex}" aria-label="Abrir ${escapeHtml(book.titulo || 'livro')}">
            <span class="acquisition-cover">${coverHtml}</span>
            <span class="acquisition-title">${escapeHtml(book.titulo || 'Sem título')}</span>
            <span class="acquisition-author">${escapeHtml(book.autor || 'Autor não informado')}</span>
          </button>`;
        }).join('');
      }
    }
  }

  $('#enterLibrary').addEventListener('click', () => {
    // A abertura e o login são telas independentes, nunca seções empilhadas.
    document.body.classList.add('auth-flow');
    welcome.classList.add('hidden');
    login.classList.remove('hidden');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    $('#email')?.focus({ preventScroll: true });
  });

  $('#togglePassword').addEventListener('click', () => {
    const password = $('#senha');
    const showing = password.type === 'text';
    password.type = showing ? 'password' : 'text';
    const label = showing ? 'Mostrar senha' : 'Ocultar senha';
    $('#togglePassword').setAttribute('aria-label', label);
    $('#togglePassword').setAttribute('title', label);
    $('#togglePassword').dataset.visible = String(!showing);
  });

  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    showLoginError('');
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Abrindo a biblioteca…';
    try {
      await loginWith($('#email').value.trim(), $('#senha').value);
    } catch (error) {
      showLoginError(error.message);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });

  $('#forgotPassword').addEventListener('click', () => {
    showLoginError('A recuperação de senha ainda não está habilitada. A senha precisa ser redefinida pelo painel seguro do banco.');
  });

  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-page]');
    if (nav) {
      event.preventDefault();
      if (nav.dataset.openCurrentBook === 'true') {
        const current = cloud.books.find(book => String(book.status || '').toLowerCase() === 'lendo');
        if (current) openBook(current); else openPage('estante');
        return;
      }
      openPage(nav.dataset.page);
      document.body.classList.remove('library-menu-open');
    }
  });

  $('#profileSwitch').addEventListener('click', logout);
  $('#changeProfile').addEventListener('click', logout);
  $('#logout').addEventListener('click', logout);

  function renderBooks() {
    const searchInput = $('#buscarLivro');
    const term = (searchInput?.value || '').trim().toLocaleLowerCase('pt-BR');
    const allBooks = (Array.isArray(cloud.books) ? cloud.books : []).map((book, index) => ({ book, index }));
    const normalize = value => String(value || '')
      .trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const statusKey = value => {
      const status = normalize(value).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
      if (['lendo', 'estou lendo', 'em leitura', 'em andamento'].includes(status)) return 'lendo';
      if (['lido', 'lidos', 'ja li', 'concluido', 'concluida', 'finalizado', 'finalizada'].includes(status)) return 'lidos';
      if (['quero ler', 'lista de leitura', 'desejo ler', 'nao lido', 'nao iniciada'].includes(status)) return 'quero-ler';
      return 'outros';
    };

    const counts = {
      todos: allBooks.length,
      lidos: allBooks.filter(({ book }) => statusKey(book.status || book.situacao) === 'lidos').length,
      lendo: allBooks.filter(({ book }) => statusKey(book.status || book.situacao) === 'lendo').length,
      'quero-ler': allBooks.filter(({ book }) => statusKey(book.status || book.situacao) === 'quero-ler').length
    };
    Object.entries(counts).forEach(([key, value]) => {
      const count = document.querySelector(`[data-count="${key}"]`);
      if (count) count.textContent = `(${value})`;
    });

    const filtered = allBooks.filter(({ book }) => {
      const searchable = [book.titulo, book.autor, book.editora, book.genero, book.isbn]
        .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
      return searchable.includes(term) && (filter === 'todos' || statusKey(book.status || book.situacao) === filter);
    });

    const target = $('#listaLivros');
    const empty = $('#shelfEmptyState');
    if (!target) return;

    if (!filtered.length) {
      target.innerHTML = '';
      target.hidden = true;
      if (empty) {
        empty.hidden = false;
        const hasBooks = allBooks.length > 0;
        const heading = empty.querySelector('b');
        const detail = empty.querySelector('p');
        if (heading) heading.textContent = hasBooks ? 'Nenhum livro encontrado.' : 'Sua estante está esperando por você.';
        if (detail) detail.textContent = hasBooks
          ? 'Tente outro título ou escolha outro filtro.'
          : 'Adicione seu primeiro livro para começar a construir sua biblioteca.';
      }
      return;
    }

    if (empty) empty.hidden = true;
    target.hidden = false;
    target.innerHTML = filtered.map(({ book, index }, cardIndex) => {
      const image = safeImageUrl(book.capa || book.cover || book.url_capa);
      const title = String(book.titulo || book.titulo_livro || 'Livro sem título');
      const author = String(book.autor || book.nome_autor || 'Autor não informado');
      const status = statusKey(book.status || book.situacao);
      const statusLabel = status === 'lidos' ? 'Lido' : status === 'lendo' ? 'Lendo' : status === 'quero-ler' ? 'Quero Ler' : String(book.status || book.situacao || 'No acervo');
      const statusClass = status === 'lidos' ? 'is-read' : status === 'lendo' ? 'is-reading' : status === 'quero-ler' ? 'is-want' : 'is-other';
      const ratingRaw = Number(book.avaliacao || book.rating || book.estrelas || book.nota || 0);
      const rating = Number.isFinite(ratingRaw) ? Math.max(0, Math.min(5, Math.round(ratingRaw))) : 0;
      const stars = Array.from({ length: 5 }, (_, i) => `<span class="${i < rating ? 'is-filled' : ''}">★</span>`).join('');
      const photo = image
        ? `<img class="shelf-cover-photo" src="${escapeHtml(image)}" alt="Capa de ${escapeHtml(title)}" loading="lazy" decoding="async">`
        : `<span class="shelf-cover-fallback-mark" aria-hidden="true">✦</span>
           <span class="shelf-cover-shade" aria-hidden="true"></span>
           <span class="shelf-cover-copy"><b class="shelf-cover-title">${escapeHtml(title)}</b><small class="shelf-cover-author">${escapeHtml(author)}</small></span>`;
      return `
        <article class="shelf-book-card cover-tone-${cardIndex % 6}">
          <button type="button" class="shelf-grid-book" data-book-index="${index}" aria-label="Abrir ${escapeHtml(title)} de ${escapeHtml(author)}">
            <span class="shelf-grid-cover${image ? ' has-cover-image' : ' has-cover-fallback'}">
              ${photo}
            </span>
          </button>
          <span class="shelf-book-status ${statusClass}">${status === 'lidos' ? '✓ ' : status === 'lendo' ? '◷ ' : status === 'quero-ler' ? '▣ ' : ''}${escapeHtml(statusLabel)}</span>
          <span class="shelf-book-rating" title="${rating ? `${rating} de 5 estrelas` : 'Ainda sem avaliação'}" aria-label="${rating ? `${rating} de 5 estrelas` : 'Ainda sem avaliação'}">${stars}</span>
        </article>`;
    }).join('');

    // Se a capa externa falhar, mostra a versão tipográfica da capa em vez de um espaço quebrado.
    target.querySelectorAll('.shelf-cover-photo').forEach(img => {
      img.addEventListener('error', () => {
        const cover = img.closest('.shelf-grid-cover');
        const card = img.closest('.shelf-book-card');
        const bookButton = img.closest('.shelf-grid-book');
        const index = Number(bookButton?.dataset.bookIndex);
        const book = Number.isInteger(index) ? cloud.books[index] : null;
        if (!cover || !book) return;
        cover.classList.remove('has-cover-image');
        cover.classList.add('has-cover-fallback');
        img.remove();
        const mark = document.createElement('span');
        mark.className = 'shelf-cover-fallback-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = '✦';
        const shade = document.createElement('span');
        shade.className = 'shelf-cover-shade';
        shade.setAttribute('aria-hidden', 'true');
        const copy = document.createElement('span');
        copy.className = 'shelf-cover-copy';
        const title = document.createElement('b');
        title.className = 'shelf-cover-title';
        title.textContent = book.titulo || 'Livro sem título';
        const author = document.createElement('small');
        author.className = 'shelf-cover-author';
        author.textContent = book.autor || 'Autor não informado';
        copy.append(title, author);
        cover.append(mark, shade, copy);
      }, { once: true });
    });
  }

  function openBook(book) {
    if (!book) return;
    selectedBook = book;
    const image = safeImageUrl(book.capa);
    const cover = $('#detailCover');
    cover.innerHTML = image ? `<img src="${escapeHtml(image)}" alt="Capa de ${escapeHtml(book.titulo || 'livro')}">` : '<span>V&amp;P</span>';
    $('#detailTitle').textContent = book.titulo || 'Sem título';
    $('#detailAuthor').textContent = book.autor || 'Autor não informado';
    $('#detailGenre').textContent = book.genero || 'Gênero não informado';
    $('#detailStatus').textContent = String(book.status || 'No acervo').toLocaleUpperCase('pt-BR');
    const fields = [
      ['EDITORA', book.editora || 'Não informada'],
      ['PÁGINAS', book.paginas || 'Não informado'],
      ['ISBN', book.isbn || 'Não informado'],
      ['GÊNERO', book.genero || 'Não informado']
    ];
    $('#detailMeta').innerHTML = fields.map(([label, value]) => `<div class="meta-item"><small>${label}</small><b>${escapeHtml(value)}</b></div>`).join('');
    const dialog = $('#bookDialog');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', 'open');
  }

  $('#homeRecentBooks').addEventListener('click', event => {
    const button = event.target.closest('[data-home-book-index]');
    if (!button) return;
    const index = Number(button.dataset.homeBookIndex);
    openBook(Number.isInteger(index) ? cloud.books[index] : null);
  });

  $('#listaLivros').addEventListener('click', event => {
    const button = event.target.closest('[data-book-index]');
    if (!button) return;
    const index = Number(button.dataset.bookIndex);
    openBook(Number.isInteger(index) ? cloud.books[index] : null);
  });

  $('#closeBookDialog').addEventListener('click', () => $('#bookDialog').close());
  $('#bookDialog').addEventListener('click', event => {
    if (event.target === $('#bookDialog')) $('#bookDialog').close();
  });
  $('#detailNoteButton').addEventListener('click', () => {
    if (selectedBook) $('#noteBook').value = selectedBook.titulo || '';
    $('#bookDialog').close();
    openPage('anotacoes');
    $('#noteText').focus();
  });

  $('#bookForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!session?.token) { toast('Entre na sua conta antes de guardar um livro.'); return; }
    const form = event.currentTarget;
    const values = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    const original = button.textContent;
    const book = {
      titulo: String(values.get('titulo') || '').trim(),
      autor: String(values.get('autor') || '').trim(),
      editora: String(values.get('editora') || '').trim(),
      genero: String(values.get('genero') || '').trim(),
      paginas: String(values.get('paginas') || '').trim(),
      isbn: String(values.get('isbn') || '').trim(),
      capa: String(values.get('capa') || '').trim(),
      status: String(values.get('status') || 'Quero ler')
    };
    button.disabled = true;
    button.textContent = 'Guardando exemplar…';
    try {
      const result = await api('saveBook', { token: session.token, book });
      cloud.books.unshift(result.book);
      form.reset();
      renderHome();
      toast('Exemplar guardado na sua biblioteca.');
      openPage('estante');
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });

  $('#buscarLivro').addEventListener('input', renderBooks);

  $('#shelfFilterToggle')?.addEventListener('click', () => {
    const row = $('#shelfFilterRow');
    if (!row) return;
    const hidden = row.classList.toggle('is-collapsed');
    $('#shelfFilterToggle').setAttribute('aria-pressed', String(!hidden));
  });

  $('#shelfViewToggle')?.addEventListener('click', () => {
    const grid = $('#listaLivros');
    if (!grid) return;
    const listMode = grid.classList.toggle('is-list-view');
    $('#shelfViewToggle').setAttribute('aria-pressed', String(listMode));
    $('#shelfViewToggle').setAttribute('aria-label', listMode ? 'Alternar visualização em grade' : 'Alternar visualização em lista');
    $('#shelfViewToggle').setAttribute('title', listMode ? 'Visualização em grade' : 'Visualização em lista');
  });
  $$('.filter-chip').forEach(chip => chip.addEventListener('click', () => {
    $$('.filter-chip').forEach(item => {
      const active = item === chip;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    filter = chip.dataset.filter;
    renderBooks();
  }));

  $('#saveNote').addEventListener('click', async () => {
    const text = $('#noteText').value.trim();
    if (!text) { toast('Escreva sua anotação primeiro.'); return; }
    if (!session?.token) { toast('Entre na sua conta antes de guardar uma anotação.'); return; }
    const button = $('#saveNote');
    button.disabled = true;
    try {
      const result = await api('saveNote', { token: session.token, note: { book: $('#noteBook').value.trim() || 'Anotação livre', text } });
      cloud.notes.unshift(result.note);
      $('#noteText').value = '';
      $('#noteBook').value = '';
      renderNotes();
      toast('Anotação guardada no seu caderno.');
    } catch (error) { toast(error.message); }
    finally { button.disabled = false; }
  });

  function renderNotes() {
    const target = $('#notesList');
    target.innerHTML = cloud.notes.length
      ? cloud.notes.map(note => `<article class="note-item"><b>${escapeHtml(note.book || 'Anotação livre')}</b><small> · ${escapeHtml(note.date || 'Registro pessoal')}</small><p>${escapeHtml(note.text || '')}</p></article>`).join('')
      : '<p class="muted">Seu caderno ainda está em branco. A primeira anotação pode começar aqui.</p>';
  }

  async function saveGoal() {
    const goal = $('#readingGoal').value;
    const book = $('#goalBook').value.trim();
    if (!goal && !book) { toast('Informe uma meta ou um livro para seu planejamento.'); return; }
    if (!session?.token) { toast('Entre na sua conta antes de guardar o planejamento.'); return; }
    const button = $('#saveGoal');
    button.disabled = true;
    try {
      const result = await api('saveGoal', { token: session.token, goal: { goal, book } });
      cloud.goal = result.goal;
      $('#goalSaved').textContent = 'Seu planejamento foi guardado na biblioteca.';
      toast('Planejamento guardado.');
    } catch (error) { toast(error.message); }
    finally { button.disabled = false; }
  }

  function renderGoal() {
    if (!cloud.goal) return;
    $('#readingGoal').value = cloud.goal.goal || '';
    $('#goalBook').value = cloud.goal.book || '';
    $('#goalSaved').textContent = 'Planejamento carregado da sua conta.';
  }
  $('#saveGoal').addEventListener('click', saveGoal);

  $$('[data-collection]').forEach(button => button.addEventListener('click', () => {
    $('#buscarLivro').value = '';
    filter = 'todos';
    $$('.filter-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.filter === 'todos'));
    openPage('estante');
    toast('Sua coleção “' + button.dataset.collection + '” está pronta para explorar.');
  }));

  $$('[data-studio]').forEach(button => button.addEventListener('click', () => {
    toast('O recurso “' + button.dataset.studio + '” será desenvolvido na próxima etapa do ateliê.');
  }));

  restoreSession();
});
