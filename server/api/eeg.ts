import db from '../models/eeg'

interface EEGData {
  timestamp: number
  theta_pow: number
  low_alpha: number
  high_alpha: number
  low_beta: number
  autism_prob: number
  normal_prob: number
  mse_loss: number
}

interface AverageProbs {
  avg_autism_prob: number
  avg_normal_prob: number
}

export default defineEventHandler((event) => {
  return new Promise((resolve, reject) => {
    try {
      const query = getQuery(event)
      const limit = Number(query.limit) || 100

      // 获取最近的数据
      db.all<EEGData[]>(`
        SELECT 
          timestamp,
          theta_pow,
          low_alpha,
          high_alpha,
          low_beta,
          autism_prob,
          normal_prob,
          mse_loss
        FROM eeg_data
        ORDER BY timestamp DESC
        LIMIT ?
      `, [limit], (err, results) => {
        if (err) {
          reject({
            success: false,
            error: 'Failed to fetch EEG data'
          })
          return
        }

        // 计算平均值
        db.get<AverageProbs>(`
          SELECT 
            AVG(autism_prob) as avg_autism_prob,
            AVG(normal_prob) as avg_normal_prob
          FROM eeg_data
          ORDER BY timestamp DESC
          LIMIT ?
        `, [limit], (err, avgProbs) => {
          if (err) {
            reject({
              success: false,
              error: 'Failed to calculate averages'
            })
            return
          }

          resolve({
            success: true,
            data: results,
            statistics: {
              avgAutismProb: avgProbs?.avg_autism_prob ?? 0,
              avgNormalProb: avgProbs?.avg_normal_prob ?? 0
            }
          })
        })
      })
    } catch (error) {
      console.error('Error fetching EEG data:', error)
      reject({
        success: false,
        error: 'Failed to fetch EEG data'
      })
    }
  })
}) 