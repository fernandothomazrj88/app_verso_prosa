
const VP_CONFIG = {
  preto: '#080808',
  preto2: '#15121A',
  roxo: '#C000FF',
  roxoEscuro: '#6500A8',
  branco: '#FFFFFF',
  cinza: '#BDB5C7'
};

const VP_ABAS = {
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
    .addToUi();
}

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Verso & Prosa')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
