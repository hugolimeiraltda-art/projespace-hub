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
          laudo_projeto: string | null
          numero_projeto: number
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
          laudo_projeto?: string | null
          numero_projeto?: number
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
          laudo_projeto?: string | null
          numero_projeto?: number
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
          marcacao_croqui_confirmada: boolean | null
          marcacao_croqui_itens: string[] | null
          numero_blocos: number | null
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
          marcacao_croqui_confirmada?: boolean | null
          marcacao_croqui_itens?: string[] | null
          numero_blocos?: number | null
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
          marcacao_croqui_confirmada?: boolean | null
          marcacao_croqui_itens?: string[] | null
          numero_blocos?: number | null
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
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
      app_role: "admin" | "vendedor" | "projetos" | "gerente_comercial"
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
      engineering_status: "EM_RECEBIMENTO" | "EM_PRODUCAO" | "CONCLUIDO"
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
      app_role: ["admin", "vendedor", "projetos", "gerente_comercial"],
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
      engineering_status: ["EM_RECEBIMENTO", "EM_PRODUCAO", "CONCLUIDO"],
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
