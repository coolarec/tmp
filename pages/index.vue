<template>
  <div class="container">
    <!-- 页面说明 -->
    <div class="page-description">
      <n-card>
        <n-space vertical>
          <div class="description-header">
            <n-icon size="24" color="#2080f0">
              <info-circle-filled />
            </n-icon>
            <n-text class="header-text">实时监测系统</n-text>
          </div>
          <n-text class="description-text">
            本系统通过摄像头行为检测和脑电波分析两种方式，实时监测和评估自闭症特征。系统每5秒更新一次数据，并提供一周数据趋势分析。
          </n-text>
          <n-text class="description-details">
            • 左侧心形显示摄像头行为检测结果，评分越高表示行为特征越明显
            • 右侧心形显示脑电波分析结果，评分越高表示脑电波越正常
            • 下方提供详细的评估报告和专业建议
          </n-text>
          <n-divider />
          <n-text class="notice-text" type="warning">
            注意：本系统仅供参考，不能替代专业医生的诊断。如有异常，请及时就医。
          </n-text>
        </n-space>
      </n-card>
    </div>

    <!-- 上部分 (60%) -->
    <div class="upper-section">
      <n-card class="card-container">
        <div class="hearts-container">
          <!-- 左心脏区域 -->
          <div class="heart-section left-heart">
            <div class="heart-content">
              <div class="heart-progress-row">
                <div class="heart-container">
                  <span class="heart" :style="{ color: getHeartColor(leftHeartProgress, true) }">❤</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-rail">
                    <div class="progress-fill" :style="{ 
                      height: `${leftHeartProgress}%`,
                      backgroundColor: getProgressColor(leftHeartProgress, true)
                    }"></div>
                  </div>
                </div>
              </div>
              <div class="heart-description">
                <n-text class="description-title">摄像头检测</n-text>
                <n-text class="description-subtitle">{{ leftHeartStatus }}</n-text>
              </div>
            </div>
          </div>
          <!-- 右心脏区域 -->
          <div class="heart-section right-heart">
            <div class="heart-content">
              <div class="heart-progress-row">
                <div class="heart-container">
                  <span class="heart" :style="{ color: getHeartColor(rightHeartProgress) }">❤</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-rail">
                    <div class="progress-fill" :style="{ 
                      height: `${rightHeartProgress}%`,
                      backgroundColor: getProgressColor(rightHeartProgress)
                    }"></div>
                  </div>
                </div>
              </div>
              <div class="heart-description">
                <n-text class="description-title">脑电波分析</n-text>
                <n-text class="description-subtitle">{{ rightHeartStatus }}</n-text>
              </div>
            </div>
          </div>
        </div>
      </n-card>
    </div>

    <!-- 下部分 (40%) -->
    <div class="lower-section">
      <!-- 综合情况 -->
      <n-card>
        <div class="card-content">
          <n-text class="card-title">综合评估</n-text>
          <n-text class="card-description">{{ overallAssessment }}</n-text>
        </div>
      </n-card>
      <!-- 建议 -->
      <n-card>
        <div class="card-content">
          <n-text class="card-title">专业建议</n-text>
          <n-text class="card-description">{{ professionalAdvice }}</n-text>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { HeartOutline} from '@vicons/ionicons5'

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

interface ASDData {
  timestamp: string
  autistic_score: number
  non_autistic_score: number
}

// 添加数据响应接口
interface APIResponse<T> {
  success: boolean
  data: T[]
  statistics?: {
    avgAutismProb: number
    avgNormalProb: number
  }
}

const leftHeartProgress = ref(0)
const rightHeartProgress = ref(0)
const leftHeartStatus = ref('')
const rightHeartStatus = ref('')
const overallAssessment = ref('')
const professionalAdvice = ref('')

// 添加趋势分析相关的状态
const asdTrend = ref('')
const eegTrend = ref('')
const lastWeekAsdAvg = ref(0)
const lastWeekEegAvg = ref(0)
const weeklyChange = ref({ asd: 0, eeg: 0 })

// 修改左心的状态描述逻辑
const getLeftHeartStatus = (progress: number) => {
  if (progress >= 80) return '行为异常'
  if (progress >= 60) return '轻微异常'
  if (progress >= 40) return '基本正常'
  return '状态正常'
}

