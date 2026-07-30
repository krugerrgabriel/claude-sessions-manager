## 🔄 Uma atualização que parece atualizada

A versão anterior impediu que o dashboard voltasse com arquivos antigos depois
que você clica em atualizar. Esta fecha o outro caminho, e dá a uma instalação
nova as próprias notas.

### 🐛 Correções

- **O dashboard ainda podia subir com o estilo da versão anterior.** Clicar em
  atualizar recarrega a página, e isso bastava. Atualizar pelo terminal e
  simplesmente voltar para a aba não bastava: nada revalidava, e o navegador
  entregava o que já tinha, que é como uma versão nova aparece sem estilo
  nenhum. O Apache agora marca o `index.html` e os dicionários de idioma como
  precisando revalidar, e o estilo e o script carregam a versão no endereço,
  então uma atualização nunca fica metade velha e metade nova.

### ✨ Acabamento

- **Uma instalação nova já vem com as notas de versão.** O botão de novidades
  lê elas do disco, no idioma que você escolheu, em vez de cair no inglês
  vindo do GitHub.
- **O instalador habilita o `mod_headers`**, e a configuração continua
  funcionando sem ele, só que sem revalidação.
