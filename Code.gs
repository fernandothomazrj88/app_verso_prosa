
const VP_CONFIG = {
  preto: '#080808',
  preto2: '#15121A',
  roxo: '#C000FF',
  roxoEscuro: '#6500A8',
  branco: '#FFFFFF',
  cinza: '#BDB5C7'
};

const VP_ABAS = {
  USUARIOS: [
    'ID_USUARIO', 'NOME', 'EMAIL', 'SALT', 'SENHA_HASH', 'ATIVO', 'DATA_CADASTRO'
  ],
  LIVROS: [
    'ID_LIVRO', 'TITULO', 'AUTOR', 'ISBN', 'EDITORA',
    'ANO_PUBLICACAO', 'GENERO', 'PAGINAS', 'IDIOMA',
    'FORMATO', 'STATUS_LEITURA', 'NOTA', 'DATA_INICIO',
    'DATA_CONCLUSAO', 'CAPA_URL', 'RESENHA_DOC_URL',
    'OBSERVACOES', 'DATA_CADASTRO'
  ],
  AUTORES: [
    'ID_AUTOR', 'NOME', 'NACIONALIDADE', 'DATA_NASCIMENTO',
    'DATA_FALECIMENTO', 'BIOGRAFIA', 'FOTO_URL', 'OBSERVACOES'
  ],
  ANOTACOES: [
    'ID_ANOTACAO', 'ID_LIVRO', 'TITULO', 'CONTEUDO',
    'PAGINA', 'CATEGORIA', 'DATA_CRIACAO'
  ],
  RESENHAS: [
    'ID_RESENHA', 'ID_LIVRO', 'TITULO', 'RESUMO',
    'DOCUMENTO_URL', 'STATUS', 'DATA_CRIACAO', 'DATA_ATUALIZACAO'
  ],
  CITACOES: [
    'ID_CITACAO', 'ID_LIVRO', 'TEXTO', 'PAGINA',
    'AUTOR_CITACAO', 'CATEGORIA', 'FAVORITA', 'DATA_CRIACAO'
  ],
  SESSOES_LEITURA: [
    'ID_SESSAO', 'ID_LIVRO', 'DATA', 'HORA_INICIO',
    'HORA_FIM', 'PAGINAS_INICIAIS', 'PAGINAS_FINAIS',
    'PAGINAS_LIDAS', 'DURACAO_MINUTOS', 'OBSERVACOES'
  ],
  METAS: [
    'ID_META', 'TITULO', 'TIPO', 'VALOR_OBJETIVO',
    'VALOR_ATUAL', 'DATA_INICIO', 'DATA_FIM', 'STATUS'
  ],
  LISTAS_LEITURA: [
    'ID_LISTA', 'NOME', 'DESCRICAO', 'COR',
    'DATA_CRIACAO', 'STATUS'
  ],
  ESTUDIO_LITERARIO: [
    'ID_CONTEUDO', 'ID_LIVRO', 'TIPO_CONTEUDO',
    'TITULO', 'TEXTO', 'IMAGEM_URL', 'PLATAFORMA',
    'STATUS', 'DATA_CRIACAO', 'DATA_PUBLICACAO'
  ],
  CALENDARIO: [
    'ID_EVENTO', 'TITULO', 'DESCRICAO', 'TIPO',
    'DATA_INICIO', 'DATA_FIM', 'ID_LIVRO', 'STATUS'
  ],
  CONFIGURACOES: [
    'CHAVE', 'VALOR', 'DESCRICAO'
  ]
};


// Coluna de isolamento: cada registro pertence a uma conta autenticada.
const VP_ABAS_COM_USUARIO = [
  'LIVROS', 'ANOTACOES', 'RESENHAS', 'CITACOES', 'SESSOES_LEITURA',
  'METAS', 'LISTAS_LEITURA', 'ESTUDIO_LITERARIO', 'CALENDARIO'
];

function garantirColunaUsuarioVP_(aba) {
  const ultima = Math.max(aba.getLastColumn(), 1);
  const cabecalhos = aba.getRange(1, 1, 1, ultima).getValues()[0];
  if (cabecalhos.indexOf('USUARIO_ID') === -1) {
    aba.getRange(1, ultima + 1).setValue('USUARIO_ID');
    aba.setColumnWidth(ultima + 1, 180);
  }
}