// 修改颜色逻辑，使其反转（因为对于摄像头检测，高分表示异常）
const getHeartColor = (percentage: number, isLeft: boolean = false) => {
  if (isLeft) {
    // 左边的心（摄像头检测）：高分表示异常
    if (percentage >= 80) return '#d03050' // 红色
    if (percentage >= 60) return '#f0a020' // 橙色
    return '#18a058' // 绿色
  } else {
    // 右边的心（脑电波）：高分表示正常
    if (percentage >= 80) return '#18a058' // 绿色
    if (percentage >= 60) return '#f0a020' // 橙色
    return '#d03050' // 红色
  }
}

const getProgressColor = (percentage: number, isLeft: boolean = false) => {
  return getHeartColor(percentage, isLeft)
}

// 获取ASD数据
const fetchASDData = async () => {
  try {
    const response = await fetch('/api/asd?limit=1')
    const result = await response.json()
    
    if (result.success && result.data.length > 0) {
      const latestData = result.data[0]
      // 将自闭症评分转换为百分比
      leftHeartProgress.value = Math.round(latestData.autistic_score * 100)
      
      // 使用新的状态描述函数
      leftHeartStatus.value = getLeftHeartStatus(leftHeartProgress.value)
      
      // 更新评估和建议
      updateAssessmentAndAdvice()
    }
  } catch (error) {
    console.error('Error fetching ASD data:', error)
  }
}

// 修改右心的状态描述逻辑
const getRightHeartStatus = (progress: number) => {
  if (progress >= 80) return '脑电波正常'
  if (progress >= 60) return '轻微异常'
  if (progress >= 40) return '中度异常'
  return '严重异常'
}

// 修改 fetchEEGData 函数
const fetchEEGData = async () => {
  try {
    const response = await fetch('/api/eeg?limit=100')
    const result = await response.json()
    
    if (result.success && result.data.length > 0) {
      // 更新右心的数据
      const normalProb = result.statistics.avgNormalProb
      rightHeartProgress.value = Math.round(normalProb * 100)
      rightHeartStatus.value = getRightHeartStatus(rightHeartProgress.value)

      // 更新评估和建议时考虑 EEG 数据
      updateAssessmentAndAdvice()
    }
  } catch (error) {
    console.error('Error fetching EEG data:', error)
  }
}

// 获取一周的ASD数据并分析趋势
const fetchASDTrendData = async () => {
  try {
    const response = await fetch('/api/asd?limit=1000')
    const result = await response.json() as APIResponse<ASDData>
    
    if (result.success && result.data.length > 0) {
      const data = result.data.reverse()
      
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      
      const recentWeekData = data.filter((item: ASDData) => 
        new Date(item.timestamp) > oneWeekAgo
      )
      const previousWeekData = data.filter((item: ASDData) => 
        new Date(item.timestamp) <= oneWeekAgo && 
        new Date(item.timestamp) > twoWeeksAgo
      )
      
      const recentAvg = recentWeekData.reduce((acc: number, curr: ASDData) => 
        acc + curr.autistic_score, 0
      ) / recentWeekData.length
      
      const previousAvg = previousWeekData.reduce((acc: number, curr: ASDData) => 
        acc + curr.autistic_score, 0
      ) / previousWeekData.length
      
      lastWeekAsdAvg.value = recentAvg * 100
      const change = ((recentAvg - previousAvg) / previousAvg) * 100
      weeklyChange.value.asd = change
      
      // 设置趋势描述
      if (change > 5) {
        asdTrend.value = '行为特征呈上升趋势，建议加强关注'
      } else if (change < -5) {
        asdTrend.value = '行为特征呈改善趋势，请继续保持'
      } else {
        asdTrend.value = '行为特征保持稳定'
      }
    }
  } catch (error) {
    console.error('Error fetching ASD trend data:', error)
  }
}

