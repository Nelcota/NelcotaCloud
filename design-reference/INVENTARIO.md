# Inventário do console → padrões da Veloz

Cada tela, aba, modal e componente do console (`apps/console/src`) com o padrão da Veloz que
ele passa a seguir (`TOKENS.md`). "Sem equivalente" marca o que a Veloz não mostra, com a
solução escolhida. Prints do estado anterior: `before/<tela>-<desktop|mobile>-<dark|light>.png`.

## Shell (app/shell)

| Hoje | Padrão Veloz | Decisão |
| --- | --- | --- |
| Moldura + trilho de ícones (`icon-rail`, `rail-link`) | Trilho de 40px na moldura preta, item ativo `surface-hover`, raio 10 | Mantido; itens 40×40, logo no topo, tema/conta no rodapé |
| Painel arredondado (`app-shell`) | Painel `#141414` com raio 16, inset 8px | Raio 16, sem borda no escuro |
| Barra superior (`panel-top-bar`, `header-breadcrumbs`) | Chip da organização (quadrado com inicial) + nome, ←/→, breadcrumb `Projetos › Loja › Serviços › api`, "Buscar… ⌘K" e botão "IA" à direita | Chip da conta (inicial em quadrado) + e-mail curto; breadcrumb `Projetos › Projeto › Grupo › Página`; busca 200px; botão "IA" abre "Copiar contexto para IA" |
| Barra lateral do projeto (`project-sidebar`, `project-switcher`) | Bloco do serviço (nome + branch) e itens de 13px com grupos rotulados em maiúsculas 10px | Bloco do projeto (nome + slug em mono), grupos AUTENTICAÇÃO / DADOS / PROJETO |
| Abas horizontais da Veloz (Visão geral · Métricas · Logs…) | Abas do recurso | **Sem equivalente direto**: o console navega por página, não por recurso. Solução: a barra lateral faz o papel das abas (como na Veloz), e páginas com subseções usam `PageTabs` (abas com indicador de 2px laranja sob a aba ativa) — Conta, Detalhe do usuário, Webhook, Tabela, Configurações |
| Navegação mobile (`mobile-navigation`) | — | Drawer (`Sheet`) com a mesma barra lateral |
| Command palette (`command-palette`, `command-items`) | ⌘K | Mantida; visual Veloz (popover `#1c1c1c`, itens 13px, `kbd`) e atalhos de ações |
| Sino de convites, menu da conta, tema | Rodapé do trilho | Mantidos |

## Componentes compartilhados (shared/ui)

| Componente | Padrão Veloz |
| --- | --- |
| `PageHeader` | Título 20px peso 500 + descrição 13px muted; ações à direita (botões 32px) |
| `Section` | Título 14px peso 500 + descrição de uma linha 12px ("Acima de 1% merece atenção.") |
| `SettingsSection` | Bloco `surface` raio 12, sem sombra; rodapé com a ação; perigo com borda vermelha 30% |
| `StatCard` | Rótulo 12px muted, número 24px peso 600 tabular, linha de contexto 11px; fundo `surface` |
| `StatusBadge` / `Badge` | Pill 20px, raio 6, cor do status a 12–16% + texto do status |
| `EmptyState` | Frase útil + CTA; sem ilustração |
| `Notice`, `ErrorAlert`, `LoadError` | Faixa `surface` raio 12 com palavra de status colorida ("Saudável.", "Falhou.") |
| `SegmentedControl` | Pills de período (mono 11px, ativo `surface-hover`) |
| `SearchField` | Campo `surface` 32px com `kbd` "/" |
| `Kbd` | 16px, raio 5, `surface-hover`, 10px |
| `Timestamp` | Mono; relativo "há 14h" |
| `IdChip`, `CopyableValue`, `CodeBlock`, `InlineCode` | Mono 11–12px, `surface` |
| `ConfirmButton`/`ConfirmDialog`/`TypedConfirmation` | Modal `popover` raio 12; ação destrutiva vermelha isolada |
| `DataList` | Linhas chave/valor 12px, chave muted |
| Primitivos (`button`, `input`, `select`, `switch`, `table`, `tabs`, `tooltip`, `dialog`, `sheet`, `dropdown-menu`, `skeleton`) | Medidas da Etapa 0: botões 28/32/36, inputs 32, raio 8, tabelas com cabeçalho 11px muted e colunas numéricas à direita |
| **Novos**: `SummarySentence`, `PeriodPills`, `LiveIndicator`, `ResourceCard`, `ActivityItem`, `LevelBadge`, `FieldFacets`, `ChartLegend`, `PageTabs`, `useCountUp`, formatação pt-BR (`format-number`) | Padrões da Veloz sem equivalente atual |

