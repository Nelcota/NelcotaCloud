export const CLI_VERSION = '0.1.0'

export const HELP_TEXT = `nelcota: migrações, tipos e ambiente local de um projeto NelcotaCloud.

Uso: nelcota <comando> [opções]

Projeto
  init                          Cria nelcota/migrations/ e ignora .nelcota/ no git

Migrações
  migrations new <nome>         Cria nelcota/migrations/<versão>_<nome>.sql
  migrations list               Arquivos locais e migrações aplicadas no servidor
  migrations push [--dry-run]   Aplica as migrações pendentes, da mais antiga à mais nova

Banco de dados
  gen types [--output <arq>]    Tipos TypeScript das tabelas do projeto
  db url                        Endereço de conexão direta ao Postgres (sem a senha)
  db reset-password [--yes]     Gera uma nova senha de conexão direta

Ambiente local (Docker)
  dev start [--slug <slug>] [--site-url <url>]
                                Sobe Postgres, Mailpit e a API e cria o projeto local
  dev stop [--reset]            Para o ambiente (--reset apaga os dados)
  dev status                    Estado dos containers

Projeto de destino
  NELCOTA_SECRET_KEY            Chave secreta do projeto (nc_sk_...)
  NELCOTA_API_URL, --api-url    Endereço da API (padrão http://localhost:8080)
  --local                       Usa o projeto criado por nelcota dev start

  -h, --help                    Mostra esta ajuda
  -v, --version                 Mostra a versão
`
