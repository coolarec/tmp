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
      leftHeartProgress.value = Math.round(latestData.autistic_score)
      
      // 使用新的状态描述函数
      leftHeartStatus.value = getLeftHeartStatus(leftHeartProgress.value)
      
      // 如果存在统计数据，更新周平均值
      if (result.statistics) {
        lastWeekAsdAvg.value = result.statistics.avgAutismProb * 100
      }
      
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
    const response = await fetch('/api/eeg?limit=1', { signal })
    const result = await response.json()
    if (result.success) {
      // 更新右心的数据
      if (result.data.length > 0) {
        const latestData = result.data[0]
        rightHeartProgress.value = Math.round(latestData.normal_prob * 100)  // 转换为百分比
        rightHeartStatus.value = getRightHeartStatus(rightHeartProgress.value)

        // 直接使用API返回的统计数据
        if (result.statistics) {
          lastWeekEegAvg.value = result.statistics.avgNormalProb * 100  // 转换为百分比
          
          // 计算趋势
          const diff = rightHeartProgress.value - lastWeekEegAvg.value
          if (diff > 5) {
            eegTrend.value = '脑电波指标高于平均水平'
          } else if (diff < -5) {
            eegTrend.value = '脑电波指标低于平均水平，建议关注'
          } else {
            eegTrend.value = '脑电波指标处于平均水平'
          }
        }

        // 更新评估和建议
        updateAssessmentAndAdvice()
      }
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

// 更新两种数据 - Add basic data fetching
const updateAllData = async () => {
  const controllers = await Promise.all([
    fetchASDData(),
    fetchEEGData()
  ])
  
  // 更新两种数据的趋势
  fetchASDTrendData()
  fetchEEGTrendData()
  
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

  // 检查数据是否有效
  if (isNaN(autismProb) || isNaN(eegNormalProb)) {
    console.warn('检测到无效数据:', { autismProb, eegNormalProb })
    return
  }

  const assessmentParts: string[] = []
  const adviceParts: string[] = []

  // 计算综合分数（行为特征分数需要反向计算，因为高分表示异常）
  const invertedAutismProb = 100 - autismProb  // 反转行为特征分数
  const compositeScore = Math.round((invertedAutismProb * 0.5) + (eegNormalProb * 0.5))
  const compositeStatus = compositeScore >= 80 ? '良好' : compositeScore >= 60 ? '正常' : '需要关注'

  // 添加综合分数显示
  assessmentParts.push('<div class="composite-score">')
  assessmentParts.push(`<h3>【综合评分】</h3>`)
  assessmentParts.push(`<div class="score-display">`)
  assessmentParts.push(`<p>当前综合评分：<strong>${compositeScore}</strong>分</p>`)
  assessmentParts.push(`<p>状态：<span class="score-status" data-status="${compositeStatus}">${compositeStatus}</span></p>`)
  assessmentParts.push('</div>')
  assessmentParts.push('</div>')

  // ASD 评估部分（加入趋势分析）
  assessmentParts.push('<div class="assessment-section">')
  assessmentParts.push('<span class="section-label label-behavior">行为特征</span>')
  assessmentParts.push('<h3>【行为特征分析】</h3>')
  
  // 确保数值有效再显示
  if (!isNaN(autismProb)) {
    assessmentParts.push(`<p>当前行为特征评分：<strong>${(autismProb).toFixed(2)}%</strong></p>`)
  }
  
  if (!isNaN(lastWeekAsdAvg.value)) {
    assessmentParts.push(`<p>过去一周平均：<strong>${(lastWeekAsdAvg.value/100).toFixed(2)}</strong></p>`)
    
    // 计算与平均值的差异
    const asdDiff = autismProb - lastWeekAsdAvg.value
    if (!isNaN(asdDiff)) {
      const asdDiffText = asdDiff > 0 ? `高于` : `低于`
      assessmentParts.push(`<p>与平均水平相比：<strong>${Math.abs(asdDiff/100).toFixed(2)}</strong> ${asdDiffText}平均值</p>`)
    }
  }

  if (asdTrend.value) {
    assessmentParts.push(`<p>${asdTrend.value}</p>`)
  }

  // 根据自闭症评分添加具体建议
  if (autismProb >= 80) {
    assessmentParts.push('<h3>具体表现</h3>')
    assessmentParts.push('<div class="assessment-text">')
    assessmentParts.push('在社交互动方面表现出显著的困难特征。与他人互动时较为被动，很少主动发起社交行为，在群体活动中往往显得独处或游离。眼神接触明显减少，与他人交流时较少有目光对视的行为。面部表情较为单一，情感表达不够丰富，难以准确传达自己的情绪状态。在行为方面存在明显的重复性动作，如反复摇摆、拍打等刻板行为。兴趣范围比较局限和固定，对特定事物表现出强烈兴趣，但对其他活动参与度较低。这些特征可能会影响到日常生活和学习的正常开展。')
    assessmentParts.push('</div>')
    adviceParts.push(
      '<div class="advice-section">',
      '<span class="section-label label-warning">干预建议</span>',
      '<h3>【专业干预建议】</h3>',
      '<div class="advice-text">',
      '根据目前的评估结果，我们强烈建议您尽快寻求专业的医疗帮助。建议您首选具有自闭症诊疗经验的儿童精神科医生或发展行为儿科医生，进行更全面和专业的评估。同时，建议开始系统的早期干预治疗计划，这对改善症状和提高生活质量至关重要。可以考虑参加专业的社交技能训练课程，这些课程通常由经验丰富的治疗师指导，能够有针对性地提升社交能力。在家庭环境中，建立规律且结构化的生活和学习计划也很重要，这有助于建立稳定的生活节奏和行为模式。此外，我们建议家长积极参与相关的家长培训课程，学习专业的育儿知识和技巧，了解如何更好地支持和帮助孩子。',
      '</div>',
      '<h3>具体训练方向</h3>',
      '<div class="advice-text">',
      '社交技能训练方面，建议通过结构化的游戏活动和情境模拟来提升社交能力。可以从简单的双人互动开始，逐步过渡到小组活动，帮助建立基本的社交技能。在语言交流训练方面，需要注重口语表达和语言理解能力的提升，可以通过日常对话、故事阅读等方式来强化。感觉统合训练也很重要，这能帮助更好地处理和整合各种感官刺激，提高环境适应能力。在行为干预方面，建议采用正向行为支持策略，通过强化正确行为来减少重复性行为，同时培养更多适应性行为。此外，还可以考虑音乐治疗、职业治疗等辅助手段，这些都能从不同角度促进整体发展。',
      '</div>',
      '<h3>家庭配合建议</h3>',
      '<div class="advice-text">',
      '家庭环境是康复训练的重要场所，建议家长积极配合专业治疗方案。在日常生活中，可以创造更多的互动机会，比如一起玩游戏、看图书、做家务等。保持环境的稳定性和可预测性，这有助于减少焦虑感。建立清晰的日常规范和奖励机制，鼓励积极的行为表现。同时要注意观察记录孩子的进步，这些记录对调整训练方案很有帮助。此外，也要关注家庭其他成员的需求，保持良好的家庭氛围。',
      '</div>',
      '</div>'
    )
  } else if (autismProb >= 60) {
    assessmentParts.push('<h3>具体表现</h3>')
    assessmentParts.push('<div class="assessment-text">')
    assessmentParts.push('在社交互动方面表现出一定的特殊性，虽然能够进行基本的社交互动，但质量和深度还有提升空间。与他人互动时表现出一定的不自然，但在熟悉的环境中能够逐渐适应。眼神接触呈现间歇性特点，有时能够保持适当的目光交流，有时则会回避。情感表达相对减少，但在特定情况下仍能表达基本情绪。行为方面偶尔出现重复性动作，但程度较轻。兴趣活动相对固定，但在引导下能够尝试和接受新事物，这显示出良好的可塑性。总的来说，这些特征虽然存在，但通过适当干预有望获得明显改善。')
    assessmentParts.push('</div>')
    adviceParts.push(
      '<div class="advice-section">',
      '<span class="section-label label-warning">干预建议</span>',
      '<h3>【发展建议】</h3>',
      '<div class="advice-text">',
      '建议及时安排专业评估，以便更准确地了解发展状况。目前阶段需要特别关注社交发展，可以通过增加有质量的互动游戏和活动来促进社交能力的提升。在日常生活中，保持规律的作息时间很重要，这有助于情绪的稳定和行为的规范。同时，建议与老师保持密切沟通，了解在校表现，特别是群体活动中的参与情况。可以考虑参加一些兴趣小组或社交技能训练课程，这些活动能在专业指导下提供更多社交练习的机会。',
      '</div>',
      '<h3>重点关注方向</h3>',
      '<div class="advice-text">',
      '在社交互动方面，建议创造更多与同龄人自然交往的机会，可以从共同兴趣出发，逐步建立社交联系。培养多样化的兴趣爱好很重要，这不仅能扩展生活体验，也能提供更多社交话题和互动机会。在情感表达训练方面，可以通过角色扮演、情景模拟等方式，练习识别和表达不同的情绪。建立良好的沟通渠道也很关键，要鼓励表达想法和需求，同时也要学会倾听和理解他人。在行为引导方面，采用积极正向的方式，通过示范和鼓励来培养更多适应性行为。',
      '</div>',
      '<h3>家庭支持策略</h3>',
      '<div class="advice-text">',
      '家庭应该创造温暖支持的氛围，给予足够的理解和耐心。在日常生活中，可以设计一些有趣的互动游戏，增加亲子互动的质量。保持生活的规律性，建立清晰的日常流程，这能帮助建立安全感。同时要注意观察孩子的兴趣点，以此为基础扩展活动范围。在遇到困难时，及时给予鼓励和适当的帮助，培养独立解决问题的能力。此外，也要关注家庭成员的心理健康，保持积极乐观的态度。',
      '</div>',
      '</div>'
    )
  } else {
    assessmentParts.push('<h3>发展表现</h3>')
    assessmentParts.push('<div class="assessment-text">')
    assessmentParts.push('目前的社交互动能力表现良好，能够自然地与他人建立和维持社交关系。在群体活动中表现活跃，能够主动参与互动并建立良好的人际关系。眼神交流自然且得当，能够通过适当的目光接触增进交流效果。情感表达丰富多样，能够准确传达自己的情绪状态，并能理解他人的情感表现。行为模式灵活且适应性强，能够根据不同场合调整自己的行为表现。兴趣爱好广泛，乐于尝试新事物，显示出良好的认知灵活性和学习能力。这些特征表明目前的发展状况处于正常范围内。')
    assessmentParts.push('</div>')
    adviceParts.push(
      '<div class="advice-section">',
      '<span class="section-label label-behavior">发展建议</span>',
      '<h3>【持续发展建议】</h3>',
      '<div class="advice-text">',
      '目前的发展状况良好，建议继续保持现有的生活学习方式。可以适当增加一些具有挑战性的社交活动，这将有助于进一步提升社交技能。在日常生活中，保持规律的作息习惯很重要，这能确保持续稳定的发展。建议多参与一些创造性活动，这不仅能够开发潜能，也能提供更丰富的成长体验。同时，可以尝试担任一些小组活动的组织者角色，这样能够锻炼领导力和协调能力。',
      '</div>',
      '<h3>能力提升方向</h3>',
      '<div class="advice-text">',
      '在已有良好基础上，可以进一步拓展发展空间。建议参与更多样化的群体活动，这能提供不同层次的社交体验。可以尝试一些新的兴趣领域，培养多元化的才能。在与他人互动时，可以尝试更深层次的交流，培养同理心和情感洞察力。鼓励参与一些志愿服务活动，这能培养社会责任感和助人意识。在学习方面，可以尝试一些具有挑战性的项目，这将促进认知能力的全面发展。',
      '</div>',
      '<h3>长期发展规划</h3>',
      '<div class="advice-text">',
      '着眼于长远发展，建议制定更全面的成长计划。可以根据个人兴趣和特长，选择一些重点发展的领域进行深入学习。培养良好的学习习惯和时间管理能力，这对未来的发展很重要。保持开放和积极的心态，勇于接受新的挑战。同时也要注意劳逸结合，培养健康的生活方式。鼓励建立长期的友谊关系，这将成为成长过程中重要的支持系统。',
      '</div>',
      '</div>'
    )
  }

  // EEG 评估部分
  assessmentParts.push('<div class="assessment-section">')
  assessmentParts.push('<span class="section-label label-eeg">脑电波</span>')
  assessmentParts.push('<h3>【脑电波分析】</h3>')
  
  // 确保数值有效再显示
  if (!isNaN(eegNormalProb)) {
    assessmentParts.push(`<p>当前正常概率：<strong>${eegNormalProb.toFixed(1)}%</strong></p>`)
  }
  
  if (!isNaN(lastWeekEegAvg.value)) {
    assessmentParts.push(`<p>过去一周平均：<strong>${lastWeekEegAvg.value.toFixed(1)}%</strong></p>`)
    
    // 计算与平均值的差异
    const eegDiff = eegNormalProb - lastWeekEegAvg.value
    if (!isNaN(eegDiff)) {
      const eegDiffText = eegDiff > 0 ? `高于` : `低于`
      assessmentParts.push(`<p>与平均水平相比：<strong>${Math.abs(eegDiff).toFixed(1)}%</strong> ${eegDiffText}平均值</p>`)
    }
  }

  if (eegTrend.value) {
    assessmentParts.push(`<p>${eegTrend.value}</p>`)
  }

  // 根据脑电波正常概率添加具体建议
  if (eegNormalProb < 60) {
    assessmentParts.push('<h3>具体表现</h3>')
    assessmentParts.push('<div class="assessment-text">')
    assessmentParts.push('脑电波异常活动明显，可能存在注意力和认知功能的波动。建议进行进一步的专业评估。')
    assessmentParts.push('</div>')
    adviceParts.push(
      '<div class="advice-section">',
      '<span class="section-label label-warning">脑电波建议</span>',
      '<h3>【专业干预建议】</h3>',
      '<div class="advice-text">',
      '建议尽快就医进行专业的脑电图检查和评估。同时，可以考虑以下方面的调整：\n' +
      '1. 保持规律的作息时间，确保充足的睡眠\n' +
      '2. 避免过度疲劳和压力\n' +
      '3. 适当进行放松训练和冥想\n' +
      '4. 控制电子产品的使用时间\n' +
      '5. 保持适度的体育锻炼',
      '</div>',
      '</div>'
    )
  } else if (eegNormalProb < 80) {
    assessmentParts.push('<h3>具体表现</h3>')
    assessmentParts.push('<div class="assessment-text">')
    assessmentParts.push('脑电波存在轻微异常，认知功能基本正常。建议继续定期监测观察。')
    assessmentParts.push('</div>')
    adviceParts.push(
      '<div class="advice-section">',
      '<span class="section-label label-warning">脑电波建议</span>',
      '<h3>【日常调节建议】</h3>',
      '<div class="advice-text">',
      '建议采取以下措施改善脑电波状态：\n' +
      '1. 保持良好的作息习惯\n' +
      '2. 适当进行注意力训练\n' +
      '3. 增加户外活动时间\n' +
      '4. 保持积极乐观的心态\n' +
      '5. 定期进行脑电波监测',
      '</div>',
      '</div>'
    )
  } else {
    assessmentParts.push('<h3>具体表现</h3>')
    assessmentParts.push('<div class="assessment-text">')
    assessmentParts.push('脑电波状态良好，认知功能正常。')
    assessmentParts.push('</div>')
    adviceParts.push(
      '<div class="advice-section">',
      '<span class="section-label label-eeg">脑电波建议</span>',
      '<h3>【维持建议】</h3>',
      '<div class="advice-text">',
      '目前脑电波状态良好，建议：\n' +
      '1. 继续保持规律的生活作息\n' +
      '2. 适度参与智力开发活动\n' +
      '3. 保持充足的休息和运动\n' +
      '4. 避免过度用脑和疲劳\n' +
      '5. 定期进行状态监测',
      '</div>',
      '</div>'
    )
  }

  assessmentParts.push('</div>')

  // 更新显示内容
  overallAssessment.value = assessmentParts.join('')
  professionalAdvice.value = adviceParts.join('')
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
      
      // 计算平均值（添加安全检查）
      let recentAvg = 0
      let previousAvg = 0
      
      if (recentWeekData.length > 0) {
        recentAvg = recentWeekData.reduce((acc: number, curr: ASDData) => {
          const score = Number(curr.autistic_score)
          return acc + (isNaN(score) ? 0 : score)
        }, 0) / recentWeekData.length
      }
      
      if (previousWeekData.length > 0) {
        previousAvg = previousWeekData.reduce((acc: number, curr: ASDData) => {
          const score = Number(curr.autistic_score)
          return acc + (isNaN(score) ? 0 : score)
        }, 0) / previousWeekData.length
      }
      
      // 更新周平均值（添加取整）
      lastWeekAsdAvg.value = Math.round(recentAvg * 100)
      
      // 计算变化率（添加安全检查）
      let change = 0
      if (previousAvg !== 0 && !isNaN(previousAvg) && !isNaN(recentAvg)) {
        change = ((recentAvg - previousAvg) / previousAvg) * 100
      }
      
      weeklyChange.value = { ...weeklyChange.value, asd: Math.round(change) }
      
      // 设置趋势描述
      if (!isNaN(change)) {
        if (change > 5) {
          asdTrend.value = '行为特征呈上升趋势，建议加强关注'
        } else if (change < -5) {
          asdTrend.value = '行为特征呈改善趋势，请继续保持'
        } else {
          asdTrend.value = '行为特征保持稳定'
        }
      } else {
        asdTrend.value = '暂无足够数据分析趋势'
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
      
      // 更新右心的实时数据
      const latestData = data[0]
      if (latestData && !isNaN(latestData.normal_prob)) {
        rightHeartProgress.value = Math.round(latestData.normal_prob * 100)
        rightHeartStatus.value = getRightHeartStatus(rightHeartProgress.value)
      }
      
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
      
      // 计算平均值（添加安全检查）
      let recentAvg = 0
      let previousAvg = 0
      
      if (recentWeekData.length > 0) {
        recentAvg = recentWeekData.reduce((acc: number, curr: EEGData) => {
          const prob = Number(curr.normal_prob)
          return acc + (isNaN(prob) ? 0 : prob)
        }, 0) / recentWeekData.length
      }
      
      if (previousWeekData.length > 0) {
        previousAvg = previousWeekData.reduce((acc: number, curr: EEGData) => {
          const prob = Number(curr.normal_prob)
          return acc + (isNaN(prob) ? 0 : prob)
        }, 0) / previousWeekData.length
      }
      
      // 更新周平均值（添加取整）
      lastWeekEegAvg.value = Math.round(recentAvg * 100)
      
      // 计算变化率（添加安全检查）
      let change = 0
      if (previousAvg !== 0 && !isNaN(previousAvg) && !isNaN(recentAvg)) {
        change = ((recentAvg - previousAvg) / previousAvg) * 100
      }
      
      weeklyChange.value = { ...weeklyChange.value, eeg: Math.round(change) }
      
      // 设置趋势描述
      if (!isNaN(change)) {
        if (change > 5) {
          eegTrend.value = '脑电波指标呈改善趋势，请继续保持'
        } else if (change < -5) {
          eegTrend.value = '脑电波指标呈下降趋势，建议关注'
        } else {
          eegTrend.value = '脑电波指标保持稳定'
        }
      } else {
        eegTrend.value = '暂无足够数据分析趋势'
      }

      // 更新评估和建议
      updateAssessmentAndAdvice()
    }
  } catch (error) {
    console.error('Error fetching EEG trend data:', error)
  }
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
  max-width: 1200px;  /* 添加最大宽度 */
  margin: 0 auto;     /* 水平居中 */
  width: 100%;        /* 确保占满可用空间 */
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
  align-items: center;  /* 添加水平居中 */
  width: 100%;         /* 确保宽度占满 */
}

