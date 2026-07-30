## ✨ O que mudou, sem sair do dashboard

Até agora, as notas de cada versão só podiam ser lidas no GitHub. Elas estão na
barra lateral agora, no seu idioma.

### Novidades

#### 📖 Botão de novidades

Um botão no rodapé da barra lateral abre as notas da versão que você tem
instalada. O texto vem junto com o app, um arquivo por idioma, então ele chega
no idioma que você escolheu e funciona sem rede nenhuma.

O botão se anuncia na primeira vez que você abre o dashboard depois de
atualizar, fica mais discreto no refresh seguinte e volta ao normal assim que
você lê.

### 🐛 Correções

- **Atualizar podia deixar o dashboard sem estilo.** O navegador continuava
  usando o CSS da versão anterior, e só um refresh forçado trazia o novo. A
  atualização agora carimba o estilo e o script com o número da versão, que é um
  endereço que nenhum cache jamais viu.

### ✨ Acabamento

- **A atualização pede o terminal com menos frequência.** Antes ela parava a
  qualquer mudança no `install.sh`, inclusive nas que só copiam arquivos. Agora
  ela para apenas quando a configuração do Apache mudou, que é a parte que
  realmente exige root.
- **As notas de versão viajam junto com a atualização**, então as notas da
  próxima versão já estão em disco quando você for ler.
