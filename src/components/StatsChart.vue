<template>
  <div class="stats-chart">
    <div v-if="!hasData" class="stats-chart__empty">暂无有效统计数据</div>
    <div v-else ref="chartRef" class="stats-chart__canvas"></div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  type: {
    type: String,
    default: 'bar'
  }
})

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
  CanvasRenderer
])

const chartRef = ref(null)
let chartInstance = null
let resizeObserver = null

const hasData = computed(() =>
  Array.isArray(props.data) && props.data.some((item) => Number(item?.value) > 0)
)

const chartType = computed(() => (props.type === 'line' || props.type === 'area' || props.type === 'pie' ? props.type : 'bar'))

function formatTooltipValue(value) {
  return `${Number(value) || 0} 分钟`
}

function buildCategoryOption() {
  const labels = props.data.map((item) => item.label)
  const values = props.data.map((item) => Number(item.value) || 0)
  const axisLabel = {
    interval: labels.length > 12 ? 'auto' : 0,
    hideOverlap: true
  }

  const baseSeries = {
    data: values,
    barMaxWidth: 24,
    itemStyle: {
      color: '#f59e0b',
      borderRadius: [6, 6, 0, 0]
    }
  }

  if (chartType.value === 'line' || chartType.value === 'area') {
    return {
      grid: {
        left: 12,
        right: 12,
        top: 24,
        bottom: 40,
        containLabel: true
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisTick: {
          alignWithLabel: true
        },
        axisLabel
      },
      yAxis: {
        type: 'value',
        minInterval: 1
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbolSize: 8,
          areaStyle: chartType.value === 'area' ? { opacity: 0.18 } : undefined,
          lineStyle: {
            width: 3
          },
          itemStyle: {
            color: '#f59e0b'
          },
          ...baseSeries
        }
      ]
    }
  }

  return {
    grid: {
      left: 12,
      right: 12,
      top: 24,
      bottom: 40,
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisTick: {
        alignWithLabel: true
      },
      axisLabel
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        type: 'bar',
        ...baseSeries
      }
    ]
  }
}

function buildPieOption() {
  const seriesData = props.data
    .map((item) => ({
      name: item.label,
      value: Number(item.value) || 0
    }))
    .filter((item) => item.value > 0)

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const total = seriesData.reduce((sum, item) => sum + item.value, 0) || 1
        const percent = ((Number(params.value) || 0) / total) * 100
        return `${params.name}<br/>${formatTooltipValue(params.value)}<br/>占比 ${percent.toFixed(1)}%`
      }
    },
    legend: {
      type: seriesData.length > 8 ? 'scroll' : 'plain',
      orient: 'horizontal',
      bottom: 0
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#ffffff',
          borderWidth: 2
        },
        label: {
          formatter: '{b}'
        },
        data: seriesData
      }
    ]
  }
}

function buildOption() {
  return chartType.value === 'pie' ? buildPieOption() : buildCategoryOption()
}

// ECharts 持有 canvas 与事件资源；空态和组件卸载都应 dispose，避免旧实例残留。
function renderChart() {
  if (!chartRef.value || !hasData.value) {
    chartInstance?.dispose()
    chartInstance = null
    return
  }

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  chartInstance.setOption(buildOption(), true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()

  if (chartRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(chartRef.value)
  }
})

watch(
  () => [props.data, props.type],
  () => {
    renderChart()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chartInstance?.dispose()
  chartInstance = null
})

defineExpose({
  resize: handleResize
})
</script>
