export type Me = { id: number; nickname: string; week_goal_days: number; in_ranking: boolean }

export type EnterResponse = { token: string; user: { id: number; nickname: string } }

export type Conclusion = {
  id: number
  points: number
  goal_met: boolean
  streak_before: number
  streak_after: number
}

export type SessionRow = {
  id: number
  topic: string
  part_id: number | null
  day: string
  active_seconds: number
  goal_minutes: number
  goal_met: boolean
  points: number
  note: string | null
}

export type TrailSummary = {
  trail_id: number
  title: string
  parts_done: number
  parts_total: number
}

export type Progress = {
  streak: number
  freezes: number
  studied_today: boolean
  saved_days: string[]
  studied_days: string[]
  week_days: number
  week_goal_days: number
  total_points: number
  week_points: number
  minutes_by_topic: { topic: string; minutes: number }[]
  trails: TrailSummary[]
}

export type TrailVideo = { youtube_id: string; title: string; channel: string; duration_s: number }

export type TrailPart = {
  id: number
  order: number
  title: string
  done: boolean
  videos: TrailVideo[]
}

export type Trail = {
  id: number
  title: string
  status: 'generating' | 'ready' | 'failed'
  step: string
  error: 'quota' | 'ai' | 'erro' | null
  parts: TrailPart[]
}

export type CatalogItem = { trail_id: number; title: string }

export type QuizQuestion = { id: number; question: string; options: string[]; source: 'topic' | 'video' }
export type AnswerResult = { correct: boolean; correct_index: number; explanation: string }

export type Ranking = {
  top: { nickname: string; week_points: number; streak: number }[]
  me: { position: number; week_points: number } | null
}