.hearts-container {
  display: flex;
  justify-content: center;  /* 修改为居中对齐 */
  width: 100%;
  max-width: 1000px;      /* 添加最大宽度 */
  height: 100%;
  align-items: center;
  margin: 0 auto;         /* 水平居中 */
}

.heart-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  max-width: 450px;      /* 限制每个心形区域的最大宽度 */
}

.left-heart {
  padding-right: 50px;
  justify-content: center;
  padding-left: 50px;    /* 进一步增加左侧padding */
}

.right-heart {
  padding-left: 50px;
  justify-content: center;
  padding-right: 50px;   /* 进一步增加右侧padding */
}

.heart-progress-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;            /* 保持心形和进度条之间的间距 */
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

/* 添加新的样式 */
.advice-text {
  color: #444;
  line-height: 1.8;
  font-size: 14px;
  margin: 15px 0;
  text-align: justify;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 6px;
  border-left: 3px solid #2080f0;
}

.advice-section h3 {
  color: #333;
  font-size: 16px;
  margin: 20px 0 10px 0;
  font-weight: 600;
}

.section-label {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 10px;
}

.assessment-text {
  color: #444;
  line-height: 1.8;
  font-size: 14px;
  margin: 15px 0;
  text-align: justify;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 6px;
  border-left: 3px solid #2080f0;
}

