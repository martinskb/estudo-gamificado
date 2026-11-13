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
