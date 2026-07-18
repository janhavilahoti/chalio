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
      activities: {
        Row: {
          avg_speed_kmh: number
          calories: number
          coins_awarded: number
          created_at: string
          distance_km: number
          duration_seconds: number
          ended_at: string | null
          id: string
          path: Json
          started_at: string
          steps: number
          user_id: string
        }
        Insert: {
          avg_speed_kmh?: number
          calories?: number
          coins_awarded?: number
          created_at?: string
          distance_km?: number
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          path?: Json
          started_at?: string
          steps?: number
          user_id: string
        }
        Update: {
          avg_speed_kmh?: number
          calories?: number
          coins_awarded?: number
          created_at?: string
          distance_km?: number
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          path?: Json
          started_at?: string
          steps?: number
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          color: string | null
          earned_at: string
          id: string
          mission_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          color?: string | null
          earned_at?: string
          id?: string
          mission_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          color?: string | null
          earned_at?: string
          id?: string
          mission_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_requests: {
        Row: {
          business_name: string
          contact_info: string
          created_at: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reward_offer_description: string
          status: string
          target_mission_type: string
          user_id: string
        }
        Insert: {
          business_name: string
          contact_info: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reward_offer_description: string
          status?: string
          target_mission_type: string
          user_id: string
        }
        Update: {
          business_name?: string
          contact_info?: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reward_offer_description?: string
          status?: string
          target_mission_type?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_activity: {
        Row: {
          active_minutes: number
          calories: number
          coins_awarded: number
          created_at: string
          date: string
          distance_km: number
          id: string
          steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_minutes?: number
          calories?: number
          coins_awarded?: number
          created_at?: string
          date: string
          distance_km?: number
          id?: string
          steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_minutes?: number
          calories?: number
          coins_awarded?: number
          created_at?: string
          date?: string
          distance_km?: number
          id?: string
          steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          is_sponsored: boolean
          reward_coins: number
          sponsor_name: string | null
          starts_at: string | null
          target_type: string
          target_value: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          is_sponsored?: boolean
          reward_coins?: number
          sponsor_name?: string | null
          starts_at?: string | null
          target_type: string
          target_value: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          is_sponsored?: boolean
          reward_coins?: number
          sponsor_name?: string | null
          starts_at?: string | null
          target_type?: string
          target_value?: number
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_note: string | null
          area: string | null
          avatar_url: string | null
          city: string | null
          coins: number
          created_at: string
          current_streak: number
          daily_goal: number
          fit_connected: boolean
          flag_reason: string | null
          id: string
          is_admin: boolean
          is_flagged: boolean
          last_login_date: string | null
          leaderboard_excluded: boolean
          longest_streak: number
          name: string | null
          previous_rank: number | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          area?: string | null
          avatar_url?: string | null
          city?: string | null
          coins?: number
          created_at?: string
          current_streak?: number
          daily_goal?: number
          fit_connected?: boolean
          flag_reason?: string | null
          id: string
          is_admin?: boolean
          is_flagged?: boolean
          last_login_date?: string | null
          leaderboard_excluded?: boolean
          longest_streak?: number
          name?: string | null
          previous_rank?: number | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          area?: string | null
          avatar_url?: string | null
          city?: string | null
          coins?: number
          created_at?: string
          current_streak?: number
          daily_goal?: number
          fit_connected?: boolean
          flag_reason?: string | null
          id?: string
          is_admin?: boolean
          is_flagged?: boolean
          last_login_date?: string | null
          leaderboard_excluded?: boolean
          longest_streak?: number
          name?: string | null
          previous_rank?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reward_items: {
        Row: {
          brand: string
          category: string | null
          coin_cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          label: string
          redeemed_count: number
        }
        Insert: {
          brand: string
          category?: string | null
          coin_cost: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          label: string
          redeemed_count?: number
        }
        Update: {
          brand?: string
          category?: string | null
          coin_cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          label?: string
          redeemed_count?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          claimed: boolean
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          mission_id: string
          progress: number
          user_id: string
        }
        Insert: {
          claimed?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_id: string
          progress?: number
          user_id: string
        }
        Update: {
          claimed?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leaderboard_profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          city: string | null
          coins: number | null
          current_streak: number | null
          id: string | null
          longest_streak: number | null
          name: string | null
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          city?: string | null
          coins?: number | null
          current_streak?: number | null
          id?: string | null
          longest_streak?: number | null
          name?: string | null
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          city?: string | null
          coins?: number | null
          current_streak?: number | null
          id?: string | null
          longest_streak?: number | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_coins: {
        Args: {
          _amount: number
          _metadata?: Json
          _reason: string
          _user: string
        }
        Returns: number
      }
      get_city_activity: {
        Args: { since_date: string; target_city: string }
        Returns: {
          total_steps: number
          user_id: string
        }[]
      }
      get_city_leaderboard: {
        Args: { target_city: string }
        Returns: {
          avatar_url: string
          city: string
          coins: number
          id: string
          name: string
        }[]
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
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
