# Verso & Prosa — atualização de cache e migração local (v5)

Este pacote atualiza somente o frontend do GitHub Pages. O `Code.gs` permanece no projeto do Google Apps Script; **não publique `Code.gs` no repositório público**. A implantação do Apps Script deve continuar usando o mesmo endereço já configurado no `app.js`.

## O que esta versão corrige
- Atualiza o service worker para `verso-prosa-app-v5-sync`.
- Usa rede primeiro para `index.html`, `app.js` e `style.css`, com cache como alternativa offline.
- Solicita atualização do service worker ao abrir o app e recarrega a página quando a nova versão assume o controle.
- Carrega `app.js` com versão explícita para evitar reaproveitamento do arquivo antigo.
- Após autenticação, tenta importar livros, anotações e meta que ainda estejam no armazenamento local antigo (`vp_fernando_*` / `vp_letícia_*`) para a conta correspondente.
- Mantém a cópia local e cria IDs estáveis antes do envio, para que uma repetição não crie cópias duplicadas.

## Como publicar
1. Extraia este ZIP.
2. Envie para a raiz do repositório GitHub os arquivos `index.html`, `app.js`, `sw.js` e `README.md`, substituindo os existentes.
3. Não envie `Code.gs` ao GitHub. Não altere `manifest.json`, `style.css` nem os ícones nesta atualização.
4. Aguarde o GitHub Pages concluir a publicação.
5. Abra o app conectado à internet. O novo service worker deverá atualizar os arquivos e recarregar a página uma vez.
6. Entre novamente com a conta do Fernando. Observe a mensagem de importação dos dados locais, se houver.
7. Confira a aba `LIVROS` na planilha e confirme que os registros aparecem com `USUARIO_ID`. Depois repita com a conta da Letícia.

## Importante
- Não desinstale o PWA e não limpe os dados do navegador nesta etapa.
- A migração não apaga os dados locais antigos.
- A sincronização depende de a implantação atual do Apps Script continuar acessível, executando como o proprietário e configurada para aceitar chamadas públicas com autenticação por conta.
- Caso apareça erro de API, registre a mensagem exata e pare o teste; não repita vários cadastros.