function criarVersoEProsa() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error('Não foi possível localizar a planilha vinculada.');
  }

  const nomes = Object.keys(VP_ABAS);

  nomes.forEach((nome, indice) => {
    let aba = ss.getSheetByName(nome);

    if (!aba) {
      // Aproveita a primeira aba vazia, se disponível.
      if (indice === 0 && ss.getSheets().length === 1) {
        const primeira = ss.getSheets()[0];

        if (
          primeira.getLastRow() === 0 &&
          primeira.getLastColumn() === 0
        ) {
          primeira.setName(nome);
          aba = primeira;
        }
      }

      if (!aba) {
        aba = ss.insertSheet(nome);
      }
    }

    const cabecalhos = VP_ABAS[nome];
    const primeiraLinha = aba.getRange(1, 1, 1, cabecalhos.length);
    const linhaAtual = primeiraLinha.getValues()[0];

    // Não substitui cabeçalhos que já existam.
    if (linhaAtual.every(valor => valor === '')) {
      primeiraLinha.setValues([cabecalhos]);
    }

    formatarAbaVP(aba, cabecalhos.length);
    if (nome === 'USUARIOS') aba.hideColumns(4, 2); // Salt e hash da senha ficam ocultos na planilha.
  });

  VP_ABAS_COM_USUARIO.forEach(nome => {
    const aba = ss.getSheetByName(nome);
    if (aba) garantirColunaUsuarioVP_(aba);
  });

  configurarListasVP(ss);

  // Configurações iniciais do aplicativo.
  const config = ss.getSheetByName('CONFIGURACOES');
  const valores = [
    ['NOME_APP', 'Verso & Prosa', 'Nome do aplicativo'],
    ['COR_FUNDO', '#080808', 'Fundo principal'],
    ['COR_TEXTO', '#FFFFFF', 'Texto principal'],
    ['COR_DESTAQUE', '#C000FF', 'Roxo neon'],
    ['VERSAO_BANCO', '1.0', 'Versão da estrutura'],
    ['IDIOMA', 'pt-BR', 'Idioma padrão']
  ];

  if (config.getLastRow() <= 1) {
    config.getRange(2, 1, valores.length, 3).setValues(valores);
  }

  SpreadsheetApp.flush();

  ss.toast(
    'Estrutura do Verso & Prosa criada com sucesso!',
    'Verso & Prosa',
    6
  );
}

function formatarAbaVP(aba, totalColunas) {
  const cores = VP_CONFIG;
  const linhas = Math.max(aba.getMaxRows(), 100);

  aba.setTabColor(cores.roxo);

  aba.setFrozenRows(1);

  const cabecalho = aba.getRange(1, 1, 1, totalColunas);

  cabecalho
    .setBackground(cores.roxoEscuro)
    .setFontColor(cores.branco)
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  aba.setRowHeight(1, 42);

  const corpo = aba.getRange(
    2, 1,
    Math.max(linhas - 1, 1),
    totalColunas
  );

  corpo
    .setBackground(cores.preto)
    .setFontColor(cores.branco)
    .setFontSize(10)
    .setVerticalAlignment('middle');

  // Largura padrão das colunas.
  for (let coluna = 1; coluna <= totalColunas; coluna++) {
    aba.setColumnWidth(coluna, 145);
  }

  // Campos de texto longo.
  const cabecalhos = aba
    .getRange(1, 1, 1, totalColunas)
    .getValues()[0];

  cabecalhos.forEach((titulo, indice) => {
    if (
      titulo.includes('DESCRICAO') ||
      titulo.includes('OBSERVACOES') ||
      titulo.includes('BIOGRAFIA') ||
      titulo.includes('CONTEUDO') ||
      titulo.includes('RESUMO') ||
      titulo.includes('TEXTO')
    ) {
      aba.setColumnWidth(indice + 1, 260);
    }
  });

  // Filtro automático.
  if (aba.getFilter()) {
    aba.getFilter().remove();
  }

  aba.getRange(1, 1, 1, totalColunas).createFilter();

  // Alternância visual nas linhas.
  const regras = aba.getBandings();

  regras.forEach(regra => regra.remove());

  const faixa = aba.getRange(
    1, 1,
    Math.min(linhas, 1000),
    totalColunas
  );

  const banda = faixa.applyRowBanding(
    SpreadsheetApp.BandingTheme.LIGHT_GREY,
    true,
    false
  );

  banda.setHeaderRowColor(cores.roxoEscuro);
  banda.setFirstRowColor(cores.preto);
  banda.setSecondRowColor(cores.preto2);
}

