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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          archived: boolean
          chosen: string
          correct: boolean
          created_at: string
          id: number
          question_id: number
          seconds: number
          user_id: string
        }
        Insert: {
          archived?: boolean
          chosen: string
          correct: boolean
          created_at?: string
          id?: number
          question_id: number
          seconds?: number
          user_id: string
        }
        Update: {
          archived?: boolean
          chosen?: string
          correct?: boolean
          created_at?: string
          id?: number
          question_id?: number
          seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      blitz_results: {
        Row: {
          created_at: string
          day: string
          score: number
          seconds: number
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          score: number
          seconds?: number
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          score?: number
          seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          question_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          question_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          question_id?: number
          user_id?: string
        }
        Relationships: []
      }
      colleges: {
        Row: {
          created_at: string
          id: string
          name: string
          normalized_name: string | null
          state: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          normalized_name?: string | null
          state: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          normalized_name?: string | null
          state?: string
        }
        Relationships: []
      }
      decks: {
        Row: {
          depth: number
          path: string
          question_count: number
          sort_key: string
          subject: string
        }
        Insert: {
          depth: number
          path: string
          question_count?: number
          sort_key?: string
          subject: string
        }
        Update: {
          depth?: number
          path?: string
          question_count?: number
          sort_key?: string
          subject?: string
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          percent: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          enabled?: boolean
          percent: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          approved_by: string | null
          coupon_code: string | null
          created_at: string
          discount_percent: number
          id: string
          months: number
          payment_reference: string
          plan_id: string
          razorpay_order_id: string | null
          status: string
          total_paise: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          coupon_code?: string | null
          created_at?: string
          discount_percent?: number
          id?: string
          months: number
          payment_reference: string
          plan_id: string
          razorpay_order_id?: string | null
          status?: string
          total_paise: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          coupon_code?: string | null
          created_at?: string
          discount_percent?: number
          id?: string
          months?: number
          payment_reference?: string
          plan_id?: string
          razorpay_order_id?: string | null
          status?: string
          total_paise?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_subjects: {
        Row: {
          plan_id: string
          subject: string
        }
        Insert: {
          plan_id: string
          subject: string
        }
        Update: {
          plan_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_subjects_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admission_year: number | null
          avatar_url: string | null
          city: string | null
          college: string | null
          college_state: string | null
          created_at: string
          dob: string | null
          full_name: string | null
          id: string
          last_celebrated_streak: number
          onboarding_completed_at: string | null
          phone: string | null
          streak_goal: number
          streak_target_days: number
          study_year: string | null
          target_exam: string | null
          updated_at: string
        }
        Insert: {
          admission_year?: number | null
          avatar_url?: string | null
          city?: string | null
          college?: string | null
          college_state?: string | null
          created_at?: string
          dob?: string | null
          full_name?: string | null
          id: string
          last_celebrated_streak?: number
          onboarding_completed_at?: string | null
          phone?: string | null
          streak_goal?: number
          streak_target_days?: number
          study_year?: string | null
          target_exam?: string | null
          updated_at?: string
        }
        Update: {
          admission_year?: number | null
          avatar_url?: string | null
          city?: string | null
          college?: string | null
          college_state?: string | null
          created_at?: string
          dob?: string | null
          full_name?: string | null
          id?: string
          last_celebrated_streak?: number
          onboarding_completed_at?: string | null
          phone?: string | null
          streak_goal?: number
          streak_target_days?: number
          study_year?: string | null
          target_exam?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_log: {
        Row: {
          day: string
          sent_at: string
        }
        Insert: {
          day: string
          sent_at?: string
        }
        Update: {
          day?: string
          sent_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string | null
          deck_path: string
          explanation: string | null
          id: number
          is_free: boolean
          options: Json
          sort_key: string
          stem: string
          subject: string
        }
        Insert: {
          answer?: string | null
          deck_path: string
          explanation?: string | null
          id: number
          is_free?: boolean
          options?: Json
          sort_key?: string
          stem: string
          subject: string
        }
        Update: {
          answer?: string | null
          deck_path?: string
          explanation?: string | null
          id?: number
          is_free?: boolean
          options?: Json
          sort_key?: string
          stem?: string
          subject?: string
        }
        Relationships: []
      }
      quiz_reviews: {
        Row: {
          answered: number
          choices: Json
          completed_at: string
          created_at: string
          id: string
          question_ids: number[]
          quiz_key: string
          score: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answered?: number
          choices?: Json
          completed_at?: string
          created_at?: string
          id: string
          question_ids: number[]
          quiz_key: string
          score?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answered?: number
          choices?: Json
          completed_at?: string
          created_at?: string
          id?: string
          question_ids?: number[]
          quiz_key?: string
          score?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          id: string
          name: string
          original_price_two_year: number | null
          original_price_year: number | null
          price_two_year: number
          price_year: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          enabled?: boolean
          id: string
          name: string
          original_price_two_year?: number | null
          original_price_year?: number | null
          price_two_year: number
          price_year: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          name?: string
          original_price_two_year?: number | null
          original_price_year?: number | null
          price_two_year?: number
          price_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          approved_by: string | null
          created_at: string
          ends_at: string
          id: string
          payment_request_id: string | null
          plan_id: string
          revoked: boolean
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          ends_at: string
          id?: string
          payment_request_id?: string | null
          plan_id: string
          revoked?: boolean
          starts_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          payment_request_id?: string | null
          plan_id?: string
          revoked?: boolean
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: true
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      activate_razorpay_payment: {
        Args: { _paid: number; _request: string }
        Returns: string
      }
      admin_students: {
        Args: { _offset?: number; _search?: string }
        Returns: {
          college: string
          email: string
          full_name: string
          study_year: string
          user_id: string
        }[]
      }
      approve_subscription: {
        Args: {
          _months: number
          _plan: string
          _request?: string
          _start: string
          _user: string
        }
        Returns: string
      }
      complete_onboarding: {
        Args: {
          _admission_year: number
          _college: string
          _phone: string
          _state: string
          _study_year: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_subject_access: { Args: { _subject: string }; Returns: boolean }
      qb_blitz_rank: {
        Args: { _day: string }
        Returns: {
          my_rank: number
          my_score: number
          my_seconds: number
          players: number
        }[]
      }
      qb_daily_counts: {
        Args: { _tz?: string }
        Returns: {
          correct: number
          day: string
          questions: number
          seconds: number
        }[]
      }
      qb_reset: { Args: { _subject?: string }; Returns: undefined }
      qb_subject_stats: {
        Args: never
        Returns: {
          attempted: number
          correct: number
          subject: string
          total: number
        }[]
      }
      quote_plan: {
        Args: { _coupon?: string; _months: number; _plan: string }
        Returns: {
          discount_percent: number
          total_paise: number
        }[]
      }
      refresh_free_questions: { Args: never; Returns: undefined }
      reject_payment: { Args: { _request: string }; Returns: undefined }
      revoke_subscription: { Args: { _id: string }; Returns: undefined }
      submit_payment_request: {
        Args: {
          _coupon: string
          _months: number
          _plan: string
          _reference: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
