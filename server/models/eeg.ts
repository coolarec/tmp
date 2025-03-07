import sqlite3 from 'sqlite3'
import { join } from 'path'

const db = new sqlite3.Database(join(process.cwd(), 'eeg_data.db'))

// 确保表存在
db.run(`
  CREATE TABLE IF NOT EXISTS eeg_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp REAL,
    theta_pow REAL,
    low_alpha REAL,
    high_alpha REAL,
    low_beta REAL,
    autism_prob REAL,
    normal_prob REAL,
    mse_loss REAL
  )
`)

export default db 