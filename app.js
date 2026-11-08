document.addEventListener('DOMContentLoaded', () => {
  const login = document.getElementById('login');
  const app = document.getElementById('app');
  const loginForm = document.getElementById('loginForm');
  const forgotPassword = document.getElementById('forgotPassword');

  // Acesso demonstrativo. Ainda não autentica nem protege dados.
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    login.classList.add('hidden');
    app.classList.remove('hidden');
    abrirPagina('inicio');
  });

  function abrirPagina(id) {
    document.querySelectorAll('.page').forEach((pagina) => {
      pagina.classList.toggle('active', pagina.id === id);
    });
    document.querySelectorAll('.nav-item[data-page]').forEach((botao) => {
      botao.classList.toggle('active', botao.dataset.page === id);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', (event) => {
    const botao = event.target.closest('[data-page]');
    if (botao) abrirPagina(botao.dataset.page);
  });

  if (forgotPassword) {
    forgotPassword.addEventListener('click', (event) => {
      event.preventDefault();
      window.alert('A recuperação de senha será disponibilizada quando conectarmos a autenticação.');
    });
  }

  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach((item) => item.classList.remove('active'));
      chip.classList.add('active');
    });
  });
});
