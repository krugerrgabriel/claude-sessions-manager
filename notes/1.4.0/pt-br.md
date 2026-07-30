## 📋 Escolha como copiar, e atualize sem o terminal

O botão de copiar deixou de presumir que você quer um comando de shell, e o
botão de atualizar deixou de só entregar um comando para colar.

### Novidades

#### 📋 Seletor de formato de cópia

Um seletor novo no header decide o que o botão de copiar coloca no seu
clipboard. Três opções, e a escolha fica salva:

- **Comando de terminal** coloca `claude --resume <id>`, para colar num shell
  com o Claude Code fechado.
- **Comando dentro do Claude** coloca `/resume <id>`, para colar num Claude Code
  que já está aberto.
- **Perguntar sempre** abre um seletor a cada cópia, mostrando o comando real
  daquela sessão.

O padrão é o comando de terminal, então nada muda até você decidir o contrário.

#### ⚡ Atualização com um clique

O botão de atualizar agora aplica a atualização, em vez de copiar um comando.
Você clica, ele puxa, troca os arquivos e a página recarrega na versão nova.
Sem terminal, sem `sudo`.

Quando uma versão mexe no próprio `install.sh`, a configuração do Apache pode
ter mudado junto, e isso exige root. A atualização então para e um modal explica
o que aconteceu, com o comando pronto para copiar. O mesmo modal aparece se o
seu clone tiver alterações não commitadas, porque suas edições nunca são
descartadas.

#### 🔒 Só em localhost

**O dashboard estava acessível pela sua rede local, sem autenticação nenhuma.**
Qualquer pessoa no mesmo Wi-Fi conseguia ler o nome, o preview, o caminho e a
branch de todas as suas sessões, e apagar arquivos de sessão. Agora ele serve
apenas em localhost. **É rodar o instalador que aplica isso.**

### 🐛 Correções

- **Mover uma sessão entre projetos podia perdê-la.** O Claude Code transforma
  todo caractere não alfanumérico do caminho em traço, não só os separadores, e
  o backend trocava apenas os separadores. Sessões movidas para um projeto cujo
  caminho tem `_`, `.`, espaço ou acento ficavam impossíveis de retomar.
- **Um `metadata.json` corrompido apagava silenciosamente todos os nomes,
  anotações e favoritos.** A API agora recusa a escrita e avisa, deixando o
  arquivo intacto.
- **Nome de projeto com caractere de regex deixava a tela em branco.**
- **Os cards pulavam ao copiar**, porque o id da sessão sumia nesse estado.

### ✨ Acabamento

- **Dropdowns próprios** no lugar dos selects nativos de formato de cópia,
  ordenação e idioma, com suporte completo de teclado e largura constante.
- **O `backdrop-filter` saiu.** Ele repintava o header fixo a cada quadro de
  scroll por um blur que ninguém pediu.
- **O id da sessão aparece inteiro**, em vez de 8 caracteres fixos.
- **Documentação atualizada nos 7 idiomas.**
