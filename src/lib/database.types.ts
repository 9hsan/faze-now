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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bracket_matches: {
        Row: {
          bracket_id: string
          clip_a: string | null
          clip_b: string | null
          id: string
          round: number
          slot: number
          status: string
          votes_a: number
          votes_b: number
          winner_id: string | null
        }
        Insert: {
          bracket_id: string
          clip_a?: string | null
          clip_b?: string | null
          id?: string
          round: number
          slot: number
          status?: string
          votes_a?: number
          votes_b?: number
          winner_id?: string | null
        }
        Update: {
          bracket_id?: string
          clip_a?: string | null
          clip_b?: string | null
          id?: string
          round?: number
          slot?: number
          status?: string
          votes_a?: number
          votes_b?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bracket_matches_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_clip_a_fkey"
            columns: ["clip_a"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_clip_b_fkey"
            columns: ["clip_b"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_votes: {
        Row: {
          choice: string
          created_at: string
          match_id: string
          user_id: string
        }
        Insert: {
          choice: string
          created_at?: string
          match_id: string
          user_id?: string
        }
        Update: {
          choice?: string
          created_at?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bracket_votes_choice_fkey"
            columns: ["choice"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "bracket_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brackets: {
        Row: {
          category: string
          champion_id: string | null
          created_at: string
          current_round: number
          id: string
          season: number
          size: number
          status: string
          title: string
        }
        Insert: {
          category: string
          champion_id?: string | null
          created_at?: string
          current_round?: number
          id?: string
          season?: number
          size: number
          status?: string
          title: string
        }
        Update: {
          category?: string
          champion_id?: string | null
          created_at?: string
          current_round?: number
          id?: string
          season?: number
          size?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "brackets_champion_id_fkey"
            columns: ["champion_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_votes: {
        Row: {
          clip_a: string
          clip_b: string
          created_at: string
          id: number
          voter_id: string
          watched_a: number | null
          watched_b: number | null
          winner_id: string
        }
        Insert: {
          clip_a: string
          clip_b: string
          created_at?: string
          id?: never
          voter_id: string
          watched_a?: number | null
          watched_b?: number | null
          winner_id: string
        }
        Update: {
          clip_a?: string
          clip_b?: string
          created_at?: string
          id?: never
          voter_id?: string
          watched_a?: number | null
          watched_b?: number | null
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_votes_clip_a_fkey"
            columns: ["clip_a"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_votes_clip_b_fkey"
            columns: ["clip_b"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_votes_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      clips: {
        Row: {
          category: string
          created_at: string
          creator_label: string | null
          duration_s: number | null
          id: string
          impressions: number
          matches: number
          orientation: string
          owner_id: string | null
          rating: number
          season: number
          status: string
          thumb_path: string | null
          title: string
          video_path: string
          wins: number
        }
        Insert: {
          category: string
          created_at?: string
          creator_label?: string | null
          duration_s?: number | null
          id?: string
          impressions?: number
          matches?: number
          orientation?: string
          owner_id?: string | null
          rating?: number
          season?: number
          status?: string
          thumb_path?: string | null
          title: string
          video_path: string
          wins?: number
        }
        Update: {
          category?: string
          created_at?: string
          creator_label?: string | null
          duration_s?: number | null
          id?: string
          impressions?: number
          matches?: number
          orientation?: string
          owner_id?: string | null
          rating?: number
          season?: number
          status?: string
          thumb_path?: string | null
          title?: string
          video_path?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "clips_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_summaries: {
        Row: {
          creator_id: string
          generated_at: string
          summary: string
          week_of: string
        }
        Insert: {
          creator_id: string
          generated_at?: string
          summary: string
          week_of: string
        }
        Update: {
          creator_id?: string
          generated_at?: string
          summary?: string
          week_of?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_summaries_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          avatar_url: string | null
          created_at: string
          handle: string | null
          id: string
          name: string
          sort: number
          youtube_channel_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          handle?: string | null
          id: string
          name: string
          sort?: number
          youtube_channel_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          name?: string
          sort?: number
          youtube_channel_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: number
          kind: string
          post_id: string | null
          read_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: never
          kind: string
          post_id?: string | null
          read_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: never
          kind?: string
          post_id?: string | null
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          amount: number
          created_at: string
          id: number
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: never
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: never
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          choice: string
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          choice: string
          created_at?: string
          post_id: string
          user_id?: string
        }
        Update: {
          choice?: string
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_upvotes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_upvotes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_upvotes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_upvotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_fan_type: string | null
          author_id: string | null
          body: string
          created_at: string
          creator_id: string | null
          featured_week: string | null
          fulfilled_at: string | null
          fulfilled_video_id: string | null
          id: string
          no_count: number
          source: string
          source_author: string | null
          source_likes: number | null
          source_ref: string | null
          status: string
          theme_id: string | null
          type: string
          upvote_count: number
          yes_count: number
        }
        Insert: {
          author_fan_type?: string | null
          author_id?: string | null
          body: string
          created_at?: string
          creator_id?: string | null
          featured_week?: string | null
          fulfilled_at?: string | null
          fulfilled_video_id?: string | null
          id?: string
          no_count?: number
          source?: string
          source_author?: string | null
          source_likes?: number | null
          source_ref?: string | null
          status?: string
          theme_id?: string | null
          type: string
          upvote_count?: number
          yes_count?: number
        }
        Update: {
          author_fan_type?: string | null
          author_id?: string | null
          body?: string
          created_at?: string
          creator_id?: string | null
          featured_week?: string | null
          fulfilled_at?: string | null
          fulfilled_video_id?: string | null
          id?: string
          no_count?: number
          source?: string
          source_author?: string | null
          source_likes?: number | null
          source_ref?: string | null
          status?: string
          theme_id?: string | null
          type?: string
          upvote_count?: number
          yes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          era: string | null
          fan_type: string | null
          id: string
          is_admin: boolean
          points: number
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          era?: string | null
          fan_type?: string | null
          id: string
          is_admin?: boolean
          points?: number
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          era?: string | null
          fan_type?: string | null
          id?: string
          is_admin?: boolean
          points?: number
          username?: string
        }
        Relationships: []
      }
      themes: {
        Row: {
          created_at: string
          creator_id: string | null
          id: string
          label: string
          post_count: number
          summary: string | null
          total_support: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          id?: string
          label: string
          post_count?: number
          summary?: string | null
          total_support?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          id?: string
          label?: string
          post_count?: number
          summary?: string | null
          total_support?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "themes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      posts_feed: {
        Row: {
          author_avatar: string | null
          author_fan_type: string | null
          author_id: string | null
          author_username: string | null
          body: string | null
          created_at: string | null
          creator_id: string | null
          creator_name: string | null
          featured_week: string | null
          fulfilled_at: string | null
          fulfilled_video_id: string | null
          hot: number | null
          id: string | null
          no_count: number | null
          source: string | null
          source_author: string | null
          source_likes: number | null
          source_ref: string | null
          status: string | null
          theme_id: string | null
          type: string | null
          upvote_count: number | null
          yes_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advance_bracket: { Args: { p_bracket: string }; Returns: Json }
      cast_clip_vote: {
        Args: {
          p_clip_a: string
          p_clip_b: string
          p_watched_a?: number
          p_watched_b?: number
          p_winner: string
        }
        Returns: Json
      }
      create_bracket: {
        Args: { p_category: string; p_size: number; p_title: string }
        Returns: string
      }
      fulfill_post: {
        Args: { p_post: string; p_video_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      next_matchup: {
        Args: { p_category?: string }
        Returns: {
          category: string
          created_at: string
          creator_label: string | null
          duration_s: number | null
          id: string
          impressions: number
          matches: number
          orientation: string
          owner_id: string | null
          rating: number
          season: number
          status: string
          thumb_path: string | null
          title: string
          video_path: string
          wins: number
        }[]
        SetofOptions: {
          from: "*"
          to: "clips"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_featured: {
        Args: { p_post: string; p_week: string }
        Returns: undefined
      }
      set_post_status: {
        Args: { p_post: string; p_status: string }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
