<template>
  <div class="container">
    <!-- 页面说明 -->
    <div class="page-description">
      <n-card>
        <n-space vertical>
          <div class="description-header">
            <n-icon size="24" color="#2080f0">
              <information-circle />
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
      <n-card class="report-card assessment-card">
        <div class="card-header">
          <n-icon size="24" color="#18a058">
            <information-circle />
          </n-icon>
          <n-text class="card-title">综合评估</n-text>
        </div>
        <n-divider />
        <div class="card-content">
          <div class="card-description" v-html="overallAssessment"></div>
        </div>
      </n-card>
      <!-- 建议 -->
      <n-card class="report-card advice-card">
        <div class="card-header">
          <n-icon size="24" color="#2080f0">
            <information-circle />
          </n-icon>
          <n-text class="card-title">专业建议</n-text>
        </div>
        <n-divider />
        <div class="card-content">
          <div class="card-description" v-html="professionalAdvice"></div>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
// Nuxt/Vue auto-imports these composables, no need for explicit imports
// import { ref, onMounted, onUnmounted } from 'vue'
// Remove unused imports
// import { HeartOutline} from '@vicons/ionicons5'

// Import only the icons that are actually used
import { InformationCircle } from '@vicons/ionicons5'
// 内联debounce函数而不是从utils导入
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn(...args);
    }, wait);
  };
}

// Get runtime config for interval timing
const config = useRuntimeConfig()
// 提取需要的原始值，避免存储整个配置对象
const apiRefreshInterval = computed(() => config.public?.apiRefreshInterval || 5000)

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

// Use shallowRef for large data objects that don't need reactivity in their properties
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
const weeklyChange = shallowRef({ asd: 0, eeg: 0 })

// Create a global state for tracking fetch operations
const isFetching = ref(false)

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

// 获取ASD数据 - Optimized with abort controller for cancellation
const fetchASDData = async () => {
  // Skip if already fetching to prevent overlapping requests
  if (isFetching.value) return null
  
  const controller = new AbortController()
  const signal = controller.signal
  
  try {
    isFetching.value = true
    const response = await fetch('/api/asd?limit=1', { signal })
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
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error('Error fetching ASD data:', error)
    }
  } finally {
    isFetching.value = false
  }
  
  return controller
}

// 修改右心的状态描述逻辑
const getRightHeartStatus = (progress: number) => {
  if (progress >= 80) return '脑电波正常'
  if (progress >= 60) return '轻微异常'
  if (progress >= 40) return '中度异常'
  return '严重异常'
}

// 修改 fetchEEGData 函数 - Optimized with abort controller
const fetchEEGData = async () => {
  if (isFetching.value) return null
  
  const controller = new AbortController()
  const signal = controller.signal
  
  try {
    isFetching.value = true
    const response = await fetch('/api/eeg?limit=100', { signal })
    const result = await response.json()
    
    if (result.success && result.data.length > 0) {
      // 更新右心的数据
      const normalProb = result.statistics.avgNormalProb
      rightHeartProgress.value = Math.round(normalProb * 100)
      rightHeartStatus.value = getRightHeartStatus(rightHeartProgress.value)

      // 更新评估和建议时考虑 EEG 数据
      updateAssessmentAndAdvice()
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error('Error fetching EEG data:', error)
    }
  } finally {
    isFetching.value = false
  }
  
  return controller
}

