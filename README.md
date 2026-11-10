# Verso & Prosa — Biblioteca Imersiva v3.1

Esta versão aproxima a aplicação do mockup aprovado: biblioteca clássica europeia, cenários fotográficos, madeira escura, couro bordô, iluminação quente, latão e tipografia editorial.

## Conteúdo do pacote
- `index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`
- `assets/brand/`: emblema dourado e logo vetorial
- `assets/icons/`: ícones PWA 192/512, maskable e Apple Touch Icon
- `assets/logo-livro-pena.png`: emblema dourado em PNG

## Atualização do GitHub Pages
1. Faça backup do repositório antes de substituir os arquivos.
2. Extraia o ZIP e abra a pasta `app_verso_prosa-main`.
3. Envie o conteúdo dessa pasta para a raiz do repositório `app_verso_prosa`, substituindo os arquivos correspondentes.
4. Mantenha a pasta `assets` completa.
5. **Não envie `Code.gs` ao GitHub**; o backend continua no Apps Script.
6. Aguarde o GitHub Pages publicar e atualize o site com `Ctrl + Shift + R`.

## Dados e integração
- A URL atual do Apps Script foi preservada no `app.js`.
- O fluxo de login, carregamento e gravação continua usando as ações existentes (`login`, `getData`, `saveBook`, `saveNote`, `saveGoal`).
- A rotina de migração local v2 foi preservada; ela mantém cópias locais enquanto tenta importar os dados para a conta autenticada.
- Esta entrega altera a camada visual e o cache do frontend. **Ela não corrige nem garante a correção de problemas de autenticação ou sincronização do backend.**

## Imagem de ambiente
A fotografia de biblioteca usada como cenário está hospedada pelo PAKUTASO e é carregada pela URL abaixo; o service worker tenta guardá-la em cache após a primeira visita online:

- `https://download.pakutaso.com/shared/img/thumb/AI5178150_TP_V.jpg`
- Página do material: `https://www.pakutaso.com/en/20250524131post-43749.html`
- O material é indicado pelo próprio PAKUTASO como gratuito para uso comercial e não comercial, sem cadastro. Consulte os termos do site para condições completas.

A aplicação mantém fundos em cores escuras como alternativa visual caso a imagem externa não carregue.
