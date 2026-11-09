# Verso & Prosa — Sincronização inicial (v4)

Esta versão conecta login, estante, anotações e planejamento ao Google Sheets por meio do Google Apps Script. Os dados de Fernando e Letícia são separados por `USUARIO_ID`. O ícone PWA e o layout responsivo foram preservados.

## 1. Atualizar o Apps Script
1. Abra a planilha “Verso & Prosa — Banco de Dados” e vá em **Extensões > Apps Script**.
2. Substitua o conteúdo de `Code.gs` pelo arquivo deste pacote.
3. Salve e execute `criarVersoEProsa` uma vez, autorizando as permissões solicitadas. Isso cria a aba `USUARIOS` e adiciona a coluna `USUARIO_ID` às abas de dados sem apagar os registros existentes.
4. Recarregue a planilha. No menu **💜 Verso & Prosa**, escolha **Cadastrar conta de acesso**. Cadastre uma conta para Fernando e outra para Letícia, cada uma com seu próprio e-mail e senha exclusiva de pelo menos 10 caracteres.
5. No Apps Script, abra **Implantar > Gerenciar implantações**. Edite a implantação do Aplicativo da web para executar como você (proprietário) e permitir acesso a qualquer pessoa. Implante uma nova versão.
6. Confirme que a URL da implantação é a mesma definida em `API_URL` no `app.js`. Se for diferente, atualize a constante e publique o GitHub novamente.

## 2. Atualizar o GitHub Pages
Envie para a raiz do repositório os arquivos `index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`, `Code.gs`, `README.md` e a pasta `assets` deste pacote, substituindo os correspondentes. Aguarde a publicação do GitHub Pages.

## 3. Testar
Abra o app, entre com a conta do Fernando e cadastre um livro e uma anotação. Saia, entre com a conta da Letícia e confirme que a estante dela fica separada. O token de sessão é armazenado no dispositivo; as senhas são armazenadas apenas como hashes com salt na aba `USUARIOS`.

## Segurança e observações
- Não compartilhe a planilha publicamente. O Apps Script executa como proprietário e valida as credenciais antes de ler ou gravar dados.
- O endpoint do Web App é público por natureza; nunca coloque senhas no `app.js`. A comunicação usa formulário oculto + `postMessage` para não depender de CORS no navegador.
- A autenticação desta primeira integração usa e-mail/senha próprios e tokens assinados com validade de 30 dias. Recuperação de senha, edição/exclusão de livros, upload de capas e resenhas longas no Google Docs ainda serão etapas seguintes.
- Os dados antigos que ficaram no armazenamento local do navegador não são apagados automaticamente. Esta versão começa a sincronização na nuvem a partir do login.
- O `sw.js` teve a versão de cache atualizada.