## Telas

| Tela (rota) | Hoje | Padrão Veloz | Notas |
| --- | --- | --- | --- |
| Login, cadastro, recuperar e redefinir senha, verificar e-mail (`/login`, `/auth/*`) | Card central + miniatura do console | Card `surface` sobre a moldura, botão laranja 36px | A Veloz não mostra login; segue o card da documentação |
| Projetos (`/`) | Grade de cards, filtros, alternância grade/tabela | **Canvas de recursos**: cards de 260px com nome, slug mono, URL do site, chips (Dono/Membro, Ativo), 1–2 números, atalhos no rodapé (Usuários · Banco · Chaves · Atividade · Config.); "Buscar projeto /" e botão "Novo projeto" | Sem "Organizar" (não há disposição livre); a alternância grade/tabela ocupa esse lugar |
| Novo projeto (`/projects/new`) | Assistente em etapas | Etapas com marcação (lista de passos do progresso de deploy) | — |
| Conta (`/account`) | Abas Perfil/Segurança/Sessões | `PageTabs` + blocos `surface` | — |
| Visão geral (`/projects/$id`) | Cabeçalho, avisos, 4 stats, gráfico, próximos passos | **Página de métricas**: frase-resumo ("Saudável. Nenhum login recusado em 30 dias."), stat cards com contexto, gráfico com título + descrição + legenda com percentuais, pills de período no canto, feed de atividade recente | Gerado dos dados que já existem (uso, auditoria, saúde) |
| Chaves de API (`/keys`) | Tabela de chaves, chave de assinatura | Tabela densa, chave em mono, pills de status | — |
| Atividade (`/activity`) | Log de auditoria com filtros e painel lateral | **Visualizador de logs**: campos detectados com contagem (tipo, método, resultado), consulta com "Executar ⌘↵", indicador "Ao vivo", linhas mono com horário em ms, badge INF/WRN/ERR, chips `chave=valor`, rodapé "112 linhas" | Sem abas Runtime/Build: há um só fluxo (auditoria). "Ao vivo" = atualização automática da consulta |
| Usuários (`/users`) e detalhe (`/users/$id`) | Stats, filtros, tabela; detalhe com abas | Tabela densa; detalhe com cabeçalho (nome + pill mono com o ID) e `PageTabs` | — |
| Login social (`/providers`) | Lista de provedores | Linhas com logo, status pill e ação | — |
| Email (`/email`) | SMTP + templates | Blocos `surface`, editor com prévia | — |
| Webhooks (`/webhooks`) | Lista de endpoints + detalhe com abas + log de entregas | Lista à esquerda (sidebar secundária) + detalhe com `PageTabs`; entregas como **feed de atividade** (evento em destaque, metadados `endpoint · id · há 2min`, status à direita: Entregue / Falhou / Pendente) | — |
| Banco de dados (`/database`, `/database/$table`) | Lista de tabelas; tabela com abas Linhas/Colunas/Políticas | Lista com chips (RLS ativo), grade mono, `PageTabs` | — |
| Editor SQL (`/sql`) | Editor + resultado + painéis | Editor mono, botão "Executar ⌘↵", sidebar secundária com grupos (TABELAS, EXEMPLOS, HISTÓRICO) | Igual ao editor SQL da Veloz |
| Arquivos (`/storage`) | Buckets + objetos | Abas de bucket como pills, tabela de objetos com tamanhos à direita ("33,1 GB") | — |
| Equipe (`/team`) | Membros, convites | Tabela densa, chips de papel | — |
| Configurações (`/settings`) | Navegação por painéis | **Sidebar secundária com grupos rotulados** (GERAL, AUTENTICAÇÃO, API) + zona de perigo isolada ("Excluir projeto" em vermelho) | Igual ao padrão de Observabilidade |
| 404, erro de rota, status | Card central | Card `surface`, mensagem humana | — |

## Modais e painéis laterais