.assessment-section {
  margin-bottom: 20px;
  padding: 15px;
  background-color: white;
  border-radius: 8px;
}

.assessment-section h3 {
  color: #333;
  font-size: 16px;
  margin: 20px 0 10px 0;
  font-weight: 600;
}

.assessment-section p {
  margin: 10px 0;
  line-height: 1.6;
}

.assessment-section strong {
  color: #2080f0;
  font-weight: 600;
}

.composite-score {
  margin-bottom: 24px;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.composite-score h3 {
  color: #333;
  font-size: 16px;
  margin: 0 0 12px 0;
  font-weight: 600;
}

.score-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-display p {
  margin: 0;
  line-height: 1.6;
}

.score-display strong {
  color: #2080f0;
  font-weight: 600;
}

.score-status {
  font-size: 14px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 4px;
  background-color: rgba(32, 128, 240, 0.1);
  color: #2080f0;
}

/* 根据分数状态动态改变颜色 */
.score-status[data-status="良好"] {
  background-color: rgba(24, 160, 88, 0.1);
  color: #18a058;
}

.score-status[data-status="正常"] {
  background-color: rgba(240, 160, 32, 0.1);
  color: #f0a020;
}

.score-status[data-status="需要关注"] {
  background-color: rgba(208, 48, 80, 0.1);
  color: #d03050;
}

/* 添加动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.composite-score {
  animation: fadeIn 0.3s ease-out;
}
</style> 