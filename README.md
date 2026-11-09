# Verso & Prosa — Biblioteca Clássica

Aplicativo PWA de biblioteca literária pessoal para dois perfis, com frontend no GitHub Pages e backend no Google Apps Script.

## Identidade visual desta versão

A interface foi redesenhada para transmitir a sensação de entrar em uma biblioteca clássica: madeira escura, couro, papel, tons de latão e tipografia editorial. A antiga aparência futurista/neon foi substituída por uma ambientação acolhedora de sala de leitura.

## Telas e interações

- Entrada com atmosfera de biblioteca.
- Salão principal com resumo do acervo e leitura atual.
- Minhas estantes, com volumes apoiados em prateleiras de madeira.
- Ficha individual do livro ao tocar/clicar em um exemplar.
- Cadastro de livros.
- Caderno de leitura e anotações.
- Descobertas e coleções literárias, com destaque para literatura russa.
- Ateliê literário.
- Agenda de leitura.
- Perfil e saída da conta.
- Layout adaptável para celular, tablet e computador.

## Arquivos do projeto

- `index.html`: estrutura das telas.
- `style.css`: identidade visual e responsividade.
- `app.js`: navegação, autenticação e integração com Apps Script.
- `manifest.json`: instalação PWA.
- `sw.js`: service worker com atualização network-first e suporte offline.
- `assets/`: logotipo e ícones do aplicativo.

## Publicação no GitHub Pages

Envie os arquivos e a pasta `assets` para a raiz do repositório, substituindo as versões anteriores. Mantenha o repositório configurado com GitHub Pages na branch `main` e pasta `/root`.

**Não publique `Code.gs` no GitHub.** O backend permanece no editor do Google Apps Script. A URL atualmente configurada no `app.js` deve corresponder à implantação ativa do projeto.

## Atualização PWA

O `sw.js` usa o cache `verso-prosa-biblioteca-v1`. Ao publicar uma nova versão, aumente o nome do cache para invalidar os arquivos antigos. O service worker busca primeiro a versão online e usa o cache como alternativa offline.

## Observação sobre autenticação e sincronização

Esta versão mantém as chamadas existentes do frontend para o Apps Script (`login`, `getData`, `saveBook`, `saveNote` e `saveGoal`). O redesenho visual não substitui a validação do backend. Antes de usar o acervo como armazenamento definitivo, teste o login e a gravação real na planilha com cada perfil.
