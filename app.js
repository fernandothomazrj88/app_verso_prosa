document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const login = $('#login'), app = $('#app');
  let profile = localStorage.getItem('vp_profile') || 'Fernando';
  let filter = 'todos';
  const read = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const toast = (message) => { const el=$('#toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2400); };
  const profileKey = (suffix) => `vp_${profile.toLowerCase()}_${suffix}`;

  function renderProfile(){
    $('#profileLabel').textContent=profile;
    $('#welcomeName').textContent=profile;
    $('#profileName').textContent=profile;
    $('#profileAvatar').textContent=profile[0].toUpperCase();
    $('#profileSwitch').textContent=profile[0].toUpperCase();
  }
  function openPage(id){
    $$('.page').forEach(p=>p.classList.toggle('active',p.id===id));
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
    window.scrollTo({top:0,behavior:'smooth'});
    if(id==='estante') renderBooks();
    if(id==='anotacoes') renderNotes();
  }
  function enterApp(){login.classList.add('hidden');app.classList.remove('hidden');renderProfile();openPage('inicio');}
  $('#loginForm').addEventListener('submit',e=>{e.preventDefault();enterApp();});
  $('#forgotPassword').addEventListener('click',()=>toast('A recuperação de senha será ativada com a autenticação.'));
  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-page]');
    if(nav){e.preventDefault();openPage(nav.dataset.page);}
  });
  function changeProfile(){
    profile=profile==='Fernando'?'Letícia':'Fernando';
    localStorage.setItem('vp_profile',profile);renderProfile();openPage('inicio');toast(`Perfil de ${profile} selecionado.`);
  }
  $('#profileSwitch').addEventListener('click',changeProfile);
  $('#changeProfile').addEventListener('click',changeProfile);
  $('#logout').addEventListener('click',()=>{app.classList.add('hidden');login.classList.remove('hidden');});
  function renderBooks(){
    const list=read(profileKey('books'));
    const term=($('#buscarLivro').value||'').toLowerCase();
    const filtered=list.filter(b=>{
      const match=(b.titulo+' '+b.autor).toLowerCase().includes(term);
      const status=filter==='todos'||(filter==='lendo'&&b.status==='Lendo')||(filter==='lidos'&&b.status==='Lido')||(filter==='quero-ler'&&b.status==='Quero ler');
      return match&&status;
    });
    const target=$('#listaLivros');
    if(!filtered.length){target.innerHTML='<div class="empty-state"><span>▤</span><b>Sua estante está esperando</b><p>Cadastre seus livros para montar sua biblioteca pessoal.</p><button class="primary compact" data-page="adicionar">Adicionar livro</button></div>';return;}
    target.innerHTML=filtered.map(b=>`<article class="book-card"><div class="book-cover">${b.capa?`<img src="${escapeHtml(b.capa)}" alt="Capa de ${escapeHtml(b.titulo)}">`:`<span>V<span>&amp;</span>P</span>`}</div><b>${escapeHtml(b.titulo)}</b><small>${escapeHtml(b.autor||'Autor não informado')}</small><em>${escapeHtml(b.status)}</em></article>`).join('');
  }
  function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  $('#bookForm').addEventListener('submit',e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);
    const books=read(profileKey('books'));
    books.unshift({titulo:f.get('titulo').trim(),autor:f.get('autor').trim(),editora:f.get('editora'),genero:f.get('genero'),paginas:f.get('paginas'),isbn:f.get('isbn'),capa:f.get('capa'),status:f.get('status')});
    save(profileKey('books'),books);e.currentTarget.reset();toast('Livro salvo nesta biblioteca!');openPage('estante');
  });
  $('#buscarLivro').addEventListener('input',renderBooks);
  $$('.filter-chip').forEach(chip=>chip.addEventListener('click',()=>{
    $$('.filter-chip').forEach(c=>c.classList.remove('active'));chip.classList.add('active');filter=chip.dataset.filter;renderBooks();
  }));
  $('#saveNote').addEventListener('click',()=>{
    const text=$('#noteText').value.trim();if(!text){toast('Escreva sua anotação primeiro.');return;}
    const notes=read(profileKey('notes'));notes.unshift({book:$('#noteBook').value.trim()||'Anotação livre',text,date:new Date().toLocaleDateString('pt-BR')});
    save(profileKey('notes'),notes);$('#noteText').value='';$('#noteBook').value='';renderNotes();toast('Anotação guardada!');
  });
  function renderNotes(){
    const notes=read(profileKey('notes'));const target=$('#notesList');
    target.innerHTML=notes.length?notes.map(n=>`<article class="note-item"><b>${escapeHtml(n.book)}</b><small class="muted"> · ${escapeHtml(n.date)}</small><p>${escapeHtml(n.text)}</p></article>`).join(''):'<p class="muted">Suas anotações aparecerão aqui.</p>';
  }
  $('#saveGoal').addEventListener('click',()=>{
    const goal=$('#readingGoal').value;const book=$('#goalBook').value.trim();
    if(!goal&&!book){toast('Informe uma meta ou um livro.');return;}
    save(profileKey('goal'),{goal,book});$('#goalSaved').textContent='Planejamento salvo neste navegador.';toast('Planejamento salvo!');
  });
  renderProfile();
});