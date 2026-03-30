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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          analysis_type: string
          created_at: string
          dataset_id: string
          id: string
          insights: Json | null
          recommendations: Json | null
          statistics: Json | null
          summary: string | null
        }
        Insert: {
          analysis_type: string
          created_at?: string
          dataset_id: string
          id?: string
          insights?: Json | null
          recommendations?: Json | null
          statistics?: Json | null
          summary?: string | null
        }
        Update: {
          analysis_type?: string
          created_at?: string
          dataset_id?: string
          id?: string
          insights?: Json | null
          recommendations?: Json | null
          statistics?: Json | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chart_suggestion: Json | null
          content: string
          created_at: string
          id: string
          role: string
          sentiment: Json | null
          session_id: string
          suggestions: string[] | null
          user_id: string
        }
        Insert: {
          chart_suggestion?: Json | null
          content: string
          created_at?: string
          id?: string
          role: string
          sentiment?: Json | null
          session_id: string
          suggestions?: string[] | null
          user_id: string
        }
        Update: {
          chart_suggestion?: Json | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          sentiment?: Json | null
          session_id?: string
          suggestions?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sessions: {
        Row: {
          created_at: string
          dataset_name: string
          id: string
          is_active: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dataset_name: string
          id?: string
          is_active?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dataset_name?: string
          id?: string
          is_active?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_chats: {
        Row: {
          content: string
          created_at: string
          dataset_id: string
          id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          dataset_id: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          dataset_id?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_chats_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      database_connections: {
        Row: {
          connection_status: string | null
          created_at: string
          database_name: string
          db_type: string
          encrypted_password: string
          host: string
          id: string
          is_active: boolean
          last_connected_at: string | null
          name: string
          port: number
          ssl_enabled: boolean
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          connection_status?: string | null
          created_at?: string
          database_name: string
          db_type: string
          encrypted_password: string
          host: string
          id?: string
          is_active?: boolean
          last_connected_at?: string | null
          name: string
          port: number
          ssl_enabled?: boolean
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          connection_status?: string | null
          created_at?: string
          database_name?: string
          db_type?: string
          encrypted_password?: string
          host?: string
          id?: string
          is_active?: boolean
          last_connected_at?: string | null
          name?: string
          port?: number
          ssl_enabled?: boolean
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      datasets: {
        Row: {
          cleaned_data: Json | null
          column_count: number | null
          columns: Json | null
          created_at: string
          file_size: number | null
          id: string
          name: string
          original_filename: string
          raw_data: Json | null
          row_count: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cleaned_data?: Json | null
          column_count?: number | null
          columns?: Json | null
          created_at?: string
          file_size?: number | null
          id?: string
          name: string
          original_filename: string
          raw_data?: Json | null
          row_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cleaned_data?: Json | null
          column_count?: number | null
          columns?: Json | null
          created_at?: string
          file_size?: number | null
          id?: string
          name?: string
          original_filename?: string
          raw_data?: Json | null
          row_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      job_history: {
        Row: {
          completed_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          job_id: string
          records_synced: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          job_id: string
          records_synced?: number | null
          started_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          job_id?: string
          records_synced?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scheduled_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_inr: number
          created_at: string
          id: string
          metadata: Json | null
          razorpay_order_id: string
          razorpay_payment_id: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_inr: number
          created_at?: string
          id?: string
          metadata?: Json | null
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_queries: {
        Row: {
          connection_id: string | null
          created_at: string
          execution_count: number | null
          generated_sql: string
          id: string
          is_favorite: boolean | null
          last_executed_at: string | null
          name: string
          natural_language_query: string
          user_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          execution_count?: number | null
          generated_sql: string
          id?: string
          is_favorite?: boolean | null
          last_executed_at?: string | null
          name: string
          natural_language_query: string
          user_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          execution_count?: number | null
          generated_sql?: string
          id?: string
          is_favorite?: boolean | null
          last_executed_at?: string | null
          name?: string
          natural_language_query?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_queries_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          connector_config: Json
          connector_type: string
          created_at: string
          cron_expression: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          last_run_message: string | null
          last_run_status: string | null
          name: string
          next_run_at: string | null
          records_synced: number | null
          schedule_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          connector_config: Json
          connector_type: string
          created_at?: string
          cron_expression?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_message?: string | null
          last_run_status?: string | null
          name: string
          next_run_at?: string | null
          records_synced?: number | null
          schedule_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          connector_config?: Json
          connector_type?: string
          created_at?: string
          cron_expression?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_message?: string | null
          last_run_status?: string | null
          name?: string
          next_run_at?: string | null
          records_synced?: number | null
          schedule_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          duration_hours: number
          features: Json
          id: string
          is_active: boolean
          limits: Json
          name: string
          price_inr: number
          price_usd: number
          slug: string
        }
        Insert: {
          created_at?: string
          duration_hours: number
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name: string
          price_inr: number
          price_usd: number
          slug: string
        }
        Update: {
          created_at?: string
          duration_hours?: number
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name?: string
          price_inr?: number
          price_usd?: number
          slug?: string
        }
        Relationships: []
      }
      user_session_state: {
        Row: {
          id: string
          state_key: string
          state_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          state_key: string
          state_value: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          state_key?: string
          state_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_data: {
        Row: {
          headers: Json | null
          id: string
          payload: Json
          processed: boolean | null
          received_at: string | null
          source_ip: string | null
          user_id: string | null
          webhook_id: string
        }
        Insert: {
          headers?: Json | null
          id?: string
          payload: Json
          processed?: boolean | null
          received_at?: string | null
          source_ip?: string | null
          user_id?: string | null
          webhook_id: string
        }
        Update: {
          headers?: Json | null
          id?: string
          payload?: Json
          processed?: boolean | null
          received_at?: string | null
          source_ip?: string | null
          user_id?: string | null
          webhook_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