function configurarListasVP(ss) {
  const opcoes = {
    LIVROS: {
      STATUS_LEITURA: [
        'Quero ler', 'Lendo', 'Lido', 'Abandonado', 'Pausado'
      ],
      FORMATO: [
        'Físico', 'Digital', 'Audiolivro'
      ]
    },
    RESENHAS: {
      STATUS: [
        'Rascunho', 'Em revisão', 'Aprovada', 'Finalizada'
      ]
    },
    ESTUDIO_LITERARIO: {
      TIPO_CONTEUDO: [
        'Post', 'Carrossel', 'Reels', 'Vídeo', 'Áudio'
      ],
      PLATAFORMA: [
        'Instagram', 'YouTube', 'Outra'
      ],
      STATUS: [
        'Ideia', 'Em criação', 'Em revisão',
        'Aprovado', 'Publicado'
      ]
    },
    METAS: {
      STATUS: [
        'Não iniciada', 'Em andamento', 'Concluída', 'Cancelada'
      ]
    },
    CALENDARIO: {
      STATUS: [
        'Planejado', 'Concluído', 'Cancelado'
      ]
    }
  };

  Object.keys(opcoes).forEach(nomeAba => {
    const aba = ss.getSheetByName(nomeAba);
    const cabecalhos = aba
      .getRange(1, 1, 1, aba.getLastColumn())
      .getValues()[0];

    Object.keys(opcoes[nomeAba]).forEach(campo => {
      const indice = cabecalhos.indexOf(campo);

      if (indice === -1) return;

      const validacao = SpreadsheetApp
        .newDataValidation()
        .requireValueInList(opcoes[nomeAba][campo], true)
        .setAllowInvalid(false)
        .build();

      aba.getRange(2, indice + 1, 999, 1)
        .setDataValidation(validacao);
    });
  });
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💜 Verso & Prosa')
    .addItem('Criar estrutura do banco', 'criarVersoEProsa')
    .addItem('Cadastrar conta de acesso', 'abrirCadastroUsuariosVP')
    .addToUi();
}

// Abre um formulário com campo de senha mascarado. A senha nunca é gravada em texto puro.
function abrirCadastroUsuariosVP() {
  const html = HtmlService.createHtmlOutput(`
    <!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <style>
      body{font:14px Arial,sans-serif;background:#080808;color:#fff;padding:18px}
      h2{color:#d45aff;margin:0 0 8px}p{color:#c7bed0;line-height:1.4}
      label{display:block;margin:14px 0 6px}input{box-sizing:border-box;width:100%;padding:11px;border:1px solid #6e287f;border-radius:8px;background:#17121b;color:#fff}
      button{margin-top:18px;width:100%;padding:12px;border:0;border-radius:9px;background:#c000ff;color:#fff;font-weight:bold;cursor:pointer}
      #msg{margin-top:12px;white-space:pre-wrap}.hint{font-size:12px}
    </style></head><body>
      <h2>Nova conta do Verso &amp; Prosa</h2>
      <p>Cadastre uma conta para cada pessoa. Use um e-mail válido e uma senha exclusiva com pelo menos 10 caracteres.</p>
      <form id="f">
        <label>Nome</label><input name="nome" required maxlength="80" placeholder="Fernando ou Letícia">
        <label>E-mail</label><input name="email" type="email" required maxlength="180" placeholder="seuemail@exemplo.com">
        <label>Senha</label><input name="senha" type="password" required minlength="10" autocomplete="new-password">
        <label>Confirmar senha</label><input name="confirmacao" type="password" required minlength="10" autocomplete="new-password">
        <button id="btn">Criar conta</button>
      </form><div id="msg" role="status"></div>
      <script>
        const f=document.getElementById('f'),b=document.getElementById('btn'),m=document.getElementById('msg');
        f.addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));
          if(d.senha!==d.confirmacao){m.textContent='As senhas não coincidem.';return;}
          b.disabled=true;b.textContent='Criando...';m.textContent='';
          google.script.run.withSuccessHandler(r=>{m.textContent=r.message||'Conta criada.';f.reset();b.disabled=false;b.textContent='Criar conta';})
            .withFailureHandler(err=>{m.textContent=err.message||String(err);b.disabled=false;b.textContent='Criar conta';})
            .cadastrarUsuarioSeguroVP({nome:d.nome,email:d.email,senha:d.senha});
        });
      </script>
    </body></html>`).setWidth(420).setHeight(570);
  SpreadsheetApp.getUi().showModalDialog(html, 'Cadastrar conta');
}

