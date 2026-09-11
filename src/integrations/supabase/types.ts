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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          details: string | null
          id: string
          parcel_id: string | null
          timestamp: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          details?: string | null
          id?: string
          parcel_id?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          details?: string | null
          id?: string
          parcel_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      couriers: {
        Row: {
          company_name: string
          created_at: string
          id: string
          tracking_number: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          tracking_number?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          tracking_number?: string | null
        }
        Relationships: []
      }
      guards: {
        Row: {
          created_at: string
          id: string
          name: string
          shift: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          shift?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          shift?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          parcel_id: string | null
          read: boolean
          title: string
          unit_id: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          id?: string
          parcel_id?: string | null
          read?: boolean
          title: string
          unit_id?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          parcel_id?: string | null
          read?: boolean
          title?: string
          unit_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      parcels: {
        Row: {
          claim_token: string
          claim_ts: string | null
          claimed_by_name: string | null
          condition_flag: boolean
          condition_note: string | null
          courier_id: string | null
          created_at: string
          dispute_note: string | null
          dispute_status:
            | Database["public"]["Enums"]["dispute_resolution"]
            | null
          guard_id_in: string | null
          id: string
          intake_ts: string
          is_proxy_claim: boolean
          parcel_identifier: string | null
          photo_url: string | null
          qr_expiry_ts: string
          status: Database["public"]["Enums"]["parcel_status"]
          storage_id: string | null
          token_used: boolean
          unit_id: string
        }
        Insert: {
          claim_token?: string
          claim_ts?: string | null
          claimed_by_name?: string | null
          condition_flag?: boolean
          condition_note?: string | null
          courier_id?: string | null
          created_at?: string
          dispute_note?: string | null
          dispute_status?:
            | Database["public"]["Enums"]["dispute_resolution"]
            | null
          guard_id_in?: string | null
          id?: string
          intake_ts?: string
          is_proxy_claim?: boolean
          parcel_identifier?: string | null
          photo_url?: string | null
          qr_expiry_ts?: string
          status?: Database["public"]["Enums"]["parcel_status"]
          storage_id?: string | null
          token_used?: boolean
          unit_id: string
        }
        Update: {
          claim_token?: string
          claim_ts?: string | null
          claimed_by_name?: string | null
          condition_flag?: boolean
          condition_note?: string | null
          courier_id?: string | null
          created_at?: string
          dispute_note?: string | null
          dispute_status?:
            | Database["public"]["Enums"]["dispute_resolution"]
            | null
          guard_id_in?: string | null
          id?: string
          intake_ts?: string
          is_proxy_claim?: boolean
          parcel_identifier?: string | null
          photo_url?: string | null
          qr_expiry_ts?: string
          status?: Database["public"]["Enums"]["parcel_status"]
          storage_id?: string | null
          token_used?: boolean
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcels_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcels_guard_id_in_fkey"
            columns: ["guard_id_in"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcels_storage_id_fkey"
            columns: ["storage_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcels_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      residents: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          unit_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          unit_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          unit_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          capacity: number
          created_at: string
          id: string
          shelf_code: string
          zone: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          shelf_code: string
          zone: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          shelf_code?: string
          zone?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          building: string
          created_at: string
          floor: number
          id: string
          unit_number: string
        }
        Insert: {
          building?: string
          created_at?: string
          floor?: number
          id?: string
          unit_number: string
        }
        Update: {
          building?: string
          created_at?: string
          floor?: number
          id?: string
          unit_number?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      my_unit_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      actor_type: "guard" | "resident" | "admin" | "system"
      app_role: "guard" | "resident" | "admin"
      dispute_resolution: "open" | "accepted" | "rejected"
      parcel_status:
        | "registered"
        | "stored"
        | "notified"
        | "claimed"
        | "disputed"
        | "escalated"
        | "returned"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      actor_type: ["guard", "resident", "admin", "system"],
      app_role: ["guard", "resident", "admin"],
      dispute_resolution: ["open", "accepted", "rejected"],
      parcel_status: [
        "registered",
        "stored",
        "notified",
        "claimed",
        "disputed",
        "escalated",
        "returned",
      ],
    },
  },
} as const
