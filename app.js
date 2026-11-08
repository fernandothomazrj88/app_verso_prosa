
document.addEventListener('DOMContentLoaded', () => {

  const login = document.getElementById('login');
  const app = document.getElementById('app');
  const loginForm = document.getElementById('loginForm');

  // LOGIN DEMONSTRATIVO
  // A autenticação real será conectada ao backend posteriormente.
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    login.classList.add('hidden');
    app.classList.remove('hidden');

    abrirPagina('inicio');
  });

  // NAVEGAÇÃO ENTRE TELAS
  function abrirPagina(id) {
    document.querySelectorAll('.page').forEach(pagina => {
      pagina.classList.remove('active');
    });

    const paginaSelecionada = document.getElementById(id);

    if (paginaSelecionada) {
      paginaSelecionada.classList.add('active');
    }

    document.querySelectorAll('.nav-item').forEach(botao => {
      botao.classList.remove('active');
    });

    const botaoAtivo = document.querySelector(
      `.nav-item[data-page="${id}"]`
    );

    if (botaoAtivo) {
      botaoAtivo.classList.add('active');
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // BOTÕES DOS ATALHOS E MENU INFERIOR
  document.addEventListener('click', (event) => {
    const botao = event.target.closest('[data-page]');

    if (!botao) return;

    const destino = botao.dataset.page;

    if (destino) {
      abrirPagina(destino);
    }
  });

  // RECUPERAÇÃO DE SENHA
  const forgotPassword = document.getElementById('forgotPassword');

  if (forgotPassword) {
    forgotPassword.addEventListener('click', (event) => {
      event.preventDefault();

      alert(
        'A recuperação de senha será disponibilizada quando conectarmos a autenticação.'
      );
    });
  }

});