function cadastrarUsuarioSeguroVP(dados) {
  const nome = String(dados && dados.nome || '').trim();
  const email = String(dados && dados.email || '').trim().toLowerCase();
  const senha = String(dados && dados.senha || '');
  if (!nome || nome.length > 80) throw new Error('Informe um nome válido.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) throw new Error('Informe um e-mail válido.');
  if (senha.length < 10 || senha.length > 200) throw new Error('A senha precisa ter entre 10 e 200 caracteres.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('USUARIOS');
  if (!aba) throw new Error('Execute primeiro “Criar estrutura do banco”.');
  const valores = aba.getDataRange().getValues();
  const cab = valores[0];
  const ixEmail = cab.indexOf('EMAIL');
  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][ixEmail] || '').toLowerCase() === email) throw new Error('Já existe uma conta com esse e-mail.');
  }
  const salt = Utilities.getUuid() + Utilities.getUuid();
  const registro = {
    ID_USUARIO: Utilities.getUuid(), NOME: nome, EMAIL: email,
    SALT: salt, SENHA_HASH: hashSenhaVP_(salt, senha), ATIVO: 'SIM',
    DATA_CADASTRO: new Date()
  };
  aba.appendRow(cab.map(k => registro[k] !== undefined ? registro[k] : ''));
  return { ok: true, message: 'Conta criada com sucesso para ' + nome + '. Você já pode entrar no aplicativo.' };
}

function hashSenhaVP_(salt, senha) {
  let valor = salt + ':' + senha;
  for (let i = 0; i < 1200; i++) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, valor, Utilities.Charset.UTF_8);
    valor = bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
  }
  return valor;
}

function chaveSegredoVP_() {
  const props = PropertiesService.getScriptProperties();
  let segredo = props.getProperty('VP_AUTH_SECRET');
  if (!segredo) {
    segredo = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('VP_AUTH_SECRET', segredo);
  }
  return segredo;
}

function base64WebVP_(valor) {
  return Utilities.base64EncodeWebSafe(valor).replace(/=+$/g, '');
}

function criarTokenVP_(usuario) {
  const carga = { uid: usuario.ID_USUARIO, nome: usuario.NOME, email: usuario.EMAIL, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 };
  const payload = base64WebVP_(JSON.stringify(carga));
  const assinatura = base64WebVP_(Utilities.computeHmacSha256Signature(payload, chaveSegredoVP_()));
  return payload + '.' + assinatura;
}

function validarTokenVP_(token) {
  const partes = String(token || '').split('.');
  if (partes.length !== 2) throw new Error('Sessão inválida. Entre novamente.');
  const esperado = base64WebVP_(Utilities.computeHmacSha256Signature(partes[0], chaveSegredoVP_()));
  if (esperado !== partes[1]) throw new Error('Sessão inválida. Entre novamente.');
  const carga = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString('UTF-8'));
  if (!carga.uid || !carga.exp || Date.now() > Number(carga.exp)) throw new Error('Sua sessão expirou. Entre novamente.');
  const usuario = buscarUsuarioPorIdVP_(carga.uid);
  if (!usuario || String(usuario.ATIVO).toUpperCase() !== 'SIM') throw new Error('Conta não encontrada ou desativada.');
  return { userId: usuario.ID_USUARIO, name: usuario.NOME, email: usuario.EMAIL };
}

function buscarUsuarioPorIdVP_(id) {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USUARIOS');
  if (!aba || aba.getLastRow() < 2) return null;
  const valores = aba.getDataRange().getValues(), cab = valores[0];
  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][cab.indexOf('ID_USUARIO')]) === String(id)) {
      const obj = {};
      cab.forEach((k, j) => obj[k] = valores[i][j]);
      return obj;
    }
  }
  return null;
}

function localizarUsuarioEmailVP_(email) {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USUARIOS');
  if (!aba || aba.getLastRow() < 2) return null;
  const valores = aba.getDataRange().getValues(), cab = valores[0], ix = cab.indexOf('EMAIL');
  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][ix] || '').toLowerCase() === String(email).toLowerCase()) {
      const obj = {};
      cab.forEach((k, j) => obj[k] = valores[i][j]);
      return obj;
    }
  }
  return null;
}

