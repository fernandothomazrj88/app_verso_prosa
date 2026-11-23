# Versos & Narrativas — Biblioteca Literária

Pacote de atualização de identidade da versão funcional do aplicativo. A estética clássica, os módulos, a navegação, os perfis e as integrações existentes foram preservados.

## Aplicar a atualização do frontend
1. Faça backup do repositório GitHub antes de substituir qualquer arquivo.
2. Neste pacote, abra a pasta `frontend/` e copie **todo o conteúdo dela** para a raiz do repositório GitHub atual, preservando a estrutura de pastas.
3. Substitua os arquivos com os mesmos caminhos e inclua os três novos arquivos em `assets/brand/`.
4. Remova os arquivos de marca antigos listados em `REMOVER-ARQUIVOS-ANTIGOS.txt` depois de confirmar que as referências novas estão no lugar.
5. Aguarde o GitHub Pages publicar e faça uma atualização forçada com Ctrl+Shift+R.

## Atualizar o Google Apps Script (fora do GitHub)
O arquivo `backend-apps-script/Code.gs`, que fica ao lado da pasta `frontend/` na raiz do ZIP, é a cópia atualizada do código que foi enviado para esta conversa. Ele mantém o mesmo ID da planilha, abas, perfis, hashing de senhas, sessões, funções da API e o tipo de resposta `vp-api-response`, que o frontend já espera.

1. Abra o projeto atual do Apps Script e faça uma cópia de segurança do conteúdo de `Código.gs`.
2. Abra `backend-apps-script/Code.gs` na raiz do pacote, copie todo o conteúdo e substitua o conteúdo de `Código.gs` no editor do Apps Script.
3. Salve. Não execute a rotina de inicialização apenas por causa da troca de nome: o banco já está criado. A função antiga continua disponível por compatibilidade e existe uma nova função de inicialização com o nome atualizado.
4. Em **Implantar → Gerenciar implantações**, edite a implantação atual, escolha **Nova versão** e implante. Preserve **Executar como: Eu** e **Quem pode acessar: Qualquer pessoa**.
5. A URL da implantação e o ID da planilha devem permanecer os mesmos.

## O que foi preservado
- IDs e URLs de GitHub Pages e do Apps Script.
- ID da planilha e nomes/cabeçalhos das abas.
- Contas, e-mails, senhas, perfis e sessões existentes.
- Formato da API e tipo `vp-api-response` que o frontend escuta.
- Layout e comportamento dos módulos, navegação e funcionalidades.

## Limites desta atualização
As artes de abertura e login aprovadas incluem o nome antigo incorporado no próprio arquivo de imagem. Nesta atualização, uma camada de marca em HTML/CSS cobre a assinatura antiga e exibe o novo nome sem modificar as imagens de cenário. Confira visualmente essas duas telas em desktop e celular antes de publicar para todos.
