# Verso & Prosa — Biblioteca Imersiva v2.0

Pacote de frontend baseado no mockup aprovado: biblioteca clássica europeia, imersiva, com madeira escura, couro bordô, latão e papel pergaminho.

## Conteúdo
- `index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`
- `assets/brand/`: emblema dourado e logo vetorial
- `assets/icons/`: ícones PWA 192/512, maskable e Apple Touch Icon
- `assets/logo-livro-pena.png`: emblema dourado em PNG para a interface

## Publicação no GitHub Pages
1. Faça backup do repositório atual.
2. Extraia o ZIP e abra a pasta `app_verso_prosa-main`.
3. Envie o conteúdo dessa pasta para a raiz do repositório `app_verso_prosa`, substituindo os arquivos correspondentes.
4. Mantenha a pasta `assets` completa.
5. Não envie `Code.gs` ao GitHub; o backend continua no Apps Script.
6. Aguarde o GitHub Pages publicar e atualize o site com `Ctrl + Shift + R`.

## Dados e integração
- A URL atual do Apps Script foi preservada no `app.js`.
- O fluxo de login, carregamento e gravação continua usando as ações existentes (`login`, `getData`, `saveBook`, `saveNote`, `saveGoal`).
- A migração local v2 tenta importar os registros locais antigos após autenticação e mantém a cópia local intacta.
- Esta entrega é uma atualização visual e de frontend/cache. Ela não altera nem garante a correção de problemas de autenticação no backend.

## Observação
O ícone instalado pelo Android pode exigir reinstalação para refletir a arte nova; o cache do site será renovado pelo novo `sw.js`.