// 获取一周的EEG数据并分析趋势
const fetchEEGTrendData = async () => {
  try {
    const response = await fetch('/api/eeg?limit=1000')
    const result = await response.json() as APIResponse<EEGData>
    
    if (result.success && result.data.length > 0) {
      const data = result.data
      
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      
      const recentWeekData = data.filter((item: EEGData) => 
        new Date(item.timestamp) > oneWeekAgo
      )
      const previousWeekData = data.filter((item: EEGData) => 
        new Date(item.timestamp) <= oneWeekAgo && 
        new Date(item.timestamp) > twoWeeksAgo
      )
      
      const recentAvg = recentWeekData.reduce((acc: number, curr: EEGData) => 
        acc + curr.normal_prob, 0
      ) / recentWeekData.length
      
      const previousAvg = previousWeekData.reduce((acc: number, curr: EEGData) => 
        acc + curr.normal_prob, 0
      ) / previousWeekData.length
      
      lastWeekEegAvg.value = recentAvg * 100
      const change = ((recentAvg - previousAvg) / previousAvg) * 100
      weeklyChange.value.eeg = change
      
      // 设置趋势描述
      if (change > 5) {
        eegTrend.value = '脑电波指标呈改善趋势'
      } else if (change < -5) {
        eegTrend.value = '脑电波指标呈下降趋势，建议关注'
      } else {
        eegTrend.value = '脑电波指标保持稳定'
      }
    }
  } catch (error) {
    console.error('Error fetching EEG trend data:', error)
  }
}

// 更新两种数据
const updateAllData = async () => {
  await Promise.all([
    fetchASDData(),
    fetchEEGData(),
    fetchASDTrendData(),
    fetchEEGTrendData()
  ])
}

// 根据进度获取状态描述
const getStatusDescription = (progress: number) => {
  if (progress >= 80) return '状态良好'
  if (progress >= 60) return '状态正常'
  return '需要关注'
}

// 更新评估和建议的函数，同时考虑 ASD 和 EEG 数据
const updateAssessmentAndAdvice = () => {
  const autismProb = leftHeartProgress.value
  const eegNormalProb = rightHeartProgress.value

  let assessmentParts = []
  let adviceParts = []

  // ASD 评估部分（加入趋势分析）
  assessmentParts.push('【行为特征分析】')
  assessmentParts.push(`当前行为特征评分：${autismProb/100}%`)
  assessmentParts.push(`过去一周平均：${lastWeekAsdAvg.value.toFixed(1)}%`)
  assessmentParts.push(`周环比变化：${weeklyChange.value.asd > 0 ? '+' : ''}${weeklyChange.value.asd.toFixed(1)}%`)
  assessmentParts.push(asdTrend.value)
  
  if (autismProb >= 80) {
    assessmentParts.push('\n具体表现：')
    assessmentParts.push('• 社交互动：显著困难，很少主动与他人互动')
    assessmentParts.push('• 眼神接触：较少或缺乏')
    assessmentParts.push('• 表情：表情较为单一，较少情感表达')
    assessmentParts.push('• 重复行为：存在明显的重复性动作')
    assessmentParts.push('• 兴趣范围：局限且固定')
    adviceParts.push(
      '【干预建议】',
      '1. 立即寻求专业的儿童精神科医生或发展行为儿科医生进行全面评估',
      '2. 开始早期干预治疗计划',
      '3. 考虑参加社交技能训练课程',
      '4. 建立规律的生活和学习计划',
      '5. 家长需要学习相关知识，了解如何更好地支持孩子',
      '\n具体训练方向：',
      '• 社交技能训练：通过结构化的游戏活动提升社交能力',
      '• 语言交流训练：改善语言表达和理解能力',
      '• 感觉统合训练：帮助处理感官刺激',
      '• 行为干预：减少重复性行为，培养适应性行为'
    )
  } else if (autismProb >= 60) {
    assessmentParts.push('\n具体表现：')
    assessmentParts.push('• 社交互动：存在一定困难，但能进行基本互动')
    assessmentParts.push('• 眼神接触：间歇性的眼神接触')
    assessmentParts.push('• 表情：情感表达相对减少')
    assessmentParts.push('• 行为模式：偶有重复性行为')
    assessmentParts.push('• 兴趣活动：相对固定，但可以接受新事物')
    adviceParts.push(
      '【干预建议】',
      '1. 安排专业评估以进一步确认',
      '2. 关注孩子的社交发展',
      '3. 增加互动性游戏和活动',
      '4. 保持规律的作息时间',
      '5. 与老师保持沟通，了解孩子在校表现',
      '\n建议关注：',
      '• 增加社交互动机会',
      '• 培养多样化兴趣',
      '• 加强情感表达训练',
      '• 建立良好的沟通渠道'
    )
  } else {
    assessmentParts.push('\n具体表现：')
    assessmentParts.push('• 社交互动：基本正常，能主动与他人交往')
    assessmentParts.push('• 眼神接触：自然且适当')
    assessmentParts.push('• 表情：情感表达丰富')
    assessmentParts.push('• 行为模式：灵活多样')
    assessmentParts.push('• 兴趣范围：广泛且适应性强')
    adviceParts.push(
      '【日常建议】',
      '1. 继续保持当前的生活和学习方式',
      '2. 适当增加社交活动',
      '3. 保持良好的作息习惯',
      '\n发展方向：',
      '• 继续培养多元化兴趣爱好',
      '• 鼓励参与群体活动',
      '• 保持良好的社交互动'
    )
  }

  // EEG 评估部分（加入趋势分析）
  assessmentParts.push('\n【脑电波分析】')
  assessmentParts.push(`当前正常概率：${eegNormalProb}%`)
  assessmentParts.push(`过去一周平均：${lastWeekEegAvg.value.toFixed(1)}%`)
  assessmentParts.push(`周环比变化：${weeklyChange.value.eeg > 0 ? '+' : ''}${weeklyChange.value.eeg.toFixed(1)}%`)
  assessmentParts.push(eegTrend.value)

  if (eegNormalProb < 60) {
    assessmentParts.push('\n具体表现：')
    assessmentParts.push('• 脑电波异常活动明显')
    assessmentParts.push('• 可能存在注意力和认知功能的波动')
    assessmentParts.push('• 需要进一步专业评估')
    adviceParts.push(
      '\n【EEG干预建议】',
      '1. 建议进行专业的脑电图检查',
      '2. 咨询神经科医生',
      '3. 保持充足的睡眠',
      '4. 避免过度疲劳和压力',
      '\n注意事项：',
      '• 保持规律的作息时间',
      '• 避免剧烈运动和过度兴奋',
      '• 定期进行脑电波监测'
    )
  } else if (eegNormalProb < 80) {
    assessmentParts.push('\n具体表现：')
    assessmentParts.push('• 脑电波存在轻微异常')
    assessmentParts.push('• 认知功能基本正常')
    assessmentParts.push('• 建议定期监测')
    adviceParts.push(
      '\n【EEG相关建议】',
      '1. 定期进行脑电波监测',
      '2. 保持规律的作息时间',
      '3. 适当进行放松活动',
      '\n日常注意：',
      '• 保持良好的睡眠质量',
      '• 适度运动，避免过度疲劳'
    )
  }

  // 更新显示内容
  overallAssessment.value = assessmentParts.join('\n')
  professionalAdvice.value = adviceParts.join('\n')
}