// Optimize trend data fetch with a debounced approach to prevent excessive API calls
// 使用函数引用而不是存储debounce后的函数
function fetchTrendDataWithDebounce() {
  const fetchTrends = async () => {
    await Promise.all([
      fetchASDTrendData(),
      fetchEEGTrendData()
    ]);
  };
  
  // 创建一个新的debounce函数，避免重用
  debounce(fetchTrends, 10000)();
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
      
      // Optimize calculations with batch updates
      const recentAvg = recentWeekData.reduce((acc: number, curr: ASDData) => 
        acc + curr.autistic_score, 0
      ) / recentWeekData.length
      
      const previousAvg = previousWeekData.reduce((acc: number, curr: ASDData) => 
        acc + curr.autistic_score, 0
      ) / previousWeekData.length
      
      lastWeekAsdAvg.value = recentAvg * 100
      
      const change = ((recentAvg - previousAvg) / previousAvg) * 100
      weeklyChange.value = { ...weeklyChange.value, asd: change }
      
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
      
      // Optimize calculations with batch updates
      const recentAvg = recentWeekData.reduce((acc: number, curr: EEGData) => 
        acc + curr.normal_prob, 0
      ) / recentWeekData.length
      
      const previousAvg = previousWeekData.reduce((acc: number, curr: EEGData) => 
        acc + curr.normal_prob, 0
      ) / previousWeekData.length
      
      lastWeekEegAvg.value = recentAvg * 100
      
      const change = ((recentAvg - previousAvg) / previousAvg) * 100
      weeklyChange.value = { ...weeklyChange.value, eeg: change }
      
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

// 更新两种数据 - Add basic data fetching
const updateAllData = async () => {
  const controllers = await Promise.all([
    fetchASDData(),
    fetchEEGData()
  ])
  
  // Also update trend data but less frequently
  fetchTrendDataWithDebounce()
  
  return controllers.filter(Boolean) as AbortController[]
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
  assessmentParts.push('<div class="assessment-section">')
  assessmentParts.push('<span class="section-label label-behavior">行为特征</span>')
  assessmentParts.push('<h3>【行为特征分析】</h3>')
  assessmentParts.push(`<p>当前行为特征评分：<strong>${(autismProb/100).toFixed(2)}</strong></p>`)
  assessmentParts.push(`<p>过去一周平均：<strong>${lastWeekAsdAvg.value.toFixed(1)}%</strong></p>`)
  assessmentParts.push(`<p>周环比变化：<strong>${weeklyChange.value.asd > 0 ? '+' : ''}${weeklyChange.value.asd.toFixed(1)}%</strong></p>`)
  assessmentParts.push(`<p>${asdTrend.value}</p>`)
  
  if (autismProb >= 80) {
    assessmentParts.push('<h3>具体表现：</h3>')
    assessmentParts.push('<ul>')
    assessmentParts.push('<li>社交互动：显著困难，很少主动与他人互动</li>')
    assessmentParts.push('<li>眼神接触：较少或缺乏</li>')
    assessmentParts.push('<li>表情：表情较为单一，较少情感表达</li>')
    assessmentParts.push('<li>重复行为：存在明显的重复性动作</li>')
    assessmentParts.push('<li>兴趣范围：局限且固定</li>')
    assessmentParts.push('</ul>')
    adviceParts.push(
      '<div class="advice-section">',
      '<span class="section-label label-warning">干预建议</span>',
      '<h3>【干预建议】</h3>',
      '<ol>',
      '<li>立即寻求专业的儿童精神科医生或发展行为儿科医生进行全面评估</li>',
      '<li>开始早期干预治疗计划</li>',
      '<li>考虑参加社交技能训练课程</li>',
      '<li>建立规律的生活和学习计划</li>',
      '<li>家长需要学习相关知识，了解如何更好地支持孩子</li>',
      '</ol>',
      '<h3>具体训练方向：</h3>',
      '<ul>',
      '<li>社交技能训练：通过结构化的游戏活动提升社交能力</li>',
      '<li>语言交流训练：改善语言表达和理解能力</li>',
      '<li>感觉统合训练：帮助处理感官刺激</li>',
      '<li>行为干预：减少重复性行为，培养适应性行为</li>',
      '</ul>',
      '</div>'
    )
  } else if (autismProb >= 60) {
    assessmentParts.push('<h3>具体表现：</h3>')
    assessmentParts.push('<ul>')
    assessmentParts.push('<li>社交互动：存在一定困难，但能进行基本互动</li>')
    assessmentParts.push('<li>眼神接触：间歇性的眼神接触</li>')
    assessmentParts.push('<li>表情：情感表达相对减少</li>')
    assessmentParts.push('<li>行为模式：偶有重复性行为</li>')
    assessmentParts.push('<li>兴趣活动：相对固定，但可以接受新事物</li>')
    assessmentParts.push('</ul>')
    adviceParts.push(
      '<div class="advice-section">',
      '<span class="section-label label-warning">干预建议</span>',
      '<h3>【干预建议】</h3>',
      '<ol>',
      '<li>安排专业评估以进一步确认</li>',
      '<li>关注孩子的社交发展</li>',
      '<li>增加互动性游戏和活动</li>',
      '<li>保持规律的作息时间</li>',
      '<li>与老师保持沟通，了解孩子在校表现</li>',
      '</ol>',
      '<h3>建议关注：</h3>',
      '<ul>',
      '<li>增加社交互动机会</li>',
      '<li>培养多样化兴趣</li>',
      '<li>加强情感表达训练</li>',
      '<li>建立良好的沟通渠道</li>',
      '</ul>',
      '</div>'
    )
  } else {
    assessmentParts.push('<h3>具体表现：</h3>')
    assessmentParts.push('<ul>')
    assessmentParts.push('<li>社交互动：基本正常，能主动与他人交往</li>')
    assessmentParts.push('<li>眼神接触：自然且适当</li>')
    assessmentParts.push('<li>表情：情感表达丰富</li>')
    assessmentParts.push('<li>行为模式：灵活多样</li>')
    assessmentParts.push('<li>兴趣范围：广泛且适应性强</li>')
    assessmentParts.push('</ul>')
    adviceParts.push(
      '<div class="advice-section">',
      '<span class="section-label label-behavior">日常建议</span>',
      '<h3>【日常建议】</h3>',
      '<ol>',
      '<li>继续保持当前的生活和学习方式</li>',
      '<li>适当增加社交活动</li>',
      '<li>保持良好的作息习惯</li>',
      '</ol>',
      '<h3>发展方向：</h3>',
      '<ul>',
      '<li>继续培养多元化兴趣爱好</li>',
      '<li>鼓励参与群体活动</li>',
      '<li>保持良好的社交互动</li>',
      '</ul>',
      '</div>'
    )
  }
  assessmentParts.push('</div>')

  // EEG 评估部分（加入趋势分析）
  assessmentParts.push('<div class="assessment-section">')
  assessmentParts.push('<span class="section-label label-eeg">脑电波</span>')
  assessmentParts.push('<h3>【脑电波分析】</h3>')
  assessmentParts.push(`<p>当前正常概率：<strong>${eegNormalProb}%</strong></p>`)
  assessmentParts.push(`<p>过去一周平均：<strong>${lastWeekEegAvg.value.toFixed(1)}%</strong></p>`)
  assessmentParts.push(`<p>周环比变化：<strong>${weeklyChange.value.eeg > 0 ? '+' : ''}${weeklyChange.value.eeg.toFixed(1)}%</strong></p>`)
  assessmentParts.push(`<p>${eegTrend.value}</p>`)

  if (eegNormalProb < 60) {
    assessmentParts.push('<h3>具体表现：</h3>')
    assessmentParts.push('<ul>')
    assessmentParts.push('<li>脑电波异常活动明显</li>')
    assessmentParts.push('<li>可能存在注意力和认知功能的波动</li>')
    assessmentParts.push('<li>需要进一步专业评估</li>')
    assessmentParts.push('</ul>')
    adviceParts.push(
      '<div class="advice-section">',
      '<span class="section-label label-eeg">EEG建议</span>',
      '<h3>【EEG干预建议】</h3>',
      '<ol>',
      '<li>建议进行专业的脑电图检查</li>',
      '<li>咨询神经科医生</li>',
      '<li>保持充足的睡眠</li>',
      '<li>避免过度疲劳和压力</li>',
      '</ol>',
      '<h3>注意事项：</h3>',
      '<ul>',
      '<li>保持规律的作息时间</li>',
      '<li>避免剧烈运动和过度兴奋</li>',
      '<li>定期进行脑电波监测</li>',
      '</ul>',
      '</div>'
    )
  } else if (eegNormalProb < 80) {
    assessmentParts.push('<h3>具体表现：</h3>')
    assessmentParts.push('<ul>')
    assessmentParts.push('<li>脑电波存在轻微异常</li>')
    assessmentParts.push('<li>认知功能基本正常</li>')
    assessmentParts.push('<li>建议定期监测</li>')
    assessmentParts.push('</ul>')
    adviceParts.push(
      '<div class="advice-section">',
      '<span class="section-label label-eeg">EEG建议</span>',
      '<h3>【EEG相关建议】</h3>',
      '<ol>',
      '<li>定期进行脑电波监测</li>',
      '<li>保持规律的作息时间</li>',
      '<li>适当进行放松活动</li>',
      '</ol>',
      '<h3>日常注意：</h3>',
      '<ul>',
      '<li>保持良好的睡眠质量</li>',
      '<li>适度运动，避免过度疲劳</li>',
      '</ul>',
      '</div>'
    )
  }
  assessmentParts.push('</div>')

  // 更新显示内容
  overallAssessment.value = assessmentParts.join('')
  professionalAdvice.value = adviceParts.join('')
}

// Track active controllers for cleanup
let activeControllers: AbortController[] = []
let dataUpdateTimer: NodeJS.Timeout | null = null

onMounted(() => {
  // Initial data fetch
  updateAllData().then(controllers => {
    activeControllers = controllers
  })
  
  // Use the interval from runtime config
  dataUpdateTimer = setInterval(async () => {
    // Abort any pending requests before starting new ones
    activeControllers.forEach(controller => controller?.abort())
    activeControllers = []
    
    // Start new requests
    const newControllers = await updateAllData()
    activeControllers = newControllers
  }, apiRefreshInterval.value)
})

onUnmounted(() => {
  // Clear the interval timer
  if (dataUpdateTimer) {
    clearInterval(dataUpdateTimer)
    dataUpdateTimer = null
  }
  
  // Abort any pending requests
  activeControllers.forEach(controller => controller?.abort())
  activeControllers = []
})
</script>

<style scoped>
.container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  will-change: transform; /* Hardware acceleration */
}

