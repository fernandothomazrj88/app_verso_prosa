# Versos & Narrativas — Biblioteca Literária

Pacote de frontend construído sobre o mockup enviado por Fernando. As imagens de cenário foram recortadas da prancha visual aprovada e incluídas localmente em `assets/scenes`; não há dependência de imagens externas.

## Atualização
1. Faça backup do repositório GitHub.
2. Extraia o ZIP e abra `app_verso_prosa-main`.
3. Envie o conteúdo dessa pasta para a raiz do repositório `app_verso_prosa`, substituindo os arquivos correspondentes.
4. Mantenha a pasta `assets` completa.
5. Não envie `Code.gs` ao GitHub: o Apps Script permanece no projeto Google.
6. Aguarde o Pages publicar e atualize com Ctrl+Shift+R.

## Preservação funcional
`app.js` foi mantido sem alterações; URL do Apps Script, fluxo de login, dados, formulários e sincronização permanecem como na versão funcional anterior. `sw.js`, manifest, ícones e CSS foram atualizados.

## Nota sobre a referência
Os cenários são recortes de ambiente da imagem de referência do usuário, usados como fundos decorativos. Capas cadastradas e componentes interativos continuam sendo HTML real e clicável.


## Login v3 (11/11/2026)
A tela de login foi reconstruída com HTML e CSS. O arquivo de mockup completo não é mais usado como interface. Marca, campos, ícones, botão, ornamentos e moldura são componentes independentes; a imagem `assets/scenes/lamp-books.webp` é usada apenas como detalhe decorativo inferior. A autenticação e a chamada atual ao Apps Script foram preservadas.

## Ajustes de identidade visual — Versos & Narrativas (v66)
- As telas de abertura e login usam as artes atualizadas com o nome **Versos & Narrativas**.
- A assinatura da Home foi refeita como texto real em tipografia serifada Georgia, mantendo a proporção clássica do nome e sem comprimir o título para caber.
- Os cards aprovados de Fernando e Letícia são usados diretamente em `assets/profiles/home-card-fernando-approved.png` e `assets/profiles/home-card-leticia-approved.png`.
- O card muda automaticamente conforme o perfil autenticado; os textos permanecem como conteúdo real do aplicativo.
- O cache do aplicativo foi atualizado para v66 para evitar que o navegador reutilize a versão visual anterior.

**Publicação:** envie a pasta `app_verso_prosa-main` completa para a raiz do repositório do GitHub Pages, mantendo todas as subpastas de `assets` e `modules`. Depois da publicação, faça uma atualização forçada com `Ctrl+Shift+R`. Caso o nome antigo continue apenas no atalho instalado como aplicativo do Windows, remova o atalho antigo e instale novamente pelo site atualizado.


## Ajuste de boas-vindas nos dois perfis (v67)

- O texto de Fernando e Letícia foi reposicionado e dimensionado para permanecer dentro da área interna do círculo bordô dos respectivos cards aprovados.
- As duas artes, os módulos, o backend, as credenciais e as demais telas foram preservados.
- O cache e a referência da folha de estilos foram atualizados para v67.


## Padronização dos cards de boas-vindas (v68)

- Fernando e Letícia usam a mesma escala tipográfica, a mesma estrutura de texto e os mesmos dois ornamentos dourados.
- O texto ocupa uma área proporcional ao círculo, com altura automática para evitar cortes na saudação ou na mensagem.
- A arte da Letícia foi recomposta com o medalhão bordô ligeiramente menor e deslocado para a direita, criando espaço visível entre a personagem e o círculo.
- O cache do aplicativo e a referência da folha de estilos foram atualizados para v68.


## Padrão final dos cards de boas-vindas (v70)

- Os medalhões/círculos bordô foram removidos das duas composições.
- A leitura recebe apenas sombra tipográfica suave para contraste, sem placa ou fundo circular atrás do texto.
- Fernando e Letícia usam a mesma escala de fonte, alinhamento, espaçamento e ornamentos dourados; a composição é espelhada para manter a personagem no lado oposto ao texto.
- Os retratos foram recortados das artes aprovadas para preservar as personagens originais sem o medalhão.
- O cache do aplicativo foi atualizado para v70.
