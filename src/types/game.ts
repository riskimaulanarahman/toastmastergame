import type { DbTable } from "@/types/database";

export interface GameSetWithAnswers extends DbTable<"game_sets"> {
  game_set_answers: Array<DbTable<"game_set_answers">>;
}

export interface SessionWithGameSet extends DbTable<"game_sessions"> {
  game_sets: Pick<DbTable<"game_sets">, "id" | "title" | "description" | "image_path"> | null;
}

export interface LeaderboardRow {
  participant_id: string;
  display_name: string;
  total_correct: number;
  time_elapsed_seconds: number;
  submitted_at: string;
  rank_position: number;
}

export interface WaitingParticipant {
  id: string;
  display_name: string;
  joined_at: string;
}

export interface SubmissionEvaluationResult {
  totalCorrect: number;
  answers: Array<{
    item_number: number;
    answer_text: string;
    is_correct: boolean;
  }>;
}
