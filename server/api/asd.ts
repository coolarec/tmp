import db, { DetectionResult, AverageScores } from '../models/asd'

export default defineEventHandler((event) => {
  return new Promise((resolve, reject) => {
    try {
      const query = getQuery(event)
      const limit = Number(query.limit) || 50

      // 获取最近的检测结果数据
      db.all<DetectionResult[]>(`
        SELECT 
          timestamp,
          autistic_score,
          non_autistic_score
        FROM detection_results
        ORDER BY timestamp DESC
        LIMIT ?
      `, [limit], (err, results) => {
        if (err) {
          reject({
            success: false,
            error: 'Failed to fetch detection results'
          })
          return
        }

        // 计算平均值
        db.get<AverageScores>(`
          SELECT 
            AVG(autistic_score) as avg_autistic_score,
            AVG(non_autistic_score) as avg_non_autistic_score
          FROM detection_results
          ORDER BY timestamp DESC
          LIMIT ?
        `, [limit], (err, avgScores) => {
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
              avgAutisticScore: (avgScores?.avg_autistic_score ?? 0)/100,
              avgNonAutisticScore: (avgScores?.avg_non_autistic_score ?? 0)/100
            }
          })
        })
      })
    } catch (error) {
      console.error('Error fetching detection results:', error)
      reject({
        success: false,
        error: 'Failed to fetch detection results'
      })
    }
  })
}) 