.upper-section {
  height: 60vh;
  display: flex;
  min-height: 400px;
  margin-bottom: 20px;
}

.lower-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 30px;
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
  height: 100%;
  align-items: center;
}

.heart-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
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
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
  height: 220px;
}

.heart-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.heart {
  font-size: 140px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s ease;
  will-change: color;
  height: 100%;
  margin: 0;
}

.progress-bar {
  height: 200px;
  width: 14px;
  display: flex;
  align-items: center;
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
  transition: background-color 0.3s ease, height 0.3s ease;
  will-change: height, background-color;
}

.heart-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  width: 100%;
  height: 100%;
}

.heart-description {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: center;
  margin-top: -10px;
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
  font-size: 15px;
  color: #444;
  display: block;
  white-space: pre-line;
  line-height: 1.8;
}

/* 高亮关键部分 */
:deep(.card-description strong) {
  color: #2080f0;
  font-weight: 600;
}

/* 优化列表样式 */
:deep(.card-description ul) {
  padding-left: 20px;
  margin: 10px 0;
}

:deep(.card-description li) {
  margin-bottom: 6px;
}

/* 突出显示标题 */
:deep(.card-description h3) {
  font-size: 17px;
  color: #333;
  margin: 12px 0 8px 0;
  font-weight: 600;
}

