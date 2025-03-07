import sqlite3 from 'sqlite3'
import { join } from 'path'

const db = new sqlite3.Database(join(process.cwd(), 'asd_detection.db'))

// 确保表存在
db.run(`
  CREATE TABLE IF NOT EXISTS detection_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME,
    autistic_score REAL,
    non_autistic_score REAL
  )
`)

export interface DetectionResult {
  timestamp: string
  autistic_score: number
  non_autistic_score: number
}

export interface AverageScores {
  avg_autistic_score: number
  avg_non_autistic_score: number
}

export default db 