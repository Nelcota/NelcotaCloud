# @nelcota/cli

Linha de comando para projetos NelcotaCloud: migrações SQL versionadas no git, tipos TypeScript
do banco, conexão direta ao Postgres e um ambiente local completo com Docker.

## Instalação

```sh
npm i -D @nelcota/cli
npx nelcota --help
```

Requer Node 22 ou mais novo. Os comandos `dev` precisam do Docker com o plugin `compose`.

## Projeto de destino

Os comandos que falam com a API usam a chave secreta do projeto (Chaves de API, no console):

```sh
export NELCOTA_SECRET_KEY=nc_sk_...
export NELCOTA_API_URL=https://api.exemplo.com   # padrão: http://localhost:8080
```

- `--api-url <url>` substitui `NELCOTA_API_URL`.
- `--local` usa o projeto criado por `nelcota dev start` (lido de `.nelcota/dev/project.json`).

A CLI nunca grava nem mostra a chave secreta de `NELCOTA_SECRET_KEY`. A pasta do projeto é a
mais próxima, subindo a partir da pasta atual, que contém `nelcota/`.

## Comandos

### `nelcota init`

Cria `nelcota/migrations/` (com um `.gitkeep`) e acrescenta `.nelcota/` ao `.gitignore` mais
próximo (cria o arquivo se não houver). Pode rodar de novo sem efeito.

### `nelcota migrations new <nome>`

Cria `nelcota/migrations/<versão>_<nome>.sql`, com a versão no horário UTC
(`AAAAMMDDHHMMSS`). O nome aceita de 1 a 100 caracteres entre `a-z`, `0-9`, `_` e `-`.

### `nelcota migrations list`

Mostra cada versão, local ou do servidor: `aplicada`, `pendente`, `só no servidor` ou
`versão com outro nome no servidor`.

### `nelcota migrations push [--dry-run]`

Aplica as migrações pendentes da mais antiga para a mais nova, enviando o arquivo exatamente
como está. Recusa antes de aplicar qualquer uma se o servidor tiver uma versão que falta aqui
ou a mesma versão com outro nome. Para no primeiro erro da API e o mostra. `--dry-run` só
lista o que seria aplicado.

### `nelcota gen types [--output <arquivo>]`

Mostra os tipos TypeScript das tabelas do projeto, ou os grava no arquivo (criando as pastas).

### `nelcota db url`

Mostra o endereço de conexão direta ao Postgres com `[SENHA]` no lugar da senha, ou avisa
que o servidor não aceita conexões diretas.

### `nelcota db reset-password [--yes]`

Gera uma nova senha de conexão direta e mostra o endereço completo uma única vez; a senha
anterior para de funcionar. Pede confirmação; `--yes` pula a pergunta (obrigatório sem
terminal interativo, como em CI).

### `nelcota dev start [--slug <slug>] [--site-url <url>]`

Sobe Postgres 19, Mailpit e a API (`ghcr.io/nelcota/nelcota-api:latest`, ou a imagem de
`NELCOTA_DEV_API_IMAGE`) com o Docker, publicados só em `127.0.0.1`:

| Serviço       | Porta   |
| ------------- | ------- |
| API           | `54320` |
| Postgres      | `54322` |
| Mailpit (web) | `54324` |

Na primeira vez grava `.nelcota/dev/.env` com segredos novos (as portas podem ser trocadas
ali) e, depois que a API responde, cria o projeto local. O slug vem de `--slug` ou do nome da
pasta; o site, de `--site-url` (padrão `http://localhost:5173`). Mostra o endereço da API, a
chave publicável e o Mailpit, onde chegam os e-mails de verificação e login. Use `--local`
nos outros comandos para falar com esse projeto:

```sh
nelcota dev start
nelcota migrations push --local
nelcota gen types --local --output src/database.ts
```

### `nelcota dev stop [--reset]`

Para os containers e mantém os dados. `--reset` apaga também o banco local e o projeto; o
próximo `dev start` cria um projeto novo.

### `nelcota dev status`

Mostra o estado dos containers.

## Desenvolvimento

`npm install`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`,
`npm run build` (gera `dist/index.mjs`).
