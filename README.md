# Pé de Prosa

Portal editorial demonstrativo feito com Nuxt 4, TypeScript, Cloudflare D1 e Cloudflare Workers. O site público apresenta o acervo em modo de leitura; a área editorial completa é habilitada somente na execução local.

## O que está incluído

- Página inicial editorial, editorias, busca textual, assuntos, paginação, perfis de autoria e páginas de artigos.
- 42 textos de autoria fictícia distribuídos por seis editorias, com 37 no catálogo público e exemplos de pauta em diferentes estados editoriais.
- Área local de redação com perfis de autor, revisor e editor, histórico de eventos, edição de rascunhos, revisão, publicação e arquivamento.
- API em Cloudflare Worker com Cloudflare D1; a API pública permite somente leitura quando o painel editorial está desativado.
- Sitemap, RSS, robots.txt, metadados por página, URLs legíveis, controles de cache e política de segurança de conteúdo.
- Ilustrações editoriais em PNG com fundo transparente, layout responsivo e suporte a teclado.

Este repositório é um **projeto de portfólio demonstrativo**. O nome, os autores e o conteúdo são fictícios; não representam uma redação em operação, apuração real ou resultados comerciais.

## Requisitos

- Node.js 22.12 ou superior.
- npm.
- Para executar a API local: Wrangler e SQLite local, instalados pelas dependências do projeto.
- Para publicar a API: uma conta Cloudflare com acesso a D1 e Workers. Para hospedar o site: a conta Netlify conectada ao repositório.

## Iniciar a demonstração local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env`. O exemplo aponta para o Worker local e habilita a área editorial local.

   Antes de iniciar o Worker, crie `.dev.vars` na raiz com os valores locais de `DEMO_SECRET`, `AUTHOR_PASSWORD`, `REVIEWER_PASSWORD` e `EDITOR_PASSWORD`. Use valores aleatórios próprios. Esse arquivo fica fora do Git; não publique nem reutilize esses segredos em produção.

3. Crie o banco local e carregue os dados de exemplo:

   ```bash
   npm run db:local
   npm run db:seed:local
   ```

   `db:seed:local` recria `cloudflare/demo-seed.sql` e substitui o conteúdo do banco local pelos dados fictícios do repositório.

4. Em um terminal, inicie a API local:

   ```bash
   npm run dev:api
   ```

5. Em outro terminal, inicie o portal:

   ```bash
   npm run dev
   ```

   Abra `http://localhost:3000`.

### Acessos editoriais locais

Use os nomes de usuário abaixo com as senhas locais definidas em `.dev.vars`:

| Usuário | Papel | Permissões demonstradas |
| --- | --- | --- |
| `autor` | Autor | Criar, editar e enviar os próprios rascunhos para revisão |
| `revisor` | Revisor | Aprovar ou devolver textos em revisão |
| `editor` | Editor | Publicar textos aprovados e arquivar textos publicados |

As contas são fictícias e servem apenas para a demonstração local. As senhas não são armazenadas no código nem no repositório.

## Restaurar o banco local

Para repor schema e conteúdo de exemplo, pare o Wrangler local, remova o banco local criado em `.wrangler/state/v3/d1/` e execute novamente:

```bash
npm run db:local
npm run db:seed:local
```

O banco local é separado da conta Cloudflare. Esses comandos não apagam nem alteram bancos remotos.

## Configuração remota

1. Crie um banco D1 chamado `pe-de-prosa` e aplique a migration de schema `cloudflare/migrations/0001_schema.sql`.
2. Gere `cloudflare/demo-seed.sql` com `node scripts/seed-data.mjs` e aplique a carga inicial uma única vez. A carga de demonstração fica fora da pasta de migrations para não ser reaplicada como uma mudança de schema.
3. Configure o binding D1 `DB` no Worker `pedeprosa-api` e publique `cloudflare/worker.mjs`.
4. Mantenha `EDITORIAL_DEMO=false` no Worker público. O código do painel local não recebe uma sessão editorial e a API não expõe rotas de edição.
5. Configure `NUXT_PUBLIC_API_BASE` na Netlify com a URL HTTPS do Worker terminada em `/api`. Essa variável permite que a renderização do portal use o D1 e que o navegador leia a API pública.
6. O `netlify.toml` já permite a origem `https://pedeprosa-api.dona-de-ouro-demo.workers.dev` em `connect-src`; mantenha-a alinhada ao subdomínio ativo do Worker.
7. Conecte o repositório à Netlify com `npm run build` e diretório publicado `dist`, definindo `NUXT_PUBLIC_API_BASE=https://pedeprosa-api.dona-de-ouro-demo.workers.dev/api` e `NUXT_PUBLIC_EDITORIAL_DEMO=false`.

O domínio público pretendido é `https://pedeprosa.netlify.app`. O painel editorial completo não é publicado. A publicação inicial deve ser feita somente depois de o código, a API, o binding e as variáveis de produção estarem configurados.

## Comandos úteis

```bash
npm run build       # compila o portal
npm run typecheck   # verifica os tipos Vue e TypeScript
npm run preview     # visualiza a compilação local
npm run dev:api     # inicia o Worker e o D1 locais
npm run db:local    # cria o schema local
npm run db:seed:local # recria os dados fictícios locais
```

## Estrutura

```text
app.vue                    casca da publicação
assets/css/main.css        identidade visual e estilos responsivos
components/                cabeçalho, rodapé, cartões e paginação
data/                      conteúdo fictício e catálogo editorial
pages/                     páginas públicas e redação local
cloudflare/migrations/     alterações versionadas do schema D1
cloudflare/demo-seed.sql   carga restaurável de conteúdo fictício
cloudflare/worker.mjs      API de leitura e fluxo editorial local
server/routes/             sitemap e feed RSS
scripts/                   geração restaurável dos dados SQL
```
