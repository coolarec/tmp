<template>
  <div class="container">
    <!-- EEG 图表区域 -->
    <div class="charts-section">
      <n-card>
        <template #header>
          <div class="card-header">
            <n-text class="header-title">脑电波实时监测</n-text>
            <n-text class="header-subtitle">最近100条数据的可视化分析</n-text>
          </div>
        </template>
        
        <div class="charts-container">
          <!-- 脑电波频段图表 -->
          <div class="chart-wrapper">
            <div ref="brainwaveChartRef" class="chart"></div>
          </div>
          
          <!-- 概率对比图表 -->
          <div class="chart-wrapper">
            <div ref="probChartRef" class="chart"></div>
          </div>
        </div>
      </n-card>
    </div>

    <!-- 数据说明部分 -->
    <div class="description-section">
      <n-card>
        <n-space vertical>
          <n-text class="section-title">数据指标说明</n-text>
          
          <div class="description-block">
            <n-text class="sub-title">【脑电波频段说明】</n-text>
            <n-text class="detail-text">
              • Theta波 (4-8Hz)：与注意力、记忆和情感处理相关<br>
              • 低频Alpha波 (8-10Hz)：表示放松状态和基础认知活动<br>
              • 高频Alpha波 (10-13Hz)：反映高级认知处理和注意力集中<br>
              • 低频Beta波 (13-20Hz)：与意识清醒和积极思维相关<br>
            </n-text>
          </div>

          <div class="description-block">
            <n-text class="sub-title">【评估指标解释】</n-text>
            <n-text class="detail-text">
              • 自闭症概率：基于脑电波特征计算的自闭症可能性<br>
              • 正常概率：脑电波模式符合正常范围的概率<br>
              • MSE损失：模型预测的误差值，越低表示预测越准确<br>
            </n-text>
          </div>

          <div class="description-block">
            <n-text class="sub-title">【数据解读建议】</n-text>
            <n-text class="detail-text">
              • 关注各频段波形的相对强度变化<br>
              • 注意自闭症概率的突变情况<br>
              • 结合正常概率进行综合评估<br>
              • 定期观察MSE损失值的稳定性<br>
            </n-text>
          </div>

          <n-divider />
          
          <n-text class="warning-text" type="warning">
            注意：脑电波数据易受外界干扰，建议在安静、稳定的环境下进行检测。异常数据请咨询专业医师进行解读。
          </n-text>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts/core'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent
} from 'echarts/components'
import { LineChart } from 'echarts/charts'
import { UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

// 注册必需的组件
echarts.use([
  GridComponent,
  TooltipComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  UniversalTransition,
  DataZoomComponent
])

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

const loading = ref(true)
const tableData = ref<EEGData[]>([])
const brainwaveChartRef = ref<HTMLElement | null>(null)
const probChartRef = ref<HTMLElement | null>(null)
let brainwaveChart: echarts.ECharts | null = null
let probChart: echarts.ECharts | null = null

// 初始化脑电波频段图表
const initBrainwaveChart = () => {
  if (!brainwaveChartRef.value) return
  
  brainwaveChart = echarts.init(brainwaveChartRef.value)
  const option = {
    title: {
      text: '脑电波频段分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = `${new Date(params[0].value[0]).toLocaleString()}<br/>`
        params.forEach((param: any) => {
          result += `${param.seriesName}: ${param.value[1].toFixed(4)}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['Theta波', '低频Alpha波', '高频Alpha波', '低频Beta波'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        start: 70,
        end: 100
      }
    ],
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: (value: string) => {
          return new Date(value).toLocaleTimeString()
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '波形强度'
    },
    series: [
      {
        name: 'Theta波',
        type: 'line',
        showSymbol: false,
        data: [],
        lineStyle: { width: 1 }
      },
      {
        name: '低频Alpha波',
        type: 'line',
        showSymbol: false,
        data: [],
        lineStyle: { width: 1 }
      },
      {
        name: '高频Alpha波',
        type: 'line',
        showSymbol: false,
        data: [],
        lineStyle: { width: 1 }
      },
      {
        name: '低频Beta波',
        type: 'line',
        showSymbol: false,
        data: [],
        lineStyle: { width: 1 }
      }
    ]
  }
  brainwaveChart.setOption(option)
}

// 初始化概率对比图表
const initProbChart = () => {
  if (!probChartRef.value) return
  
  probChart = echarts.init(probChartRef.value)
  const option = {
    title: {
      text: '自闭症概率分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = `${new Date(params[0].value[0]).toLocaleString()}<br/>`
        params.forEach((param: any) => {
          result += `${param.seriesName}: ${(param.value[1]).toFixed(2)}%<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['自闭症概率', '正常概率'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        start: 70,
        end: 100
      }
    ],
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: (value: string) => {
          return new Date(value).toLocaleTimeString()
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '概率',
      axisLabel: {
        formatter: '{value}%'
      },
      max: 100
    },
    series: [
      {
        name: '自闭症概率',
        type: 'line',
        showSymbol: false,
        data: [],
        lineStyle: { width: 2 },
        areaStyle: {
          opacity: 0.1
        }
      },
      {
        name: '正常概率',
        type: 'line',
        showSymbol: false,
        data: [],
        lineStyle: { width: 2 },
        areaStyle: {
          opacity: 0.1
        }
      }
    ]
  }
  probChart.setOption(option)
}

// 更新图表数据
const updateCharts = () => {
  if (!brainwaveChart || !probChart || !tableData.value.length) return

  const data = tableData.value
  
  // 更新脑电波频段图表
  brainwaveChart.setOption({
    series: [
      {
        data: data.map(item => [item.timestamp, item.theta_pow])
      },
      {
        data: data.map(item => [item.timestamp, item.low_alpha])
      },
      {
        data: data.map(item => [item.timestamp, item.high_alpha])
      },
      {
        data: data.map(item => [item.timestamp, item.low_beta])
      }
    ]
  })

  // 更新概率图表
  probChart.setOption({
    series: [
      {
        data: data.map(item => [item.timestamp, item.autism_prob * 100])
      },
      {
        data: data.map(item => [item.timestamp, item.normal_prob * 100])
      }
    ]
  })
}

// 获取数据并更新图表
const fetchEEGData = async () => {
  try {
    loading.value = true
    const response = await fetch('/api/eeg?limit=100')
    const result = await response.json()
    
    if (result.success && result.data) {
      tableData.value = result.data.reverse() // 反转数据使最新的在右边
      updateCharts()
    }
  } catch (error) {
    console.error('Error fetching EEG data:', error)
  } finally {
    loading.value = false
  }
}

// 使用 ResizeObserver 处理图表大小调整
let resizeObserver: ResizeObserver | null = null
let timer: NodeJS.Timeout | null = null;
onMounted(() => {
  initBrainwaveChart()
  initProbChart()
  fetchEEGData()
  timer = setInterval(fetchEEGData, 500)

  // 监听容器大小变化
  if (brainwaveChartRef.value && probChartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      brainwaveChart?.resize()
      probChart?.resize()
    })
    resizeObserver.observe(brainwaveChartRef.value)
    resizeObserver.observe(probChartRef.value)
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (resizeObserver) resizeObserver.disconnect()
  brainwaveChart?.dispose()
  probChart?.dispose()
})
</script>

<style scoped>
.container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 64px;
}

.charts-section {
  margin-bottom: 40px;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-title {
  font-size: 20px;
  font-weight: bold;
  color: #2080f0;
}

.header-subtitle {
  font-size: 14px;
  color: #666;
}

.description-section {
  margin-top: 48px;
  padding: 0 0 32px 0;
}

.section-title {
  font-size: 20px;
  font-weight: bold;
  color: #2080f0;
  margin-bottom: 24px;
  display: block;
}

.description-block {
  margin-bottom: 24px;
  padding: 0 12px;
}

.sub-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
  display: block;
}

.detail-text {
  font-size: 14px;
  color: #666;
  line-height: 2;
  white-space: pre-line;
  display: block;
  padding-left: 8px;
}

.warning-text {
  font-size: 14px;
  font-weight: bold;
  color: #f5a623;
  text-align: center;
  display: block;
  margin-top: 12px;
  padding: 12px 0;
}

:deep(.n-card) {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

:deep(.n-divider) {
  margin: 24px 0;
}

.charts-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-top: 20px;
}

.chart-wrapper {
  width: 100%;
  height: 400px;
  padding: 20px;
}

.chart {
  width: 100%;
  height: 100%;
}
</style> 