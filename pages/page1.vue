<template>
  <div class="container">
    <!-- 上部分：框架展示 -->
    <div class="frame-section">
      <n-card>
        <iframe 
          src="https://scoreboard.ucup.ac/" 
          frameborder="0" 
          class="frame-content"
        ></iframe>
      </n-card>
    </div>

    <!-- 下部分：折线图 -->
    <div class="chart-section">
      <n-card>
        <div ref="chartRef" class="chart-container"></div>
      </n-card>
    </div>

    <!-- 添加说明部分 -->
    <div class="description-section">
      <n-card>
        <n-space vertical>
          <n-text class="section-title">数据说明</n-text>
          
          <div class="description-block">
            <n-text class="sub-title">【实时评分系统】</n-text>
            <n-text class="detail-text">
              • 上方展示的是实时评分系统界面，显示当前检测状态和评分结果<br>
              • 评分范围：0-100，分数越高表示自闭症特征越明显<br>
              • 系统会自动记录和更新评分数据</br>
            </n-text>
          </div>

          <div class="description-block">
            <n-text class="sub-title">【趋势图解读】</n-text>
            <n-text class="detail-text">
              • 折线图展示了自闭症评分的实时变化趋势
              • 横轴：时间轴，显示最近的检测时间点
              • 纵轴：评分值，反映自闭症特征的强度
              • 曲线走势：上升表示特征增强，下降表示特征减弱
            </n-text>
          </div>

          <div class="description-block">
            <n-text class="sub-title">【注意事项】</n-text>
            <n-text class="detail-text">
              • 数据仅供参考，不能作为临床诊断的唯一依据
              • 建议结合专业医生的评估进行综合判断
              • 如发现异常波动，请及时咨询专业医师
              • 保持稳定的检测环境，避免外界因素干扰
            </n-text>
          </div>

          <n-divider />
          
          <n-text class="warning-text" type="warning">
            重要提示：本系统仅作为辅助监测工具，最终诊断请以专业医疗机构的评估为准。
          </n-text>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
// 按需导入 ECharts 模块
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  TimelineComponent
} from 'echarts/components'
import { UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

// 注册必需的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  TimelineComponent,
  LineChart,
  CanvasRenderer,
  UniversalTransition
])

interface DetectionResult {
  timestamp: string
  autistic_score: number
  non_autistic_score: number
}

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null
let timer: ReturnType<typeof setInterval>

// 存储数据的数组
const timestamps = ref<string[]>([])
const autisticScores = ref<number[]>([])

// 获取最新数据
const fetchLatestData = async () => {
  try {
    const response = await fetch('/api/asd?limit=50')
    const result = await response.json()
    
    if (result.success && result.data.length > 0) {
      // 更新数据数组
      timestamps.value = result.data.map((item: DetectionResult) => item.timestamp).reverse()
      autisticScores.value = result.data.map((item: DetectionResult) => item.autistic_score).reverse()
      
      // 限制数据点数量
      if (timestamps.value.length > 50) {
        timestamps.value = timestamps.value.slice(-50)
        autisticScores.value = autisticScores.value.slice(-50)
      }
      
      updateChart()
    }
  } catch (error) {
    console.error('Error fetching detection data:', error)
  }
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  const option = {
    animation: false,
    title: {
      text: '自闭症评分实时监测',
      left: 'center',
      top: 20,
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0]
        return `${new Date(data.value[0]).toLocaleString()}<br/>
                评分: ${data.value[1].toFixed(3)}`
      }
    },
    grid: {
      top: 80,
      left: 50,
      right: 30,
      bottom: 40
    },
    xAxis: {
      type: 'time',
      name: '时间',
      axisLabel: {
        formatter: (value: string) => {
          return new Date(value).toLocaleTimeString()
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '评分',
      min: 0,
      max: 100
    },
    series: [{
      name: '自闭症评分',
      type: 'line',
      data: [],
      sampling: 'lttb',
      symbol: 'none',
      lineStyle: {
        width: 2,
        color: '#1890ff'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          {
            offset: 0,
            color: 'rgba(24,144,255,0.3)'
          },
          {
            offset: 1,
            color: 'rgba(24,144,255,0.1)'
          }
        ])
      }
    }]
  }
  chart.setOption(option)
}

// 更新图表数据
const updateChart = () => {
  if (!chart) return
  
  chart.setOption({
    series: [{
      data: timestamps.value.map((time, index) => [
        new Date(time),
        autisticScores.value[index]
      ])
    }]
  })
}

// 使用 ResizeObserver 代替 window.resize
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  initChart()
  fetchLatestData()
  timer = setInterval(fetchLatestData, 5000)
  
  // 使用 ResizeObserver
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      chart?.resize()
    })
    resizeObserver.observe(chartRef.value)
  }
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  chart?.dispose()
})
</script>

<style scoped>
.container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 64px;
}

.frame-section {
  height: 40vh;
  margin-bottom: 20px;
}

.frame-content {
  width: 100%;
  height: 100%;
  border: none;
}

.chart-section {
  height: 30vh;
  margin-bottom: 40px;
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 280px;
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
</style> 