function jsonVP_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonVP_({ ok: true, app: 'Verso & Prosa API', version: '2.0', message: 'API disponível.' });
}

function respostaHtmlVP_(dados, requestId) {
  const envelope = JSON.stringify({ type: 'vp-api-response', requestId: String(requestId || ''), data: dados })
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>window.top.postMessage(' + envelope + ', "*");</script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function chaveTentativasLoginVP_(email) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(email).toLowerCase(), Utilities.Charset.UTF_8);
  const hash = bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
  return 'VP_LOGIN_' + hash;
}

function loginPermitidoVP_(email) {
  return Number(CacheService.getScriptCache().get(chaveTentativasLoginVP_(email)) || 0) < 5;
}

function registrarFalhaLoginVP_(email) {
  const cache = CacheService.getScriptCache();
  const chave = chaveTentativasLoginVP_(email);
  const tentativas = Number(cache.get(chave) || 0) + 1;
  cache.put(chave, String(tentativas), 900);
}

function limparFalhasLoginVP_(email) {
  CacheService.getScriptCache().remove(chaveTentativasLoginVP_(email));
}

function doPost(e) {
  const requestId = e && e.parameter && e.parameter.requestId || '';
  try {
    let req = {};
    if (e && e.parameter && e.parameter.payload) {
      req = JSON.parse(e.parameter.payload);
    } else {
      req = JSON.parse(e && e.postData && e.postData.contents || '{}');
    }
    const action = String(req.action || '');
    if (action === 'login') {
      const email = String(req.email || '').trim().toLowerCase();
      const senha = String(req.senha || '');
      if (!loginPermitidoVP_(email)) return respostaHtmlVP_({ ok: false, error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' }, requestId);
      const usuario = localizarUsuarioEmailVP_(email);
      if (!usuario || String(usuario.ATIVO).toUpperCase() !== 'SIM' || hashSenhaVP_(String(usuario.SALT), senha) !== String(usuario.SENHA_HASH)) {
        registrarFalhaLoginVP_(email);
        return respostaHtmlVP_({ ok: false, error: 'E-mail ou senha inválidos.' }, requestId);
      }
      limparFalhasLoginVP_(email);
      return respostaHtmlVP_({ ok: true, token: criarTokenVP_(usuario), user: { name: usuario.NOME, email: usuario.EMAIL } }, requestId);
    }

    const sessao = validarTokenVP_(req.token);
    if (action === 'getData') return respostaHtmlVP_({ ok: true, data: obterDadosUsuarioVP_(sessao.userId) }, requestId);
    if (action === 'saveBook') return respostaHtmlVP_({ ok: true, book: salvarLivroVP_(sessao.userId, req.book || {}) }, requestId);
    if (action === 'saveNote') return respostaHtmlVP_({ ok: true, note: salvarAnotacaoVP_(sessao.userId, req.note || {}) }, requestId);
    if (action === 'saveGoal') return respostaHtmlVP_({ ok: true, goal: salvarMetaVP_(sessao.userId, req.goal || {}) }, requestId);
    if (action === 'verify') return respostaHtmlVP_({ ok: true, user: { name: sessao.name, email: sessao.email } }, requestId);
    return respostaHtmlVP_({ ok: false, error: 'Ação não reconhecida.' }, requestId);
  } catch (err) {
    return respostaHtmlVP_({ ok: false, error: err && err.message ? err.message : 'Erro interno na API.' }, requestId);
  }
}

function abaVP_(nome) {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!aba) throw new Error('A aba ' + nome + ' não existe. Execute a criação da estrutura.');
  return aba;
}

function linhasDoUsuarioVP_(nomeAba, userId) {
  const aba = abaVP_(nomeAba);
  const dados = aba.getDataRange().getValues();
  if (dados.length < 2) return [];
  const cab = dados[0], ixUser = cab.indexOf('USUARIO_ID');
  if (ixUser < 0) throw new Error('A coluna de usuário não existe na aba ' + nomeAba + '. Execute novamente a criação da estrutura.');
  const saida = [];
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][ixUser]) !== String(userId)) continue;
    const obj = {};
    cab.forEach((k, j) => {
      let v = dados[i][j];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
      obj[k] = v;
    });
    saida.push(obj);
  }
  return saida;
}

