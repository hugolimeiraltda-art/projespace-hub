# Agenda PPE + Renomear rótulo "Totem"

## 1) Renomear rótulo no card de projeto PPE
Arquivo: `src/components/StartupProjectCardCompact.tsx`
- Trocar label `4.1 Agendamento` por **`Totem`** nos blocos desktop e mobile.
- Nada muda no banco: continua usando `agendamento_visita_startup_data`.
- `3.7 Base` e demais rótulos permanecem.

## 2) Novo menu "Agenda PPE" em Implantação
Rota: `/implantacao/agenda-ppe` — visível apenas para `admin` e `implantacao`.
Entrada no submenu de Implantação (`src/components/Layout.tsx`), com ícone de calendário.

### Fonte de dados
Query em `implantacao_etapas` (join com `projects` e `prestadores`), filtrando:
- `projects.tipo_implantacao = 'PPE'`
- `projects.implantacao_status IN ('EM_EXECUCAO','A_EXECUTAR')` (excluir concluídos)
- Registros com `ppe_execucao_base_data` **ou** `agendamento_visita_startup_data` preenchidos

Instalador vem de `implantacao_etapas.ppe_equipe_prestador_id` → nome em `prestadores.nome_completo`.

Cada projeto pode gerar até 2 eventos:
- **3.7 Base** na data `ppe_execucao_base_data`
- **4.1 Totem** na data `agendamento_visita_startup_data`

### Layout — Calendário semanal com swimlanes por instalador
```text
                 Seg 07  Ter 08  Qua 09  Qui 10  Sex 11  Sáb 12  Dom 13
William BH   |  [3.7 PPE143]        [4.1 PPE143]
João SP      |          [3.7 PPE150]           [3.7 PPE151]
Sem equipe   |                     [4.1 PPE160]
```
- Cards de evento coloridos:
  - **Laranja** = 3.7 Base
  - **Azul** = 4.1 Totem
- Cada card mostra: contrato (PPE...), condomínio, cidade/UF.
- Clique no card abre o projeto em `/startup-projetos/:id/execucao`.
- Linha "Sem equipe" agrupa projetos com instalador ainda não atribuído.

### Controles
- Navegação semanal: << Semana anterior | **Semana de 07/07 a 13/07** | Próxima >>
- Botão "Hoje" para voltar à semana atual.
- Toggle rápido: **Semana** / **Mês** (visão mensal = grade tradicional com badges 3.7/4.1 nos dias).
- Filtros no topo: Filial, Instalador (multi), Tipo de serviço (3.7 / 4.1 / ambos), Busca por contrato/cliente.
- Botão "Exportar CSV" da visão atual.

### KPIs no topo
- Total de obras na semana
- Bases (3.7) agendadas na semana
- Totens (4.1) agendados na semana
- Instaladores empenhados na semana

## Detalhes técnicos
- Novo arquivo `src/pages/ImplantacaoAgendaPPE.tsx`.
- Rota registrada em `src/App.tsx`, protegida por `has_role admin | implantacao`.
- Nenhuma migração de banco: reaproveita colunas existentes de `implantacao_etapas`.
- Sem alteração no fluxo de edição; a página é read-only e navega para a Execução ao clicar.
