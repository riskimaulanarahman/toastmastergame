export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: "admin" | "participant";
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: "admin" | "participant";
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: "admin" | "participant";
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: "profiles_id_fkey"; columns: ["id"]; referencedRelation: "users"; referencedColumns: ["id"] }];
      };
      game_sets: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          image_path: string;
          total_items: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          image_path: string;
          total_items?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          image_path?: string;
          total_items?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "game_sets_created_by_fkey"; columns: ["created_by"]; referencedRelation: "users"; referencedColumns: ["id"] }];
      };
      game_set_answers: {
        Row: {
          id: number;
          game_set_id: string;
          item_number: number;
          answer_text: string;
          accepted_aliases: string[];
        };
        Insert: {
          id?: number;
          game_set_id: string;
          item_number: number;
          answer_text: string;
          accepted_aliases?: string[];
        };
        Update: {
          id?: number;
          game_set_id?: string;
          item_number?: number;
          answer_text?: string;
          accepted_aliases?: string[];
        };
        Relationships: [{ foreignKeyName: "game_set_answers_game_set_id_fkey"; columns: ["game_set_id"]; referencedRelation: "game_sets"; referencedColumns: ["id"] }];
      };
      game_sessions: {
        Row: {
          id: string;
          game_set_id: string;
          title: string;
          status: "draft" | "scheduled" | "live" | "finished";
          duration_seconds: number;
          start_at: string | null;
          end_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_set_id: string;
          title: string;
          status?: "draft" | "scheduled" | "live" | "finished";
          duration_seconds: number;
          start_at?: string | null;
          end_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_set_id?: string;
          title?: string;
          status?: "draft" | "scheduled" | "live" | "finished";
          duration_seconds?: number;
          start_at?: string | null;
          end_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "game_sessions_game_set_id_fkey"; columns: ["game_set_id"]; referencedRelation: "game_sets"; referencedColumns: ["id"] },
          { foreignKeyName: "game_sessions_created_by_fkey"; columns: ["created_by"]; referencedRelation: "users"; referencedColumns: ["id"] }
        ];
      };
      participants: {
        Row: {
          id: string;
          session_id: string;
          display_name: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          display_name: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          display_name?: string;
          joined_at?: string;
        };
        Relationships: [{ foreignKeyName: "participants_session_id_fkey"; columns: ["session_id"]; referencedRelation: "game_sessions"; referencedColumns: ["id"] }];
      };
      submissions: {
        Row: {
          id: string;
          session_id: string;
          participant_id: string;
          submitted_at: string;
          time_elapsed_seconds: number;
          score: number;
          total_correct: number;
        };
        Insert: {
          id?: string;
          session_id: string;
          participant_id: string;
          submitted_at?: string;
          time_elapsed_seconds: number;
          score?: number;
          total_correct?: number;
        };
        Update: {
          id?: string;
          session_id?: string;
          participant_id?: string;
          submitted_at?: string;
          time_elapsed_seconds?: number;
          score?: number;
          total_correct?: number;
        };
        Relationships: [
          { foreignKeyName: "submissions_session_id_fkey"; columns: ["session_id"]; referencedRelation: "game_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "submissions_participant_id_fkey"; columns: ["participant_id"]; referencedRelation: "participants"; referencedColumns: ["id"] }
        ];
      };
      submission_answers: {
        Row: {
          id: number;
          submission_id: string;
          item_number: number;
          answer_text: string;
          is_correct: boolean;
        };
        Insert: {
          id?: number;
          submission_id: string;
          item_number: number;
          answer_text: string;
          is_correct?: boolean;
        };
        Update: {
          id?: number;
          submission_id?: string;
          item_number?: number;
          answer_text?: string;
          is_correct?: boolean;
        };
        Relationships: [{ foreignKeyName: "submission_answers_submission_id_fkey"; columns: ["submission_id"]; referencedRelation: "submissions"; referencedColumns: ["id"] }];
      };
      participant_tokens: {
        Row: {
          participant_id: string;
          session_id: string;
          token_hash: string;
          created_at: string;
        };
        Insert: {
          participant_id: string;
          session_id: string;
          token_hash: string;
          created_at?: string;
        };
        Update: {
          participant_id?: string;
          session_id?: string;
          token_hash?: string;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: "participant_tokens_participant_id_fkey"; columns: ["participant_id"]; referencedRelation: "participants"; referencedColumns: ["id"] }];
      };
    };
    Views: {
      leaderboard_view: {
        Row: {
          session_id: string;
          participant_id: string;
          display_name: string;
          total_correct: number;
          time_elapsed_seconds: number;
          submitted_at: string;
          rank_position: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type DbTable<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
