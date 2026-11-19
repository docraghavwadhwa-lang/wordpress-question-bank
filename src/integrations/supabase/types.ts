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
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          college: string | null
          created_at: string
          dob: string | null
          full_name: string | null
          id: string
          last_celebrated_streak: number
          phone: string | null
          streak_goal: number
          streak_target_days: number
          study_year: string | null
          target_exam: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          college?: string | null
          created_at?: string
          dob?: string | null
          full_name?: string | null
          id: string
          last_celebrated_streak?: number
          phone?: string | null
          streak_goal?: number
          streak_target_days?: number
          study_year?: string | null
          target_exam?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          college?: string | null
          created_at?: string
          dob?: string | null
          full_name?: string | null
          id?: string
          last_celebrated_streak?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    Enums: {},
  },
} as const