/* 针对特定内容样式化 */
:deep(.card-description p) {
  margin-bottom: 10px;
}

/* 添加分类标识 */
.section-label {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  margin-right: 8px;
  vertical-align: middle;
}

.label-behavior {
  background-color: rgba(24, 160, 88, 0.1);
  color: #18a058;
}

.label-eeg {
  background-color: rgba(32, 128, 240, 0.1);
  color: #2080f0;
}

.label-warning {
  background-color: rgba(240, 160, 32, 0.1);
  color: #f0a020;
}

/* 响应式设计 */
@media (min-width: 1024px) {
  .lower-section {
    flex-direction: row;
    gap: 24px;
  }
  
  .report-card {
    flex: 1;
  }
  
  .card-description {
    font-size: 14px;
  }
}

/* 为不同状态设置边框颜色 */
.status-normal {
  border-left-color: #18a058;
}

.status-warning {
  border-left-color: #f0a020;
}

.status-alert {
  border-left-color: #d03050;
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

/* Add CSS for page transitions */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}

/* 美化下部分 */
.report-card {
  width: 100%;
  transition: box-shadow 0.3s ease;
  border-radius: 12px;
}

.report-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.assessment-card {
  border-left: 4px solid #18a058;
}

.advice-card {
  border-left: 4px solid #2080f0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
}

.card-title {
  font-size: 20px;
  font-weight: bold;
  display: block;
  color: #333;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 10px 0;
}

.card-description {
  font-size: 15px;
  color: #444;
  display: block;
  white-space: pre-line;
  line-height: 1.8;
}
</style> 