function obterDadosUsuarioVP_(userId) {
  const livros = linhasDoUsuarioVP_('LIVROS', userId).map(r => ({
    id: r.ID_LIVRO, titulo: r.TITULO || '', autor: r.AUTOR || '', editora: r.EDITORA || '',
    genero: r.GENERO || '', paginas: r.PAGINAS || '', isbn: r.ISBN || '', capa: r.CAPA_URL || '',
    status: r.STATUS_LEITURA || 'Quero ler'
  }));
  const notas = linhasDoUsuarioVP_('ANOTACOES', userId).map(r => ({
    id: r.ID_ANOTACAO, book: r.TITULO || 'Anotação livre', text: r.CONTEUDO || '',
    date: r.DATA_CRIACAO ? String(r.DATA_CRIACAO).slice(0, 10).split('-').reverse().join('/') : ''
  }));
  const metas = linhasDoUsuarioVP_('METAS', userId);
  const meta = metas.find(r => r.ID_META === 'META_LEITURA_GERAL');
  return { books: livros, notes: notas, goal: meta ? { goal: meta.VALOR_OBJETIVO || '', book: meta.TITULO || '' } : null };
}

function salvarRegistroUsuarioVP_(nomeAba, idCampo, id, userId, registro) {
  const aba = abaVP_(nomeAba), valores = aba.getDataRange().getValues(), cab = valores[0];
  const ixId = cab.indexOf(idCampo), ixUser = cab.indexOf('USUARIO_ID');
  if (ixId < 0 || ixUser < 0) throw new Error('Estrutura inválida na aba ' + nomeAba + '.');
  const linha = cab.map(k => registro[k] !== undefined ? registro[k] : '');
  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][ixId]) === String(id) && String(valores[i][ixUser]) === String(userId)) {
      aba.getRange(i + 1, 1, 1, cab.length).setValues([linha]);
      return id;
    }
  }
  aba.appendRow(linha);
  return id;
}

function salvarLivroVP_(userId, b) {
  const id = String(b.id || Utilities.getUuid());
  const registro = {
    ID_LIVRO: id, TITULO: String(b.titulo || '').trim().slice(0, 250), AUTOR: String(b.autor || '').trim().slice(0, 180),
    EDITORA: String(b.editora || '').slice(0, 160), GENERO: String(b.genero || '').slice(0, 120),
    PAGINAS: b.paginas || '', ISBN: String(b.isbn || '').slice(0, 40), CAPA_URL: String(b.capa || '').slice(0, 1000),
    STATUS_LEITURA: String(b.status || 'Quero ler'), DATA_CADASTRO: new Date(), USUARIO_ID: userId
  };
  if (!registro.TITULO) throw new Error('Informe o título do livro.');
  salvarRegistroUsuarioVP_('LIVROS', 'ID_LIVRO', id, userId, registro);
  return { id: id, titulo: registro.TITULO, autor: registro.AUTOR, editora: registro.EDITORA, genero: registro.GENERO, paginas: registro.PAGINAS, isbn: registro.ISBN, capa: registro.CAPA_URL, status: registro.STATUS_LEITURA };
}

function salvarAnotacaoVP_(userId, n) {
  const id = String(n.id || Utilities.getUuid());
  const registro = {
    ID_ANOTACAO: id, ID_LIVRO: '', TITULO: String(n.book || 'Anotação livre').slice(0, 250),
    CONTEUDO: String(n.text || '').slice(0, 10000), PAGINA: '', CATEGORIA: 'Anotação',
    DATA_CRIACAO: new Date(), USUARIO_ID: userId
  };
  if (!registro.CONTEUDO.trim()) throw new Error('A anotação está vazia.');
  salvarRegistroUsuarioVP_('ANOTACOES', 'ID_ANOTACAO', id, userId, registro);
  return { id: id, book: registro.TITULO, text: registro.CONTEUDO, date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy') };
}

function salvarMetaVP_(userId, g) {
  const registro = {
    ID_META: 'META_LEITURA_GERAL', TITULO: String(g.book || '').slice(0, 250), TIPO: 'Planejamento geral',
    VALOR_OBJETIVO: String(g.goal || ''), VALOR_ATUAL: '', DATA_INICIO: new Date(), DATA_FIM: '',
    STATUS: 'Em andamento', USUARIO_ID: userId
  };
  salvarRegistroUsuarioVP_('METAS', 'ID_META', 'META_LEITURA_GERAL', userId, registro);
  return { goal: registro.VALOR_OBJETIVO, book: registro.TITULO };
}
