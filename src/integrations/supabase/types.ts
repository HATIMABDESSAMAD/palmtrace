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
      excel_uploads: {
        Row: {
          filename: string
          id: string
          status: string
          total_records: number
          uploaded_at: string
        }
        Insert: {
          filename: string
          id?: string
          status?: string
          total_records?: number
          uploaded_at?: string
        }
        Update: {
          filename?: string
          id?: string
          status?: string
          total_records?: number
          uploaded_at?: string
        }
        Relationships: []
      }
      parcels: {
        Row: {
          block_number: number
          created_at: string | null
          id: string
          parcel_number: number
          sector_number: number
        }
        Insert: {
          block_number: number
          created_at?: string | null
          id?: string
          parcel_number: number
          sector_number: number
        }
        Update: {
          block_number?: number
          created_at?: string | null
          id?: string
          parcel_number?: number
          sector_number?: number
        }
        Relationships: []
      }
      parcels_trees_report: {
        Row: {
          bloc: number
          col: number
          created_at: string | null
          date_de_plantation: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nombre_de_regimes_21_22: number | null
          nombre_de_regimes_22_23: number | null
          nombre_de_regimes_23_24: number | null
          nombre_de_regimes_24_25: number | null
          nombre_de_regimes_25_26: number | null
          parcel: number
          row: number
          sector: number
          superficie_du_bloc: string | null
          updated_at: string | null
          upload_id: string | null
          variete: string | null
        }
        Insert: {
          bloc: number
          col: number
          created_at?: string | null
          date_de_plantation?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nombre_de_regimes_21_22?: number | null
          nombre_de_regimes_22_23?: number | null
          nombre_de_regimes_23_24?: number | null
          nombre_de_regimes_24_25?: number | null
          nombre_de_regimes_25_26?: number | null
          parcel: number
          row: number
          sector: number
          superficie_du_bloc?: string | null
          updated_at?: string | null
          upload_id?: string | null
          variete?: string | null
        }
        Update: {
          bloc?: number
          col?: number
          created_at?: string | null
          date_de_plantation?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nombre_de_regimes_21_22?: number | null
          nombre_de_regimes_22_23?: number | null
          nombre_de_regimes_23_24?: number | null
          nombre_de_regimes_24_25?: number | null
          nombre_de_regimes_25_26?: number | null
          parcel?: number
          row?: number
          sector?: number
          superficie_du_bloc?: string | null
          updated_at?: string | null
          upload_id?: string | null
          variete?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcels_trees_report_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "excel_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trees: {
        Row: {
          col_index: number
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          parcel_id: string
          row_index: number
          tree_id: string
        }
        Insert: {
          col_index: number
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          parcel_id: string
          row_index: number
          tree_id: string
        }
        Update: {
          col_index?: number
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          parcel_id?: string
          row_index?: number
          tree_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trees_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "viewer"
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
      app_role: ["admin", "viewer"],
    },
  },
} as const