`avatar-upload-dialog`, `totp-disable-form`, `audit-event-sheet`, `block-address-dialog`,
`create-key-dialog`, `revoke-key-action`, `secret-leave-guard`, `add-column-dialog`,
`create-policy-dialog`, `create-table-dialog`, `grid-row-details`, `row-level-security-switch`,
`prompt-dialog`, `configure-provider-dialog`, `oauth-redirects-panel`, `provider-menu`,
`smtp-setup-dialog`, `create-bucket-dialog`, `delete-bucket-menu`, `upload-file-dialog`,
`invite-dialog`, `member-action-confirmation`, `action-confirmation`, `delivery-sheet`,
`endpoint-dialogs`, `endpoint-form-dialog`, `rotate-secret-dialog`, e os `*-api-sheet`.

Padrão: popover `#1c1c1c` / `#fff` com anel de 1px e sombra só no claro, raio 12, título 14px
peso 500, descrição 12px, rodapé com ações à direita (secundário + primário), entrada de
200ms. Painéis laterais (`Sheet`) entram com `transform 250ms cubic-bezier(.65,0,.35,1)`.

## Sem equivalente na Veloz (e a solução)

| Padrão pedido | Situação no NelcotaCloud | Solução |
| --- | --- | --- |
| Métricas de CPU/memória, traces, volumes, domínios, deploys | A API não tem esses dados | Não inventar telas: os componentes (stat card, gráfico, feed, progresso) usam os dados reais de uso, auditoria, entregas e provisionamento |
| Progresso de deploy ("a9f2c31 → e41b07d", "Instâncias 0 de 3") | Criação de projeto provisiona banco, chaves e auth | O padrão vira o progresso de criação do projeto (`creation-progress`): etapas com marcação |
| Abas Runtime/Build nos logs | Um só fluxo de eventos | Abas por tipo: Todos / Logins / Admin / Recusas, no mesmo estilo |
| Marcadores de evento no gráfico (Deploy, Falha, Alerta) | Há eventos de auditoria por dia | Marcadores de "Recusas" e "Mudanças de configuração" no gráfico da visão geral, quando existirem |
| Botão "IA" na barra superior | Já existe "Copiar contexto para IA" na visão geral | O botão da barra abre o mesmo diálogo em qualquer página do projeto |

## Divergências da referência (decididas na implementação)

| Ponto | Veloz | NelcotaCloud | Por quê |
| --- | --- | --- | --- |
| Botão primário | Branco sobre `#FF4D00` (3,3:1) | Branco sobre `#D63F00` (4,6:1), hover `#C23900` | AA para texto de 12–14px; `#FF4D00` segue no foco, item ativo, gráficos e indicadores |
| Laranja como texto no claro | `#FF4D00` | `#C2410C` (5,2:1) | AA sobre branco (mesmo valor que a documentação da Veloz usa em código) |
| Borda de inputs de formulário | Sem borda, só `surface` | Borda 3:1 (`#666` / `#8A8A8A`) | WCAG 1.4.11; campos de busca seguem sem borda, como na Veloz |
| Fonte Cal Sans | Subconjunto latino servido pelo Next (88 KB) | Arquivo variável completo do pacote oficial `cal-sans` (290 KB) | Mesmo arquivo e mesmos pesos; sem ferramenta de subset no projeto |
| Ícones | Traço fino estilo Lucide | Lucide com traço 1,5 (os ícones Solar saíram) | Uma família só, como na referência |
| Abas do recurso | Abas horizontais sob o nome do serviço | Barra lateral do projeto + abas `line` nas páginas com subpáginas | O console navega por página, não por recurso |
| "Organizar" no canvas | Disposição livre dos cards | Alternância grade/tabela | Projetos não têm posição no canvas |
| Abas Runtime/Build nos logs | Dois fluxos | Pills por tipo de evento (Tudo, Logins, Falhas…) | Há um só fluxo (auditoria) |
| Dispositivo/IP nas sessões, "convidado por", datas de objetos | Mostrados | Não mostrados | A API não devolve esses dados; nenhuma chamada foi alterada |
| Progresso "Instâncias 0 de 3" | Etapas do deploy | Etapas reais da criação do projeto (3) | A criação é um único request; nada de progresso inventado |
| Rótulos em maiúsculas | Grupos da barra lateral | Iguais, só nos grupos da barra lateral e dos menus | Regra registrada no CLAUDE.md |

Prints do estado final: `after/<tela>-<desktop|mobile>-<dark|light>.png`.
