document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.VP_MODULES_READY;
  } catch (moduleError) {
    console.error('[Versos & Narrativas] inicialização cancelada:', moduleError);
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
      profile: 'fernando', portrait: './assets/profiles/fernando-approved-portrait.webp?v=70',
      portraitAlt: 'Retrato de época de Fernando',
      headline: '<span>Seja bem-vindo,</span><br><span>caro leitor!</span>',
      message: 'Sua biblioteca o aguarda, senhor Fernando.'
    }),
    'leticiathomaz.rj@gmail.com': Object.freeze({
      key: 'leticia', email: 'leticiathomaz.rj@gmail.com', name: 'Letícia',
      profile: 'leticia', portrait: './assets/profiles/leticia-approved-portrait.webp?v=70',
      portraitAlt: 'Retrato clássico de Letícia',
      headline: '<span>Seja bem-vinda,</span><br><span>cara leitora!</span>',
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
    console.info('[Versos & Narrativas] perfil ativo:', identity.key, identity.email);
  }

  function openPage(id) {
    const targetPage = document.getElementById(String(id || ''));
    if (!targetPage || !targetPage.classList.contains('page')) {
      console.error('[Versos & Narrativas] módulo não encontrado:', id);
      toast('Não foi possível abrir esta tela. Atualize o aplicativo e tente novamente.');
      return false;
    }

    // Apenas a tela selecionada permanece ativa no contêiner modular.
    $$('#moduleHost > .page, #overlayModuleHost > .page').forEach(page => {
      const active = page === targetPage;
      page.classList.toggle('active', active);
      page.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.page === id));
    $$('.mock-bottom-nav button[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === id));
    document.body.dataset.vpPage = id;
    // O módulo Descobrir usa um scrollport próprio para não depender da
    // rolagem do documento em WebViews/PWAs. A classe é removida ao sair.
    const discoverActive = id === 'descobrir';
    document.documentElement.classList.toggle('vp-discover-active', discoverActive);
    document.body.classList.toggle('vp-discover-active', discoverActive);
    app.classList.toggle('discover-scroll-mode', discoverActive);
    if (discoverActive) {
      const discoverScroller = targetPage.querySelector('.discover-main-content');
      if (discoverScroller) discoverScroller.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: discoverActive ? 'auto' : 'smooth' });
    if (id === 'inicio') renderHome();
    if (id === 'estante') renderBooks();
    if (id === 'descobrir') renderDiscover();
    if (id === 'anotacoes') renderNotes();
    if (id === 'calendario') renderGoal();
    return true;
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
      console.warn('[Versos & Narrativas] sessão anterior descartada:', error);
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
      if (typeof discoverState !== 'undefined') discoverState.loaded = false;
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

  // Módulo Adicionar Livro — alternância entre cadastro manual e pesquisa externa.
  const addManualMode = $('#addModeManual');
  const addSearchMode = $('#addModeSearch');
  const addManualPanel = $('#bookManualPanel');
  const addSearchPanel = $('#bookSearchPanel');
  const bookSearchCache = [];

  function setAddBookMode(mode) {
    const manual = mode !== 'search';
    if (addManualMode) {
      addManualMode.classList.toggle('active', manual);
      addManualMode.setAttribute('aria-selected', String(manual));
    }
    if (addSearchMode) {
      addSearchMode.classList.toggle('active', !manual);
      addSearchMode.setAttribute('aria-selected', String(!manual));
    }
    if (addManualPanel) addManualPanel.hidden = !manual;
    if (addSearchPanel) addSearchPanel.hidden = manual;
    if (!manual) $('#bookSearchQuery')?.focus({ preventScroll: true });
  }

  addManualMode?.addEventListener('click', () => setAddBookMode('manual'));
  addSearchMode?.addEventListener('click', () => setAddBookMode('search'));
  $('#backToManualEntry')?.addEventListener('click', () => setAddBookMode('manual'));

  function refreshAddBookCoverPreview() {
    const input = $('#addBookCoverUrl');
    const image = $('#addCoverPreviewImage');
    const mark = $('#addCoverPreviewMark');
    if (!input || !image || !mark) return;
    const url = safeImageUrl(input.value);
    if (!url) {
      image.removeAttribute('src');
      image.hidden = true;
      mark.hidden = false;
      return;
    }
    image.src = url;
    image.hidden = false;
    mark.hidden = true;
  }

  $('#addCoverAction')?.addEventListener('click', () => {
    const details = $('#adicionar .add-extra-details');
    if (details) details.open = true;
    $('#addBookCoverUrl')?.focus({ preventScroll: true });
    $('#addBookCoverUrl')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('#addBookCoverUrl')?.addEventListener('input', refreshAddBookCoverPreview);
  $('#addCoverPreviewImage')?.addEventListener('error', () => {
    const image = $('#addCoverPreviewImage');
    const mark = $('#addCoverPreviewMark');
    if (image) image.hidden = true;
    if (mark) mark.hidden = false;
  });
  $('#bookForm')?.addEventListener('reset', () => setTimeout(refreshAddBookCoverPreview, 0));

  function coverFromGoogleBooks(volumeInfo) {
    const links = volumeInfo?.imageLinks || {};
    const candidate = links.thumbnail || links.smallThumbnail || '';
    return String(candidate).replace(/^http:/i, 'https:');
  }

  function renderBookSearchResults(items) {
    const target = $('#bookSearchResults');
    if (!target) return;
    if (!items.length) {
      target.innerHTML = '';
      return;
    }
    target.innerHTML = items.map((item, index) => {
      const info = item.volumeInfo || {};
      const title = String(info.title || 'Título não informado');
      const author = Array.isArray(info.authors) ? info.authors.join(', ') : 'Autor não informado';
      const publisher = [info.publisher, info.publishedDate].filter(Boolean).join(' · ');
      const cover = safeImageUrl(coverFromGoogleBooks(info));
      const coverMarkup = cover
        ? `<img class="add-search-result-cover" src="${escapeHtml(cover)}" alt="Capa de ${escapeHtml(title)}" loading="lazy">`
        : '<span class="add-search-result-cover add-search-no-cover" aria-hidden="true">✦</span>';
      return `<article class="add-search-result">
        ${coverMarkup}
        <div class="add-search-result-copy"><h3 class="add-search-result-title">${escapeHtml(title)}</h3>
          <p class="add-search-result-meta">${escapeHtml(author)}${publisher ? `<br>${escapeHtml(publisher)}` : ''}</p></div>
        <button class="add-search-select" type="button" data-book-search-index="${index}">Usar</button>
      </article>`;
    }).join('');
  }

  async function searchBooksOnline(query) {
    const feedback = $('#bookSearchFeedback');
    const target = $('#bookSearchResults');
    const term = String(query || '').trim();
    if (!term) {
      if (feedback) feedback.textContent = 'Digite um título, autor ou ISBN para pesquisar.';
      $('#bookSearchQuery')?.focus();
      return;
    }
    if (feedback) feedback.textContent = 'Consultando o catálogo de livros…';
    if (target) target.innerHTML = '';
    const button = $('#bookSearchForm button[type="submit"]');
    if (button) { button.disabled = true; button.textContent = 'Pesquisando…'; }
    try {
      const url = 'https://www.googleapis.com/books/v1/volumes?q=' + encodeURIComponent(term) + '&maxResults=12&printType=books&langRestrict=pt';
      const response = await fetch(url, { method: 'GET', mode: 'cors', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('O catálogo respondeu com o código ' + response.status + '.');
      const data = await response.json();
      bookSearchCache.length = 0;
      if (Array.isArray(data.items)) bookSearchCache.push(...data.items);
      renderBookSearchResults(bookSearchCache);
      if (feedback) feedback.textContent = bookSearchCache.length
        ? `${bookSearchCache.length} resultado(s) encontrado(s). Escolha um título para preencher a ficha.`
        : 'Não encontramos resultados. Tente pesquisar pelo título ou nome do autor.';
    } catch (error) {
      console.warn('[Versos & Narrativas] pesquisa de livros indisponível:', error);
      if (feedback) feedback.textContent = 'Não foi possível consultar o catálogo agora. Você pode registrar o livro manualmente.';
      if (target) target.innerHTML = '';
    } finally {
      if (button) { button.disabled = false; button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg> Pesquisar'; }
    }
  }

  $('#bookSearchForm')?.addEventListener('submit', event => {
    event.preventDefault();
    searchBooksOnline($('#bookSearchQuery')?.value || '');
  });
  $('#bookSearchResults')?.addEventListener('click', event => {
    const button = event.target.closest('[data-book-search-index]');
    if (!button) return;
    const item = bookSearchCache[Number(button.dataset.bookSearchIndex)];
    if (!item) return;
    const info = item.volumeInfo || {};
    const identifier = Array.isArray(info.industryIdentifiers)
      ? (info.industryIdentifiers.find(value => value.type === 'ISBN_13') || info.industryIdentifiers[0])
      : null;
    $('#addBookTitle').value = info.title || '';
    $('#addBookAuthor').value = Array.isArray(info.authors) ? info.authors.join(', ') : '';
    $('#addBookGenre').value = Array.isArray(info.categories) ? info.categories.join(' / ') : '';
    $('#bookForm [name="editora"]').value = info.publisher || '';
    $('#bookForm [name="paginas"]').value = info.pageCount || '';
    $('#bookForm [name="isbn"]').value = identifier?.identifier || '';
    $('#addBookCoverUrl').value = coverFromGoogleBooks(info);
    refreshAddBookCoverPreview();
    setAddBookMode('manual');
    toast('Dados encontrados. Confira a ficha e salve o livro.');
    $('#addBookTitle')?.focus({ preventScroll: true });
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

  // Módulo Descobrir — feed personalizado por perfil, usando o catálogo público Google Books.
  const discoverState = {
    loaded: false, loading: false, requestId: 0, query: '', orderBy: 'relevance',
    startIndex: 0, books: [], mode: 'explorar', recommendationQueries: [],
    recommendationOffsets: [], recommendationTotals: [], recommendationFinished: [],
    recommendationCursor: 0
  };

  function updateDiscoverHeading(label) {
    const heading = $('#discoverSuggestionsText');
    if (heading) heading.textContent = label;
  }

  function scrollDiscoverToTop() {
    const scroller = $('#descobrir .discover-main-content');
    if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function normalizeDiscoverText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }

  function discoverIsbn(value) {
    return String(value || '').replace(/[^0-9X]/gi, '').toUpperCase();
  }

  function discoverBookKey(book) {
    const isbn = discoverIsbn(book?.isbn);
    if (isbn) return 'isbn:' + isbn;
    return 'title:' + normalizeDiscoverText(book?.titulo) + '|author:' + normalizeDiscoverText(book?.autor);
  }

  function getOwnedDiscoverKeys() {
    const keys = new Set();
    (Array.isArray(cloud.books) ? cloud.books : []).forEach(book => {
      if (!book) return;
      const title = normalizeDiscoverText(book.titulo);
      const isbn = discoverIsbn(book.isbn);
      if (title) keys.add('title:' + title);
      if (isbn) keys.add('isbn:' + isbn);
    });
    return keys;
  }

  function isAlreadyInPersonalShelf(book, ownedKeys = getOwnedDiscoverKeys()) {
    const title = normalizeDiscoverText(book?.titulo);
    const isbn = discoverIsbn(book?.isbn);
    return Boolean((title && ownedKeys.has('title:' + title)) || (isbn && ownedKeys.has('isbn:' + isbn)));
  }

  function mapGoogleBook(item, fallback = {}) {
    const info = item?.volumeInfo || {};
    const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
    const isbn = (identifiers.find(value => value.type === 'ISBN_13') || identifiers.find(value => value.type === 'ISBN_10') || identifiers[0] || {}).identifier || '';
    return {
      volumeId: String(item?.id || ''),
      titulo: String(info.title || fallback.titulo || 'Título não informado'),
      autor: Array.isArray(info.authors) ? info.authors.join(', ') : String(fallback.autor || 'Autor não informado'),
      genero: Array.isArray(info.categories) ? info.categories.join(' / ') : String(fallback.genero || ''),
      editora: String(info.publisher || ''),
      paginas: info.pageCount != null ? String(info.pageCount) : '',
      capa: coverFromGoogleBooks(info) || String(fallback.capa || ''),
      rating: info.averageRating != null && Number.isFinite(Number(info.averageRating)) ? Number(info.averageRating) : null,
      preview: String(info.previewLink || info.infoLink || ''),
      isbn: String(isbn),
      theme: fallback.theme || 'classic',
      publishedDate: String(info.publishedDate || ''),
      description: String(info.description || '')
    };
  }

  function discoverAuthorQuery(author) {
    const normalized = normalizeDiscoverText(author);
    const aliases = [
      [/dostoi|dostoev/, 'Dostoevsky'], [/tolstoi|tolstoy/, 'Tolstoy'],
      [/tchek|chekhov/, 'Chekhov'], [/turguen|turgenev/, 'Turgenev'],
      [/gogol/, 'Gogol'], [/jane austen|austen/, 'Austen'],
      [/tolkien/, 'Tolkien'], [/c s lewis|cs lewis|clive staples lewis/, 'C.S. Lewis'],
      [/chesterton/, 'G.K. Chesterton'], [/bronte/, 'Bronte'],
      [/nietzsche/, 'Nietzsche'], [/camus/, 'Camus'],
      [/kierkegaard/, 'Kierkegaard'], [/platao|plato/, 'Plato']
    ];
    const alias = aliases.find(([pattern]) => pattern.test(normalized));
    const name = alias ? alias[1] : String(author || '').replace(/["\\]/g, '').trim();
    return name ? 'inauthor:"' + name + '"' : '';
  }

  function discoverSubjectQuery(genre) {
    const value = normalizeDiscoverText(genre);
    const rules = [
      [/russ|russian/, 'subject:Russian literature', 'Literatura russa'],
      [/class|classico/, 'subject:classics', 'Clássicos'],
      [/fantas|fantasy/, 'subject:fantasy', 'Fantasia'],
      [/romance|romant/, 'subject:romance', 'Romance'],
      [/crista|christ|relig|evangel/, 'subject:Christian literature', 'Literatura cristã'],
      [/teolog/, 'subject:theology', 'Teologia'],
      [/filosof|philosoph/, 'subject:philosophy', 'Filosofia'],
      [/poes|poetry/, 'subject:poetry', 'Poesia'],
      [/histori|history/, 'subject:history', 'História'],
      [/biograf|biograph/, 'subject:biography', 'Biografias'],
      [/ficcao|fiction|literatur/, 'subject:fiction', 'Ficção']
    ];
    const match = rules.find(([pattern]) => pattern.test(value));
    if (match) return { query: match[1], label: match[2] };
    return null;
  }

  function buildPersonalizedDiscoverPlan() {
    const shelf = Array.isArray(cloud.books) ? cloud.books : [];
    const authorCounts = new Map();
    const genreCounts = new Map();
    shelf.forEach(book => {
      // Livros já lidos ou em leitura pesam um pouco mais que itens apenas desejados.
      const status = normalizeDiscoverText(book?.status || '');
      const weight = status === 'lido' || status === 'lendo' ? 2 : 1;
      String(book?.autor || '').split(/[;,|]/).map(value => value.trim()).filter(Boolean).slice(0, 2).forEach(author => {
        const key = normalizeDiscoverText(author);
        if (key) {
          const current = authorCounts.get(key) || { author, count: 0 };
          current.count += weight; authorCounts.set(key, current);
        }
      });
      String(book?.genero || '').split(/[;,|/]/).map(value => value.trim()).filter(Boolean).forEach(genre => {
        const key = normalizeDiscoverText(genre);
        if (key) {
          const current = genreCounts.get(key) || { genre, count: 0 };
          current.count += weight; genreCounts.set(key, current);
        }
      });
    });

    const plan = [];
    const seen = new Set();
    const add = (query, label, kind) => {
      const q = String(query || '').trim();
      const key = normalizeDiscoverText(q);
      if (!q || seen.has(key) || plan.length >= 6) return;
      seen.add(key); plan.push({ query: q, label, kind });
    };

    const topAuthors = [...authorCounts.values()].sort((a, b) => b.count - a.count).slice(0, 2);
    topAuthors.forEach(item => {
      const query = discoverAuthorQuery(item.author);
      if (query) add(query, 'Obras de ' + item.author, 'autor');
    });

    const topGenres = [...genreCounts.values()].sort((a, b) => b.count - a.count);
    topGenres.forEach(item => {
      const subject = discoverSubjectQuery(item.genre);
      if (subject) add(subject.query, 'Mais de ' + subject.label, 'gênero');
    });

    const shelfText = shelf.map(book => normalizeDiscoverText([book?.titulo, book?.autor, book?.genero].join(' ')).toLowerCase()).join(' | ');
    const relatedGroups = [
      { test: /dostoi|dostoev|tolstoi|tolstoy|tchek|chekhov|turguen|turgenev|gogol|russ/, authors: ['Turgenev', 'Chekhov', 'Gogol', 'Tolstoy'] },
      { test: /c s lewis|cs lewis|lewis|literatura crista|christian|teolog/, authors: ['G.K. Chesterton', 'Dietrich Bonhoeffer', 'Augustine'] },
      { test: /tolkien|fantasia|fantasy/, authors: ['C.S. Lewis', 'Ursula K. Le Guin', 'George MacDonald'] },
      { test: /jane austen|austen|romance|romant/, authors: ['Charlotte Bronte', 'Elizabeth Gaskell', 'George Eliot'] },
      { test: /filosof|philosoph|nietzsche|camus|kierkegaard/, authors: ['Albert Camus', 'Friedrich Nietzsche', 'Soren Kierkegaard'] }
    ];
    let relatedAdded = 0;
    relatedGroups.forEach(group => {
      if (relatedAdded >= 2 || !group.test.test(shelfText)) return;
      group.authors.forEach(author => {
        if (relatedAdded >= 2) return;
        const query = discoverAuthorQuery(author);
        if (query && !seen.has(normalizeDiscoverText(query))) {
          add(query, 'Autores relacionados', 'relacionado'); relatedAdded++;
        }
      });
    });

    if (!shelf.length) {
      add('subject:classics', 'Clássicos para começar', 'tema');
      add('subject:Russian literature', 'Literatura russa', 'tema');
      add('subject:fantasy', 'Fantasia', 'tema');
      add('subject:romance', 'Romance', 'tema');
    } else {
      add('subject:classics', 'Clássicos para explorar', 'tema');
      add('subject:fiction', 'Novas obras de ficção', 'tema');
    }
    return plan.slice(0, 6);
  }

  async function requestDiscoverCatalog(query, options = {}) {
    if (!session?.token) throw new Error('Sua sessão expirou. Entre novamente.');
    return api('discoverBooks', {
      token: session.token,
      query: String(query || '').slice(0, 200),
      maxResults: Math.max(1, Math.min(20, Number(options.maxResults) || 8)),
      startIndex: Math.max(0, Math.min(1000, Number(options.startIndex) || 0)),
      orderBy: options.orderBy === 'newest' ? 'newest' : 'relevance',
      langRestrict: options.langRestrict === '' ? '' : 'pt'
    });
  }

  function uniqueRecommendedBooks(items, existing = []) {
    const ownedKeys = getOwnedDiscoverKeys();
    const seen = new Set(existing.map(discoverBookKey));
    const result = [];
    (items || []).forEach(item => {
      const book = item && item.volumeInfo ? mapGoogleBook(item) : item;
      if (!book || !book.titulo || isAlreadyInPersonalShelf(book, ownedKeys)) return;
      const key = discoverBookKey(book);
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(book);
    });
    return result;
  }

  function renderDiscoverBooks(items, append = false) {
    const target = $('#discoverBookGrid');
    if (!target) return;
    if (!append) discoverState.books = [];
    const normalized = (items || []).map(item => item && item.volumeInfo ? mapGoogleBook(item) : item);
    if (append) discoverState.books.push(...normalized);
    else discoverState.books = normalized;

    if (!discoverState.books.length) {
      target.innerHTML = '<div class="discover-empty"><span>✧</span> Não encontramos novas leituras. Tente outro tema ou pesquise um autor.</div>';
      return;
    }
    target.innerHTML = discoverState.books.map((book, index) => {
      const title = escapeHtml(book.titulo || 'Título não informado');
      const author = escapeHtml(book.autor || 'Autor não informado');
      const cover = safeImageUrl(book.capa);
      const coverMarkup = cover ? `<img src="${escapeHtml(cover)}" alt="Capa de ${title}" loading="lazy" referrerpolicy="no-referrer">` : '';
      const placeholderClass = cover ? '' : `is-placeholder theme-${escapeHtml(book.theme || 'classic')}`;
      const rating = Number.isFinite(Number(book.rating)) && book.rating !== null
        ? `<span class="discover-rating" aria-label="Avaliação ${Number(book.rating).toFixed(1)} de 5">${'★'.repeat(Math.max(0, Math.min(5, Math.round(Number(book.rating)))))}${'☆'.repeat(5 - Math.max(0, Math.min(5, Math.round(Number(book.rating)))))}</span>`
        : '<span class="discover-rating" aria-hidden="true"></span>';
      const reason = book.recommendationLabel ? `<small class="discover-book-reason">${escapeHtml(book.recommendationLabel)}</small>` : '';
      const alreadyOwned = isAlreadyInPersonalShelf(book);
      return `<article class="discover-book-card">
        <button type="button" class="discover-book-cover ${placeholderClass}" data-discover-add="${index}" ${alreadyOwned ? 'disabled' : ''} aria-label="${alreadyOwned ? 'Já está na estante: ' : 'Adicionar à estante: '}${title}">
          ${coverMarkup}<span class="discover-cover-title">${title}</span><span class="discover-cover-author">${author}</span>
        </button>
        ${rating}${reason}
        </article>`;
    }).join('');
  }

  async function fetchDiscoverBooks(query, options = {}) {
    const feedback = $('#discoverFeedback');
    const target = $('#discoverBookGrid');
    const append = Boolean(options.append);
    const startIndex = append ? discoverState.startIndex : 0;
    if (!query) return;
    const requestId = ++discoverState.requestId;
    discoverState.query = query;
    discoverState.orderBy = options.orderBy || 'relevance';
    discoverState.mode = options.mode || 'search';
    if (!append) {
      discoverState.startIndex = 0;
      discoverState.books = [];
      if (target) target.innerHTML = '<div class="discover-loading"><span>✦</span> Procurando novas leituras...</div>';
      if (feedback) feedback.textContent = 'Consultando o catálogo de livros...';
    }
    try {
      const data = await requestDiscoverCatalog(query, { maxResults: 8, startIndex, orderBy: discoverState.orderBy });
      if (requestId !== discoverState.requestId) return;
      const items = Array.isArray(data.items) ? data.items : [];
      const mapped = items.map(item => mapGoogleBook(item));
      if (append) {
        const additions = uniqueRecommendedBooks(mapped, discoverState.books);
        renderDiscoverBooks(additions, true);
      } else {
        renderDiscoverBooks(mapped);
      }
      discoverState.startIndex = startIndex + items.length;
      if (feedback) feedback.textContent = items.length
        ? `${Number(data.totalItems || items.length).toLocaleString('pt-BR')} resultado(s) no catálogo. Os livros que já estão na sua estante aparecem bloqueados.`
        : 'Nenhum resultado encontrado. Experimente outro termo.';
    } catch (error) {
      if (requestId !== discoverState.requestId) return;
      console.warn('[Versos & Narrativas] Descobrir:', error);
      if (!append && target) target.innerHTML = '<div class="discover-empty"><span>✧</span> Não foi possível consultar o catálogo agora. Confira a atualização do Apps Script e tente novamente.</div>';
      if (feedback) feedback.textContent = error.message || 'A pesquisa online está temporariamente indisponível.';
    }
  }

  async function loadDiscoverSuggestions() {
    const target = $('#discoverBookGrid');
    const feedback = $('#discoverFeedback');
    if (!target || discoverState.loading) return;
    discoverState.loading = true;
    const requestId = ++discoverState.requestId;
    discoverState.mode = 'explorar';
    discoverState.query = '';
    discoverState.startIndex = 0;
    updateDiscoverHeading('Sugestões para você');
    if (feedback) feedback.textContent = 'Analisando os autores e gêneros da sua estante...';
    target.innerHTML = '<div class="discover-loading"><span>✦</span> Preparando recomendações para sua biblioteca...</div>';
    const plan = buildPersonalizedDiscoverPlan();
    discoverState.recommendationQueries = plan;
    discoverState.recommendationOffsets = plan.map(() => 0);
    discoverState.recommendationTotals = plan.map(() => 0);
    discoverState.recommendationFinished = plan.map(() => false);
    discoverState.recommendationCursor = 0;
    try {
      const results = await Promise.allSettled(plan.map(item => requestDiscoverCatalog(item.query, { maxResults: 8, startIndex: 0, orderBy: 'relevance' })));
      if (requestId !== discoverState.requestId) return;
      const candidates = [];
      let successfulQueries = 0;
      let totalItems = 0;
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') {
          discoverState.recommendationFinished[index] = true;
          return;
        }
        successfulQueries++;
        const data = result.value || {};
        const items = Array.isArray(data.items) ? data.items : [];
        totalItems += Number(data.totalItems || items.length);
        discoverState.recommendationOffsets[index] = items.length;
        discoverState.recommendationTotals[index] = Number(data.totalItems || items.length);
        discoverState.recommendationFinished[index] = items.length === 0 || items.length >= Number(data.totalItems || items.length);
        items.forEach(item => {
          const book = mapGoogleBook(item);
          book.recommendationLabel = plan[index].label;
          book.recommendationKind = plan[index].kind;
          candidates.push(book);
        });
      });
      const unique = uniqueRecommendedBooks(candidates);
      renderDiscoverBooks(unique);
      discoverState.loaded = true;
      const shelfCount = Array.isArray(cloud.books) ? cloud.books.length : 0;
      if (feedback) {
        if (!successfulQueries) feedback.textContent = 'Não foi possível consultar o Google Books. Confira a implantação e a autorização do Apps Script.';
        else if (shelfCount) feedback.textContent = `${unique.length} sugestão(ões) selecionadas a partir de ${shelfCount} livro(s) da sua estante. Os resultados são separados por autor e gênero.`;
        else feedback.textContent = `${unique.length} sugestões para começar a explorar. Adicione livros à estante para personalizar o feed.`;
      }
    } catch (error) {
      if (requestId !== discoverState.requestId) return;
      console.warn('[Versos & Narrativas] Recomendações:', error);
      target.innerHTML = '<div class="discover-empty"><span>✧</span> Não foi possível consultar o catálogo. Atualize o Apps Script com a integração Google Books e tente novamente.</div>';
      if (feedback) feedback.textContent = error.message || 'Falha ao carregar recomendações.';
    } finally {
      discoverState.loading = false;
    }
  }

  async function loadMoreDiscoverSuggestions() {
    if (discoverState.loading) return;
    const queries = discoverState.recommendationQueries || [];
    if (!queries.length) { await loadDiscoverSuggestions(); return; }
    discoverState.loading = true;
    const button = $('#discoverSeeMore');
    const originalLabel = button?.innerHTML || 'Ver mais ›';
    if (button) { button.disabled = true; button.textContent = 'Buscando...'; }
    const feedback = $('#discoverFeedback');
    const requestId = ++discoverState.requestId;
    let appended = 0;
    try {
      for (let attempt = 0; attempt < queries.length * 2 && appended === 0; attempt++) {
        const index = discoverState.recommendationCursor % queries.length;
        discoverState.recommendationCursor++;
        if (discoverState.recommendationFinished[index]) continue;
        const planItem = queries[index];
        const startIndex = discoverState.recommendationOffsets[index] || 0;
        const data = await requestDiscoverCatalog(planItem.query, { maxResults: 8, startIndex, orderBy: 'relevance' });
        if (requestId !== discoverState.requestId) return;
        const items = Array.isArray(data.items) ? data.items : [];
        discoverState.recommendationOffsets[index] = startIndex + items.length;
        discoverState.recommendationTotals[index] = Number(data.totalItems || items.length);
        discoverState.recommendationFinished[index] = !items.length || discoverState.recommendationOffsets[index] >= discoverState.recommendationTotals[index];
        const mapped = items.map(item => {
          const book = mapGoogleBook(item);
          book.recommendationLabel = planItem.label;
          book.recommendationKind = planItem.kind;
          return book;
        });
        const unique = uniqueRecommendedBooks(mapped, discoverState.books);
        if (unique.length) {
          renderDiscoverBooks(unique, true);
          appended = unique.length;
          if (feedback) feedback.textContent = `Mais ${unique.length} sugestão(ões): ${planItem.label}.`;
        }
      }
      if (!appended && feedback) feedback.textContent = 'Não há mais resultados novos nessas recomendações. Experimente outro tema ou faça uma busca.';
    } catch (error) {
      if (feedback) feedback.textContent = error.message || 'Não foi possível carregar mais sugestões.';
    } finally {
      discoverState.loading = false;
      if (button) { button.disabled = false; button.innerHTML = originalLabel; }
    }
  }

  function renderDiscover() {
    const input = $('#discoverSearchInput');
    if (!discoverState.loaded && !discoverState.loading) loadDiscoverSuggestions();
    if (input && discoverState.mode === 'explorar' && !discoverState.query) input.value = '';
  }

  function setDiscoverView(view) {
    const buttons = $$('.discover-shortcut');
    buttons.forEach(button => {
      const active = button.dataset.discoverView === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    discoverState.mode = view;
    const authorChoices = $('#discoverAuthorChoices');
    if (authorChoices) authorChoices.hidden = view !== 'autores';
    if (view === 'explorar') {
      if ($('#discoverSearchInput')) $('#discoverSearchInput').value = '';
      discoverState.loaded = false;
      loadDiscoverSuggestions();
      return;
    }
    if (view === 'generos') {
      updateDiscoverHeading('Explore por gênero');
      const themes = $('#discoverThemes');
      const scroller = $('#descobrir .discover-main-content');
      if (themes && scroller) scroller.scrollTo({ top: themes.offsetTop - 12, behavior: 'smooth' });
      if ($('#discoverFeedback')) $('#discoverFeedback').textContent = 'Escolha um tema na seção abaixo para ver livros relacionados.';
      return;
    }
    if (view === 'autores') {
      updateDiscoverHeading('Escolha um autor');
      if ($('#discoverFeedback')) $('#discoverFeedback').textContent = 'Selecione um nome para encontrar suas obras.';
      return;
    }
    const views = {
      listas: { title: 'Listas para explorar', query: 'subject:classics', orderBy: 'relevance' },
      novidades: { title: 'Novidades para você', query: 'subject:fiction', orderBy: 'newest' }
    };
    const config = views[view];
    if (config) {
      updateDiscoverHeading(config.title);
      fetchDiscoverBooks(config.query, { orderBy: config.orderBy });
    }
  }

  function searchDiscover(query, heading = 'Resultados da busca', activeView = 'explorar') {
    const term = String(query || '').trim();
    if (!term) {
      toast('Digite um livro, autor ou tema para pesquisar.');
      $('#discoverSearchInput')?.focus();
      return;
    }
    $$('.discover-shortcut').forEach(button => {
      const active = button.dataset.discoverView === activeView;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const authorChoices = $('#discoverAuthorChoices');
    if (authorChoices) authorChoices.hidden = true;
    discoverState.mode = 'search';
    updateDiscoverHeading(heading);
    fetchDiscoverBooks(term, { orderBy: 'relevance' });
  }

  $('#discoverSearchForm')?.addEventListener('submit', event => {
    event.preventDefault();
    searchDiscover($('#discoverSearchInput')?.value || '');
  });
  $('#discoverFilterToggle')?.addEventListener('click', () => {
    const panel = $('#discoverFilterPanel');
    if (!panel) return;
    const expanded = $('#discoverFilterToggle').getAttribute('aria-expanded') === 'true';
    $('#discoverFilterToggle').setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;
  });
  $$('.discover-shortcut').forEach(button => button.addEventListener('click', () => setDiscoverView(button.dataset.discoverView)));
  $$('[data-discover-author-query]').forEach(button => button.addEventListener('click', () => {
    const author = button.dataset.authorName || 'autor selecionado';
    searchDiscover(button.dataset.discoverAuthorQuery, 'Obras de ' + author, 'autores');
  }));
  $$('[data-discover-query]').forEach(button => button.addEventListener('click', () => {
    const query = button.dataset.discoverQuery || '';
    if ($('#discoverSearchInput')) $('#discoverSearchInput').value = query;
    $('#discoverFilterPanel').hidden = true;
    $('#discoverFilterToggle').setAttribute('aria-expanded', 'false');
    const isTheme = Boolean(button.closest('.discover-theme-grid, .discover-filter-panel'));
    searchDiscover(query, query.toLocaleLowerCase('pt-BR').includes('russa') ? 'Grandes clássicos da literatura russa' : 'Livros por tema', isTheme ? 'generos' : 'explorar');
    scrollDiscoverToTop();
  }));
  $('#discoverSeeMore')?.addEventListener('click', () => {
    if (discoverState.mode === 'explorar' && !discoverState.query) {
      loadMoreDiscoverSuggestions();
      return;
    }
    if (!discoverState.query) {
      searchDiscover('subject:classics', 'Mais sugestões literárias');
      return;
    }
    fetchDiscoverBooks(discoverState.query, { append: true, orderBy: discoverState.orderBy });
  });
  $('#discoverBookGrid')?.addEventListener('click', event => {
    const button = event.target.closest('[data-discover-add]');
    if (!button || button.disabled) return;
    const book = discoverState.books[Number(button.dataset.discoverAdd)];
    if (!book) return;
    openPage('adicionar');
    setAddBookMode('manual');
    $('#addBookTitle').value = book.titulo || '';
    $('#addBookAuthor').value = book.autor || '';
    $('#addBookGenre').value = book.genero || '';
    $('#addBookStatus').value = 'Quero ler';
    $('#bookForm [name="editora"]').value = book.editora || '';
    $('#bookForm [name="paginas"]').value = book.paginas || '';
    $('#bookForm [name="isbn"]').value = book.isbn || '';
    $('#addBookCoverUrl').value = book.capa || '';
    refreshAddBookCoverPreview();
    toast('Dados preenchidos. Confira e salve na sua estante.');
  });

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
