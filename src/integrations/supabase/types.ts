export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      customer_chamados: {
        Row: {
          assunto: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          customer_id: string
          descricao: string | null
          id: string
          prioridade: string
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assunto: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id: string
          descricao?: string | null
          id?: string
          prioridade?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assunto?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string
          descricao?: string | null
          id?: string
          prioridade?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_chamados_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_portfolio"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_depoimentos: {
        Row: {
          autor: string
          cargo: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          customer_id: string
          id: string
          texto: string
          tipo: string
        }
        Insert: {
          autor: string
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id: string
          id?: string
          texto: string
          tipo?: string
        }
        Update: {
          autor?: string
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string
          id?: string
          texto?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_depoimentos_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_portfolio"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          arquivo_url: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          nome_arquivo: string
          tamanho: number | null
          tipo_arquivo: string | null
        }
        Insert: {
          arquivo_url: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          nome_arquivo: string
          tamanho?: number | null
          tipo_arquivo?: string | null
        }
        Update: {
          arquivo_url?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          nome_arquivo?: string
          tamanho?: number | null
          tipo_arquivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_portfolio"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_nps: {
        Row: {
          comentario: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          customer_id: string
          id: string
          nota: number
          ponto_forte: string | null
          ponto_fraco: string | null
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id: string
          id?: string
          nota: number
          ponto_forte?: string | null
          ponto_fraco?: string | null
        }
        Update: {
          comentario?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string
          id?: string
          nota?: number
          ponto_forte?: string | null
          ponto_fraco?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_nps_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_portfolio"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portfolio: {
        Row: {
          alarme_codigo: string | null
          app: string | null
          cameras: number | null
          cancelas: number | null
          catracas: number | null
          contato_nome: string | null
          contato_telefone: string | null
          contrato: string
          created_at: string
          data_ativacao: string | null
          data_termino: string | null
          dvr_nvr: number | null
          endereco: string | null
          filial: string | null
          gateway: boolean | null
          id: string
          leitores: string | null
          mensalidade: number | null
          noc: string | null
          portas: number | null
          portoes: number | null
          quantidade_leitores: number | null
          razao_social: string
          sistema: string | null
          taxa_ativacao: number | null
          tipo: string | null
          totem_duplo: number | null
          totem_simples: number | null
          transbordo: boolean | null
          unidades: number | null
          updated_at: string
          zonas_perimetro: number | null
        }
        Insert: {
          alarme_codigo?: string | null
          app?: string | null
          cameras?: number | null
          cancelas?: number | null
          catracas?: number | null
          contato_nome?: string | null
          contato_telefone?: string | null
          contrato: string
          created_at?: string
          data_ativacao?: string | null
          data_termino?: string | null
          dvr_nvr?: number | null
          endereco?: string | null
          filial?: string | null
          gateway?: boolean | null
          id?: string
          leitores?: string | null
          mensalidade?: number | null
          noc?: string | null
          portas?: number | null
          portoes?: number | null
          quantidade_leitores?: number | null
          razao_social: string
          sistema?: string | null
          taxa_ativacao?: number | null
          tipo?: string | null
          totem_duplo?: number | null
          totem_simples?: number | null
          transbordo?: boolean | null
          unidades?: number | null
          updated_at?: string
          zonas_perimetro?: number | null
        }
        Update: {
          alarme_codigo?: string | null
          app?: string | null
          cameras?: number | null
          cancelas?: number | null
          catracas?: number | null
          contato_nome?: string | null
          contato_telefone?: string | null
          contrato?: string
          created_at?: string
          data_ativacao?: string | null
          data_termino?: string | null
          dvr_nvr?: number | null
          endereco?: string | null
          filial?: string | null
          gateway?: boolean | null
          id?: string
          leitores?: string | null
          mensalidade?: number | null
          noc?: string | null
          portas?: number | null
          portoes?: number | null
          quantidade_leitores?: number | null
          razao_social?: string
          sistema?: string | null
          taxa_ativacao?: number | null
          tipo?: string | null
          totem_duplo?: number | null
          totem_simples?: number | null
          transbordo?: boolean | null
          unidades?: number | null
          updated_at?: string
          zonas_perimetro?: number | null
        }
        Relationships: []
      }
      customer_satisfacao: {
        Row: {
          ambiente_organizado: string | null
          comunicacao: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          customer_id: string
          expectativa_atendida: string | null
          facilidade_app: string | null
          funcionalidades_sindico: string | null
          id: string
          nota_nps: number | null
          pendencias: string | null
          tempo_implantacao: string | null
          treinamento_adequado: string | null
        }
        Insert: {
          ambiente_organizado?: string | null
          comunicacao?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id: string
          expectativa_atendida?: string | null
          facilidade_app?: string | null
          funcionalidades_sindico?: string | null
          id?: string
          nota_nps?: number | null
          pendencias?: string | null
          tempo_implantacao?: string | null
          treinamento_adequado?: string | null
        }
        Update: {
          ambiente_organizado?: string | null
          comunicacao?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string
          expectativa_atendida?: string | null
          facilidade_app?: string | null
          funcionalidades_sindico?: string | null
          id?: string
          nota_nps?: number | null
          pendencias?: string | null
          tempo_implantacao?: string | null
          treinamento_adequado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_satisfacao_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_portfolio"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          created_at: string
          estoque_atual: number
          estoque_minimo: number
          id: string
          item_id: string
          local_estoque_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          item_id: string
          local_estoque_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          item_id?: string
          local_estoque_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_local_estoque_id_fkey"
            columns: ["local_estoque_id"]
            isOneToOne: false
            referencedRelation: "locais_estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_alertas: {
        Row: {
          created_at: string
          estoque_atual: number
          estoque_minimo: number
          id: string
          item_id: string
          lido: boolean
          lido_em: string | null
          lido_por: string | null
          local_estoque_id: string
          quantidade_faltante: number
        }
        Insert: {
          created_at?: string
          estoque_atual: number
          estoque_minimo: number
          id?: string
          item_id: string
          lido?: boolean
          lido_em?: string | null
          lido_por?: string | null
          local_estoque_id: string
          quantidade_faltante: number
        }
        Update: {
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          item_id?: string
          lido?: boolean
          lido_em?: string | null
          lido_por?: string | null
          local_estoque_id?: string
          quantidade_faltante?: number
        }
        Relationships: [
          {
            foreignKeyName: "estoque_alertas_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_alertas_local_estoque_id_fkey"
            columns: ["local_estoque_id"]
            isOneToOne: false
            referencedRelation: "locais_estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_importacoes: {
        Row: {
          arquivo_nome: string
          created_at: string
          id: string
          importado_por: string
          itens_importados: number
        }
        Insert: {
          arquivo_nome: string
          created_at?: string
          id?: string
          importado_por: string
          itens_importados?: number
        }
        Update: {
          arquivo_nome?: string
          created_at?: string
          id?: string
          importado_por?: string
          itens_importados?: number
        }
        Relationships: []
      }
      estoque_itens: {
        Row: {
          codigo: string
          created_at: string
          id: string
          modelo: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          modelo: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          modelo?: string
          updated_at?: string
        }
        Relationships: []
      }
      implantacao_checklists: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          dados: Json | null
          fotos: string[] | null
          id: string
          observacoes: string | null
          project_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          dados?: Json | null
          fotos?: string[] | null
          id?: string
          observacoes?: string | null
          project_id: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          dados?: Json | null
          fotos?: string[] | null
          id?: string
          observacoes?: string | null
          project_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "implantacao_checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      implantacao_etapas: {
        Row: {
          agendamento_visita_comercial: boolean | null
          agendamento_visita_comercial_at: string | null
          agendamento_visita_comercial_data: string | null
          agendamento_visita_startup: boolean | null
          agendamento_visita_startup_at: string | null
          agendamento_visita_startup_data: string | null
          cadastro_gear: boolean | null
          cadastro_gear_at: string | null
          check_programacao: boolean | null
          check_programacao_at: string | null
          check_projeto: boolean | null
          check_projeto_at: string | null
          concluido: boolean | null
          concluido_at: string | null
          conferencia_tags: boolean | null
          conferencia_tags_at: string | null
          confirmacao_ativacao_financeira: boolean | null
          confirmacao_ativacao_financeira_at: string | null
          contrato_assinado: boolean | null
          contrato_assinado_at: string | null
          contrato_cadastrado: boolean | null
          contrato_cadastrado_at: string | null
          created_at: string
          etapa_atual: number | null
          id: string
          laudo_conclusao_supervisor: boolean | null
          laudo_conclusao_supervisor_at: string | null
          laudo_instalador: boolean | null
          laudo_instalador_at: string | null
          laudo_serralheiro: boolean | null
          laudo_serralheiro_at: string | null
          laudo_vidraceiro: boolean | null
          laudo_vidraceiro_at: string | null
          laudo_visita_comercial: boolean | null
          laudo_visita_comercial_at: string | null
          laudo_visita_comercial_texto: string | null
          laudo_visita_startup: boolean | null
          laudo_visita_startup_at: string | null
          ligacao_boas_vindas: boolean | null
          ligacao_boas_vindas_at: string | null
          observacoes_manutencao: string | null
          operacao_assistida_fim: string | null
          operacao_assistida_inicio: string | null
          operacao_assistida_interacoes: Json | null
          pesquisa_satisfacao_comentario: string | null
          pesquisa_satisfacao_nota: number | null
          pesquisa_satisfacao_pontos_negativos: string | null
          pesquisa_satisfacao_pontos_positivos: string | null
          pesquisa_satisfacao_realizada: boolean | null
          pesquisa_satisfacao_realizada_at: string | null
          pesquisa_satisfacao_recomendaria: boolean | null
          project_id: string
          sindico_app: boolean | null
          sindico_app_at: string | null
          updated_at: string
        }
        Insert: {
          agendamento_visita_comercial?: boolean | null
          agendamento_visita_comercial_at?: string | null
          agendamento_visita_comercial_data?: string | null
          agendamento_visita_startup?: boolean | null
          agendamento_visita_startup_at?: string | null
          agendamento_visita_startup_data?: string | null
          cadastro_gear?: boolean | null
          cadastro_gear_at?: string | null
          check_programacao?: boolean | null
          check_programacao_at?: string | null
          check_projeto?: boolean | null
          check_projeto_at?: string | null
          concluido?: boolean | null
          concluido_at?: string | null
          conferencia_tags?: boolean | null
          conferencia_tags_at?: string | null
          confirmacao_ativacao_financeira?: boolean | null
          confirmacao_ativacao_financeira_at?: string | null
          contrato_assinado?: boolean | null
          contrato_assinado_at?: string | null
          contrato_cadastrado?: boolean | null
          contrato_cadastrado_at?: string | null
          created_at?: string
          etapa_atual?: number | null
          id?: string
          laudo_conclusao_supervisor?: boolean | null
          laudo_conclusao_supervisor_at?: string | null
          laudo_instalador?: boolean | null
          laudo_instalador_at?: string | null
          laudo_serralheiro?: boolean | null
          laudo_serralheiro_at?: string | null
          laudo_vidraceiro?: boolean | null
          laudo_vidraceiro_at?: string | null
          laudo_visita_comercial?: boolean | null
          laudo_visita_comercial_at?: string | null
          laudo_visita_comercial_texto?: string | null
          laudo_visita_startup?: boolean | null
          laudo_visita_startup_at?: string | null
          ligacao_boas_vindas?: boolean | null
          ligacao_boas_vindas_at?: string | null
          observacoes_manutencao?: string | null
          operacao_assistida_fim?: string | null
          operacao_assistida_inicio?: string | null
          operacao_assistida_interacoes?: Json | null
          pesquisa_satisfacao_comentario?: string | null
          pesquisa_satisfacao_nota?: number | null
          pesquisa_satisfacao_pontos_negativos?: string | null
          pesquisa_satisfacao_pontos_positivos?: string | null
          pesquisa_satisfacao_realizada?: boolean | null
          pesquisa_satisfacao_realizada_at?: string | null
          pesquisa_satisfacao_recomendaria?: boolean | null
          project_id: string
          sindico_app?: boolean | null
          sindico_app_at?: string | null
          updated_at?: string
        }
        Update: {
          agendamento_visita_comercial?: boolean | null
          agendamento_visita_comercial_at?: string | null
          agendamento_visita_comercial_data?: string | null
          agendamento_visita_startup?: boolean | null
          agendamento_visita_startup_at?: string | null
          agendamento_visita_startup_data?: string | null
          cadastro_gear?: boolean | null
          cadastro_gear_at?: string | null
          check_programacao?: boolean | null
          check_programacao_at?: string | null
          check_projeto?: boolean | null
          check_projeto_at?: string | null
          concluido?: boolean | null
          concluido_at?: string | null
          conferencia_tags?: boolean | null
          conferencia_tags_at?: string | null
          confirmacao_ativacao_financeira?: boolean | null
          confirmacao_ativacao_financeira_at?: string | null
          contrato_assinado?: boolean | null
          contrato_assinado_at?: string | null
          contrato_cadastrado?: boolean | null
          contrato_cadastrado_at?: string | null
          created_at?: string
          etapa_atual?: number | null
          id?: string
          laudo_conclusao_supervisor?: boolean | null
          laudo_conclusao_supervisor_at?: string | null
          laudo_instalador?: boolean | null
          laudo_instalador_at?: string | null
          laudo_serralheiro?: boolean | null
          laudo_serralheiro_at?: string | null
          laudo_vidraceiro?: boolean | null
          laudo_vidraceiro_at?: string | null
          laudo_visita_comercial?: boolean | null
          laudo_visita_comercial_at?: string | null
          laudo_visita_comercial_texto?: string | null
          laudo_visita_startup?: boolean | null
          laudo_visita_startup_at?: string | null
          ligacao_boas_vindas?: boolean | null
          ligacao_boas_vindas_at?: string | null
          observacoes_manutencao?: string | null
          operacao_assistida_fim?: string | null
          operacao_assistida_inicio?: string | null
          operacao_assistida_interacoes?: Json | null
          pesquisa_satisfacao_comentario?: string | null
          pesquisa_satisfacao_nota?: number | null
          pesquisa_satisfacao_pontos_negativos?: string | null
          pesquisa_satisfacao_pontos_positivos?: string | null
          pesquisa_satisfacao_realizada?: boolean | null
          pesquisa_satisfacao_realizada_at?: string | null
          pesquisa_satisfacao_recomendaria?: boolean | null
          project_id?: string
          sindico_app?: boolean | null
          sindico_app_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "implantacao_etapas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      locais_estoque: {
        Row: {
          cidade: string
          created_at: string
          id: string
          nome_local: string
          tipo: Database["public"]["Enums"]["estoque_tipo"]
        }
        Insert: {
          cidade: string
          created_at?: string
          id?: string
          nome_local: string
          tipo: Database["public"]["Enums"]["estoque_tipo"]
        }
        Update: {
          cidade?: string
          created_at?: string
          id?: string
          nome_local?: string
          tipo?: Database["public"]["Enums"]["estoque_tipo"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          filiais: string[] | null
          filial: string | null
          foto: string | null
          id: string
          must_change_password: boolean
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          filiais?: string[] | null
          filial?: string | null
          foto?: string | null
          id: string
          must_change_password?: boolean
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          filiais?: string[] | null
          filial?: string | null
          foto?: string | null
          id?: string
          must_change_password?: boolean
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_attachments: {
        Row: {
          arquivo_url: string
          created_at: string
          id: string
          nome_arquivo: string
          project_id: string
          tipo: Database["public"]["Enums"]["attachment_type"]
        }
        Insert: {
          arquivo_url: string
          created_at?: string
          id?: string
          nome_arquivo: string
          project_id: string
          tipo: Database["public"]["Enums"]["attachment_type"]
        }
        Update: {
          arquivo_url?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          project_id?: string
          tipo?: Database["public"]["Enums"]["attachment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "project_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          project_id: string
          texto: string
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          project_id: string
          texto: string
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          project_id?: string
          texto?: string
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notifications: {
        Row: {
          created_at: string
          for_role: string | null
          for_user_id: string | null
          id: string
          message: string
          project_id: string
          read: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          for_role?: string | null
          for_user_id?: string | null
          id?: string
          message: string
          project_id: string
          read?: boolean
          title: string
          type: string
        }
        Update: {
          created_at?: string
          for_role?: string | null
          for_user_id?: string | null
          id?: string
          message?: string
          project_id?: string
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_status_history: {
        Row: {
          changed_by_user_id: string
          changed_by_user_name: string
          created_at: string
          from_status: Database["public"]["Enums"]["project_status"] | null
          id: string
          project_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["project_status"]
        }
        Insert: {
          changed_by_user_id: string
          changed_by_user_name: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["project_status"] | null
          id?: string
          project_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["project_status"]
        }
        Update: {
          changed_by_user_id?: string
          changed_by_user_name?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["project_status"] | null
          id?: string
          project_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["project_status"]
        }
        Relationships: [
          {
            foreignKeyName: "project_status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cliente_cidade: string | null
          cliente_condominio_nome: string
          cliente_estado: string | null
          created_at: string
          created_by_user_id: string
          dados_originais_pre_reenvio: Json | null
          data_assembleia: string | null
          email_padrao_gerado: string | null
          endereco_condominio: string | null
          engineering_completed_at: string | null
          engineering_production_at: string | null
          engineering_received_at: string | null
          engineering_status:
            | Database["public"]["Enums"]["engineering_status"]
            | null
          id: string
          implantacao_assigned_to: string | null
          implantacao_completed_at: string | null
          implantacao_started_at: string | null
          implantacao_status:
            | Database["public"]["Enums"]["implantacao_status"]
            | null
          laudo_projeto: string | null
          numero_projeto: number
          numero_unidades: number | null
          observacoes: string | null
          prazo_entrega_projeto: string | null
          sale_status: Database["public"]["Enums"]["sale_status"]
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          vendedor_email: string
          vendedor_nome: string
        }
        Insert: {
          cliente_cidade?: string | null
          cliente_condominio_nome: string
          cliente_estado?: string | null
          created_at?: string
          created_by_user_id: string
          dados_originais_pre_reenvio?: Json | null
          data_assembleia?: string | null
          email_padrao_gerado?: string | null
          endereco_condominio?: string | null
          engineering_completed_at?: string | null
          engineering_production_at?: string | null
          engineering_received_at?: string | null
          engineering_status?:
            | Database["public"]["Enums"]["engineering_status"]
            | null
          id?: string
          implantacao_assigned_to?: string | null
          implantacao_completed_at?: string | null
          implantacao_started_at?: string | null
          implantacao_status?:
            | Database["public"]["Enums"]["implantacao_status"]
            | null
          laudo_projeto?: string | null
          numero_projeto?: number
          numero_unidades?: number | null
          observacoes?: string | null
          prazo_entrega_projeto?: string | null
          sale_status?: Database["public"]["Enums"]["sale_status"]
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          vendedor_email: string
          vendedor_nome: string
        }
        Update: {
          cliente_cidade?: string | null
          cliente_condominio_nome?: string
          cliente_estado?: string | null
          created_at?: string
          created_by_user_id?: string
          dados_originais_pre_reenvio?: Json | null
          data_assembleia?: string | null
          email_padrao_gerado?: string | null
          endereco_condominio?: string | null
          engineering_completed_at?: string | null
          engineering_production_at?: string | null
          engineering_received_at?: string | null
          engineering_status?:
            | Database["public"]["Enums"]["engineering_status"]
            | null
          id?: string
          implantacao_assigned_to?: string | null
          implantacao_completed_at?: string | null
          implantacao_started_at?: string | null
          implantacao_status?:
            | Database["public"]["Enums"]["implantacao_status"]
            | null
          laudo_projeto?: string | null
          numero_projeto?: number
          numero_unidades?: number | null
          observacoes?: string | null
          prazo_entrega_projeto?: string | null
          sale_status?: Database["public"]["Enums"]["sale_status"]
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          vendedor_email?: string
          vendedor_nome?: string
        }
        Relationships: []
      }
      sale_forms: {
        Row: {
          acesso_local_central_portaria: string | null
          acessos_tem_camera_int_ext: boolean | null
          alarme_tipo: string | null
          cabo_metros_qdg_ate_central: number | null
          cancela_aproveitada_detalhes: string | null
          cancela_autenticacao: string | null
          cancela_qtd_duplo_sentido: number | null
          cancela_qtd_sentido_unico: number | null
          catraca_aproveitada_detalhes: string | null
          catraca_autenticacao: string | null
          catraca_qtd_duplo_sentido: number | null
          catraca_qtd_sentido_unico: number | null
          cerca_central_alarme_tipo: string | null
          cerca_local_central_choque: string | null
          cerca_metragem_linear_total: number | null
          cerca_qtd_cabo_centenax: number | null
          cerca_qtd_fios: number | null
          cftv_novo_qtd_dvr_16ch: number | null
          cftv_novo_qtd_dvr_4ch: number | null
          cftv_novo_qtd_dvr_8ch: number | null
          cftv_novo_qtd_total_cameras: number | null
          checklist_implantacao: Json | null
          created_at: string
          filial: string | null
          id: string
          internet_exclusiva: string | null
          iva_central_alarme_tipo: string | null
          iva_qtd_cabo_blindado: string | null
          iva_qtd_novos: number | null
          iva_qtd_pares_existentes: number | null
          local_central_interfonia_descricao: string | null
          marca_modelo_dvr_aproveitado: string | null
          metodo_acionamento_portoes: string | null
          nome_condominio: string | null
          obs_central_portaria_qdg: string | null
          obs_gerais: string | null
          obs_portas: string | null
          possui_cancela: boolean | null
          possui_catraca: boolean | null
          possui_totem: boolean | null
          produto: string | null
          project_id: string
          qtd_apartamentos: number | null
          qtd_blocos: number | null
          qtd_cameras_aproveitadas: number | null
          qtd_cameras_elevador: number | null
          qtd_dvrs_aproveitados: number | null
          qtd_portas_bloco: number | null
          qtd_portas_pedestre: number | null
          qtd_portoes_basculantes: number | null
          qtd_portoes_deslizantes: number | null
          qtd_portoes_pivotantes: number | null
          qtd_saida_autenticada: number | null
          resumo_tecnico_noc: string | null
          totem_qtd_duplo: number | null
          totem_qtd_simples: number | null
          transbordo_para_apartamentos: string | null
          updated_at: string
          vendedor_email: string | null
          vendedor_nome: string | null
        }
        Insert: {
          acesso_local_central_portaria?: string | null
          acessos_tem_camera_int_ext?: boolean | null
          alarme_tipo?: string | null
          cabo_metros_qdg_ate_central?: number | null
          cancela_aproveitada_detalhes?: string | null
          cancela_autenticacao?: string | null
          cancela_qtd_duplo_sentido?: number | null
          cancela_qtd_sentido_unico?: number | null
          catraca_aproveitada_detalhes?: string | null
          catraca_autenticacao?: string | null
          catraca_qtd_duplo_sentido?: number | null
          catraca_qtd_sentido_unico?: number | null
          cerca_central_alarme_tipo?: string | null
          cerca_local_central_choque?: string | null
          cerca_metragem_linear_total?: number | null
          cerca_qtd_cabo_centenax?: number | null
          cerca_qtd_fios?: number | null
          cftv_novo_qtd_dvr_16ch?: number | null
          cftv_novo_qtd_dvr_4ch?: number | null
          cftv_novo_qtd_dvr_8ch?: number | null
          cftv_novo_qtd_total_cameras?: number | null
          checklist_implantacao?: Json | null
          created_at?: string
          filial?: string | null
          id?: string
          internet_exclusiva?: string | null
          iva_central_alarme_tipo?: string | null
          iva_qtd_cabo_blindado?: string | null
          iva_qtd_novos?: number | null
          iva_qtd_pares_existentes?: number | null
          local_central_interfonia_descricao?: string | null
          marca_modelo_dvr_aproveitado?: string | null
          metodo_acionamento_portoes?: string | null
          nome_condominio?: string | null
          obs_central_portaria_qdg?: string | null
          obs_gerais?: string | null
          obs_portas?: string | null
          possui_cancela?: boolean | null
          possui_catraca?: boolean | null
          possui_totem?: boolean | null
          produto?: string | null
          project_id: string
          qtd_apartamentos?: number | null
          qtd_blocos?: number | null
          qtd_cameras_aproveitadas?: number | null
          qtd_cameras_elevador?: number | null
          qtd_dvrs_aproveitados?: number | null
          qtd_portas_bloco?: number | null
          qtd_portas_pedestre?: number | null
          qtd_portoes_basculantes?: number | null
          qtd_portoes_deslizantes?: number | null
          qtd_portoes_pivotantes?: number | null
          qtd_saida_autenticada?: number | null
          resumo_tecnico_noc?: string | null
          totem_qtd_duplo?: number | null
          totem_qtd_simples?: number | null
          transbordo_para_apartamentos?: string | null
          updated_at?: string
          vendedor_email?: string | null
          vendedor_nome?: string | null
        }
        Update: {
          acesso_local_central_portaria?: string | null
          acessos_tem_camera_int_ext?: boolean | null
          alarme_tipo?: string | null
          cabo_metros_qdg_ate_central?: number | null
          cancela_aproveitada_detalhes?: string | null
          cancela_autenticacao?: string | null
          cancela_qtd_duplo_sentido?: number | null
          cancela_qtd_sentido_unico?: number | null
          catraca_aproveitada_detalhes?: string | null
          catraca_autenticacao?: string | null
          catraca_qtd_duplo_sentido?: number | null
          catraca_qtd_sentido_unico?: number | null
          cerca_central_alarme_tipo?: string | null
          cerca_local_central_choque?: string | null
          cerca_metragem_linear_total?: number | null
          cerca_qtd_cabo_centenax?: number | null
          cerca_qtd_fios?: number | null
          cftv_novo_qtd_dvr_16ch?: number | null
          cftv_novo_qtd_dvr_4ch?: number | null
          cftv_novo_qtd_dvr_8ch?: number | null
          cftv_novo_qtd_total_cameras?: number | null
          checklist_implantacao?: Json | null
          created_at?: string
          filial?: string | null
          id?: string
          internet_exclusiva?: string | null
          iva_central_alarme_tipo?: string | null
          iva_qtd_cabo_blindado?: string | null
          iva_qtd_novos?: number | null
          iva_qtd_pares_existentes?: number | null
          local_central_interfonia_descricao?: string | null
          marca_modelo_dvr_aproveitado?: string | null
          metodo_acionamento_portoes?: string | null
          nome_condominio?: string | null
          obs_central_portaria_qdg?: string | null
          obs_gerais?: string | null
          obs_portas?: string | null
          possui_cancela?: boolean | null
          possui_catraca?: boolean | null
          possui_totem?: boolean | null
          produto?: string | null
          project_id?: string
          qtd_apartamentos?: number | null
          qtd_blocos?: number | null
          qtd_cameras_aproveitadas?: number | null
          qtd_cameras_elevador?: number | null
          qtd_dvrs_aproveitados?: number | null
          qtd_portas_bloco?: number | null
          qtd_portas_pedestre?: number | null
          qtd_portoes_basculantes?: number | null
          qtd_portoes_deslizantes?: number | null
          qtd_portoes_pivotantes?: number | null
          qtd_saida_autenticada?: number | null
          resumo_tecnico_noc?: string | null
          totem_qtd_duplo?: number | null
          totem_qtd_simples?: number | null
          transbordo_para_apartamentos?: string | null
          updated_at?: string
          vendedor_email?: string | null
          vendedor_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tap_forms: {
        Row: {
          alarme_descricao: string | null
          cftv_dvr_descricao: string | null
          cftv_elevador_possui: string | null
          controle_acessos_pedestre_descricao: string | null
          controle_acessos_veiculo_descricao: string | null
          email_origem_texto: string | null
          id: string
          info_adicionais: string | null
          info_cronograma: string | null
          info_custo: string | null
          interfonia: boolean | null
          interfonia_descricao: string | null
          marcacao_croqui_confirmada: boolean | null
          marcacao_croqui_itens: string[] | null
          modalidade_portaria: string | null
          numero_blocos: number | null
          numero_unidades: number | null
          observacao_nao_assumir_cameras: boolean | null
          portaria_virtual_atendimento_app: string | null
          project_id: string
          solicitacao_origem: string | null
        }
        Insert: {
          alarme_descricao?: string | null
          cftv_dvr_descricao?: string | null
          cftv_elevador_possui?: string | null
          controle_acessos_pedestre_descricao?: string | null
          controle_acessos_veiculo_descricao?: string | null
          email_origem_texto?: string | null
          id?: string
          info_adicionais?: string | null
          info_cronograma?: string | null
          info_custo?: string | null
          interfonia?: boolean | null
          interfonia_descricao?: string | null
          marcacao_croqui_confirmada?: boolean | null
          marcacao_croqui_itens?: string[] | null
          modalidade_portaria?: string | null
          numero_blocos?: number | null
          numero_unidades?: number | null
          observacao_nao_assumir_cameras?: boolean | null
          portaria_virtual_atendimento_app?: string | null
          project_id: string
          solicitacao_origem?: string | null
        }
        Update: {
          alarme_descricao?: string | null
          cftv_dvr_descricao?: string | null
          cftv_elevador_possui?: string | null
          controle_acessos_pedestre_descricao?: string | null
          controle_acessos_veiculo_descricao?: string | null
          email_origem_texto?: string | null
          id?: string
          info_adicionais?: string | null
          info_cronograma?: string | null
          info_custo?: string | null
          interfonia?: boolean | null
          interfonia_descricao?: string | null
          marcacao_croqui_confirmada?: boolean | null
          marcacao_croqui_itens?: string[] | null
          modalidade_portaria?: string | null
          numero_blocos?: number | null
          numero_unidades?: number | null
          observacao_nao_assumir_cameras?: boolean | null
          portaria_virtual_atendimento_app?: string | null
          project_id?: string
          solicitacao_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tap_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_summary: {
        Row: {
          filiais: string[] | null
          filial: string | null
          foto: string | null
          id: string | null
          nome: string | null
        }
        Insert: {
          filiais?: string[] | null
          filial?: string | null
          foto?: string | null
          id?: string | null
          nome?: string | null
        }
        Update: {
          filiais?: string[] | null
          filial?: string | null
          foto?: string | null
          id?: string | null
          nome?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_gerente_view_project: {
        Args: { project_user_id: string }
        Returns: boolean
      }
      can_gerente_view_sale_form: {
        Args: { sf_filial: string; sf_project_id: string }
        Returns: boolean
      }
      get_user_filiais: { Args: { _user_id: string }; Returns: string[] }
      get_user_filial: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      sync_estoque_alertas: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "vendedor"
        | "projetos"
        | "gerente_comercial"
        | "implantacao"
        | "administrativo"
        | "sucesso_cliente"
        | "supervisor_operacoes"
      attachment_type:
        | "CROQUI"
        | "PLANTA_BAIXA"
        | "CONTRATO"
        | "FOTOS_LOCAL"
        | "ORCAMENTO"
        | "DOCUMENTOS_COMPLEMENTARES"
        | "OUTRO"
        | "PLANTA_CROQUI_DEVOLUCAO"
        | "LISTA_EQUIPAMENTOS"
        | "LISTA_ATIVIDADES"
      engineering_status:
        | "EM_RECEBIMENTO"
        | "EM_PRODUCAO"
        | "CONCLUIDO"
        | "RETORNAR"
      estoque_tipo: "INSTALACAO" | "MANUTENCAO" | "URGENCIA"
      implantacao_status: "A_EXECUTAR" | "EM_EXECUCAO" | "CONCLUIDO_IMPLANTACAO"
      project_status:
        | "RASCUNHO"
        | "ENVIADO"
        | "EM_ANALISE"
        | "PENDENTE_INFO"
        | "APROVADO_PROJETO"
        | "RECUSADO"
        | "CANCELADO"
      sale_status: "NAO_INICIADO" | "EM_ANDAMENTO" | "CONCLUIDO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "vendedor",
        "projetos",
        "gerente_comercial",
        "implantacao",
        "administrativo",
        "sucesso_cliente",
        "supervisor_operacoes",
      ],
      attachment_type: [
        "CROQUI",
        "PLANTA_BAIXA",
        "CONTRATO",
        "FOTOS_LOCAL",
        "ORCAMENTO",
        "DOCUMENTOS_COMPLEMENTARES",
        "OUTRO",
        "PLANTA_CROQUI_DEVOLUCAO",
        "LISTA_EQUIPAMENTOS",
        "LISTA_ATIVIDADES",
      ],
      engineering_status: [
        "EM_RECEBIMENTO",
        "EM_PRODUCAO",
        "CONCLUIDO",
        "RETORNAR",
      ],
      estoque_tipo: ["INSTALACAO", "MANUTENCAO", "URGENCIA"],
      implantacao_status: [
        "A_EXECUTAR",
        "EM_EXECUCAO",
        "CONCLUIDO_IMPLANTACAO",
      ],
      project_status: [
        "RASCUNHO",
        "ENVIADO",
        "EM_ANALISE",
        "PENDENTE_INFO",
        "APROVADO_PROJETO",
        "RECUSADO",
        "CANCELADO",
      ],
      sale_status: ["NAO_INICIADO", "EM_ANDAMENTO", "CONCLUIDO"],
    },
  },
} as const