onMounted(() => {
  updateAllData()
  // 设置定时器定期更新数据
  const timer = setInterval(updateAllData, 5000) // 每5秒更新一次
  
  onUnmounted(() => {
    clearInterval(timer)
  })
})
</script>

<style scoped>
.container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.upper-section {
  height: 60vh;
  display: flex;
}

.lower-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lower-section > .n-card {
  width: 100%;
}

.card-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hearts-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.heart-section {
  flex: 1;
  display: flex;
  align-items: center;
}

.left-heart {
  justify-content: center;
  padding-left: 20px;
}

.right-heart {
  justify-content: center;
  padding-right: 20px;
}

.heart-progress-row {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.heart-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.heart {
  font-size: 140px;
  line-height: 1;
  display: block;
  transition: color 0.3s ease; /* 添加颜色过渡动画 */
}

.progress-bar {
  height: 200px;
  width: 14px;
}

.progress-rail {
  height: 100%;
  width: 100%;
  background-color: #eaeaea;
  border-radius: 7px;
  position: relative;
}

.progress-fill {
  position: absolute;
  bottom: 0;
  width: 100%;
  border-radius: 7px;
  transition: background-color 0.3s ease; /* 添加颜色过渡动画 */
}

.heart-content {
  display: flex;
  flex-direction: column;
  align-items: center;  /* 确保所有内容居中 */
  gap: 20px;
  width: 100%;
}

.heart-description {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.description-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  display: block;
}

.description-subtitle {
  font-size: 16px;
  color: #666;
  text-align: center;
  display: block;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: bold;
  display: block;
}

.card-description {
  font-size: 14px;
  color: #666;
  display: block;
  white-space: pre-line; /* 允许显示换行符 */
  line-height: 1.6;
}

.page-description {
  margin-bottom: 20px;
}

.description-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.header-text {
  font-size: 20px;
  font-weight: bold;
  color: #2080f0;
}

.description-text {
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 12px;
}

.description-details {
  font-size: 14px;
  line-height: 1.8;
  color: #666;
  white-space: pre-line;
}

.notice-text {
  font-size: 14px;
  font-weight: bold;
}
</style> 