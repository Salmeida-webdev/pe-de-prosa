# Pé de Prosa

Portal editorial desenvolvido com Nuxt 4, Cloudflare Workers e Cloudflare D1. A experiência pública é renderizada no servidor e consulta o acervo e as configurações do portal pela API. O painel administrativo permite editar publicações, editorias, perfis de autoria, páginas institucionais e identidade visual.

## O portal

- Página inicial editorial com matéria principal, destaques, editorias e acervo recente.
- Busca, paginação, matérias, assuntos, editorias e perfis de autoria.
- Layout responsivo com fotografias editoriais, tipografia de publicação e navegação acessível.
- Metadados por conteúdo, sitemap, RSS, robots.txt e cabeçalhos de segurança.
- Painel em `/painel`, com autenticação administrativa, limite de tentativas e sessão assinada de oito horas.
- Conteúdo e configurações públicos lidos da API em tempo de execução, para que mudanças no D1 apareçam no portal sem reconstruir o front-end.

O acervo inicial é composto por textos editoriais do projeto e autores fictícios. Eles não devem ser apresentados como reportagens apuradas ou assinadas por pessoas reais. A identidade visual e o painel podem ser usados como base para uma publicação em operação, com revisão editorial e substituição dos dados fictícios.

## Requisitos

- Node.js 22.12 ou superior e npm.
- Cloudflare D1 e Workers para a API e o painel de produção.
- Netlify para executar o Nuxt SSR; a publicação precisa compilar a partir do repositório para incluir as funções Nitro.

## Desenvolvimento local

```bash
npm install
npm run db:local
npm run db:seed:local
npm run dev:api
```

Em outro terminal:

```bash
npm run dev
```

Abra `http://localhost:3000`. Para a API local, o arquivo `.dev.vars` deve conter segredos de demonstração locais. Não reutilize esses valores na produção nem os envie ao Git.

A antiga rota `/redacao` permanece como demonstração local do fluxo editorial. O painel administrativo de produção fica em `/painel` e usa credenciais separadas.

## Publicação da API e do painel

1. Crie ou confirme o banco D1 `pe-de-prosa` e o binding `DB` do Worker `pedeprosa-api`.
2. Aplique em sequência `cloudflare/migrations/0001_schema.sql`, `0002_portal_cms.sql` e `0003_editorial_expansion.sql`. A migration 0003 adiciona 12 textos editoriais e ajusta descrições de imagem antigas. Ela usa `INSERT OR IGNORE`, portanto pode ser reaplicada sem duplicar os novos registros.
3. Configure no Worker, como secrets/variáveis de ambiente, `ADMIN_ENABLED=true`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME` e `DEMO_SECRET`. Use uma senha forte e um segredo aleatório longo. Nunca grave esses valores no repositório.
4. Mantenha `EDITORIAL_DEMO=false` na API pública. A demonstração da rota `/redacao` não deve ser habilitada em produção.
5. Configure a origem do site em `cloudflare/worker.mjs` se o domínio público mudar. A API aceita chamadas do domínio Netlify atual e do ambiente local.
6. Configure `NUXT_PUBLIC_API_BASE=https://pedeprosa-api.dona-de-ouro-demo.workers.dev/api` na Netlify.
7. Conecte o repositório à Netlify e use `npm run build`. O módulo Nuxt da Netlify configura as funções Nitro necessárias para SSR e rotas de servidor.
8. Acesse `/painel` e entre com as credenciais administrativas configuradas no Worker.

## Imagens de capa

O painel aceita imagens por URL HTTPS. Também reconhece caminhos em `/uploads/`, mas o armazenamento e o envio de arquivos ainda dependem da configuração de um bucket de objetos e da rota de upload. Até essa etapa, use URLs HTTPS de imagens que você tenha direito de publicar.

## Comandos úteis

```bash
npm run build                    # compila a aplicação Nuxt SSR
npm run preview                  # abre a compilação local
npm run typecheck                # verifica tipos Vue e TypeScript
npm run db:generate:expansion    # regenera a migration do acervo adicional
npm run dev:api                  # inicia Worker e D1 locais
npm run db:local                 # cria o schema local
npm run db:seed:local            # recarrega a demonstração local
```

## Estrutura

```text
app.vue                    casca do portal e configurações de tema
assets/css/main.css        identidade visual e estilos responsivos
components/                cabeçalho, rodapé e componentes editoriais
composables/               dados e acesso à API
pages/                     páginas públicas, painel e demonstração local
cloudflare/migrations/     schema e mudanças versionadas do D1
cloudflare/worker.mjs      API pública e rotas administrativas
server/plugins/            cabeçalhos CSP e segurança para SSR
server/routes/             sitemap, RSS e robots.txt
scripts/                   geração dos dados e migrations
```
