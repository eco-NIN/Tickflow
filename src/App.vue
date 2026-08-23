<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <div class="app-shell">
    <main id="main-content" class="app">
      <div v-if="initializing" class="page-loading" role="status" aria-live="polite">正在准备你的学习工作台...</div>
      <div v-if="!isOnline" class="network-status" role="status" aria-live="polite">当前处于离线状态，修改会先保存在本地。</div>
      <p v-if="initError" class="status-text status-text--warning" role="status" aria-live="polite">{{ initError }}</p>
      <template v-if="currentPage === 'home'">
        <header class="site-header site-header--home">
          <a class="site-brand" href="#home" aria-label="Focusly 首页" @click.prevent="showHome">
            <span class="brand-mark brand-mark--small" aria-hidden="true">
              <span class="brand-mark__ring"></span>
              <span class="brand-mark__dot"></span>
            </span>
            <span class="site-brand__name">Focusly</span>
          </a>
          <nav class="site-nav" aria-label="主要导航">
            <a class="site-nav__link site-nav__link--active" href="#home" @click.prevent="showHome">首页</a>
            <a class="site-nav__link" href="#workspace" @click.prevent="showWorkspace">学习工作台</a>
          </nav>
        </header>

        <section id="home" class="home-page" aria-labelledby="home-title">
          <p class="home-page__eyebrow">Focusly / study with intention</p>
          <h1 id="home-title" class="home-page__title">把专注、任务和复盘留在同一个干净界面里</h1>
          <p class="home-page__description">为自习、刷题和复盘准备的轻量学习工作台。少一点打扰，多一点真正完成。</p>
          <button class="action-button action-button--primary home-page__cta" type="button" @click="showWorkspace">
            进入学习工作台
          </button>
          <div class="home-flow" aria-label="Focusly 工作流程">
            <div class="home-flow__item">
              <span class="home-flow__number">01</span>
              <strong>专注</strong>
              <span>用一段完整时间进入状态</span>
            </div>
            <div class="home-flow__line" aria-hidden="true"></div>
            <div class="home-flow__item">
              <span class="home-flow__number">02</span>
              <strong>任务</strong>
              <span>把今天要完成的事放在眼前</span>
            </div>
            <div class="home-flow__line" aria-hidden="true"></div>
            <div class="home-flow__item">
              <span class="home-flow__number">03</span>
              <strong>复盘</strong>
              <span>用记录看见自己的学习节奏</span>
            </div>
          </div>
        </section>
      </template>

      <template v-else>
      <div class="workspace-page">
      <header class="site-header">
        <a class="site-brand" href="#home" aria-label="返回 Focusly 首页" @click.prevent="showHome">
          <span class="brand-mark brand-mark--small" aria-hidden="true">
            <span class="brand-mark__ring"></span>
            <span class="brand-mark__dot"></span>
          </span>
          <span class="site-brand__name">Focusly</span>
        </a>
        <nav class="site-nav" aria-label="工作台导航">
          <a class="site-nav__link site-nav__link--active" href="#focus-workbench">专注</a>
          <a class="site-nav__link" href="#tasks-section">任务</a>
          <a class="site-nav__link" href="#review-section">复盘</a>
        </nav>
      </header>

      <section class="page-intro" aria-labelledby="page-title">
        <p class="page-intro__eyebrow">Today / 学习工作台</p>
        <h1 id="page-title" class="page-intro__title">今天，先完成一件重要的事</h1>
        <p class="page-intro__description">选择一个任务，开始一段完整的专注时间。</p>
      </section>

      <section id="focus-workbench" class="hero-layout" aria-label="专注工作台">
        <section class="timer-card timer-card--hero">
          <div class="timer-card__header">
            <div>
              <p class="timer-card__eyebrow">Focus timer</p>
              <h2 class="timer-card__title">番茄时钟</h2>
            </div>
          </div>

          <div class="timer-card__intro">
            <p class="timer-card__description">先设定目标，再开始一段不被打断的学习时间。完成专注后会自动记录本轮结果。</p>
          </div>

          <div class="mode-switch" role="tablist" aria-label="计时模式">
            <button
              type="button"
              class="mode-switch__button"
              :class="{ 'mode-switch__button--active': mode === 'study' }"
              @click="handleModeSwitch('study')"
            >
              专注模式
            </button>
            <button
              type="button"
              class="mode-switch__button"
              :class="{ 'mode-switch__button--active mode-switch__button--rest': mode === 'rest' }"
              @click="handleModeSwitch('rest')"
            >
              休息模式
            </button>
          </div>

          <div class="timer-stage">
            <div class="timer-panel">
              <div class="timer-dial" :style="dialStyle">
                <div class="timer-dial__inner">
                  <p class="timer-dial__label">{{ modeLabel }}</p>
                  <p class="timer-dial__time">{{ display }}</p>
                  <p class="timer-dial__meta">{{ modeDurationLabel }}</p>
                </div>
              </div>
            </div>

          </div>

          <div class="timer-context" aria-label="计时提示">
            <span class="timer-context__state">{{ running ? '进行中' : '准备开始' }}</span>
            <span class="timer-context__task">{{ currentFocusTaskLabel === '未设置' ? '从任务中选择一个专注目标' : currentFocusTaskLabel }}</span>
            <span class="timer-context__config">专注 {{ config.studyDuration }} 分钟 / 休息 {{ config.restDuration }} 分钟</span>
          </div>

          <div class="timer-actions">
            <button class="action-button action-button--primary" type="button" @click="handleStartPause">
              {{ running ? '暂停' : '开始' }}
            </button>
            <button class="action-button" type="button" @click="handleReset">重置</button>
            <button class="action-button" type="button" @click="openSettings">设置</button>
          </div>
        </section>

        <aside class="focus-note" aria-label="专注提示">
          <p class="focus-note__eyebrow">One thing at a time</p>
          <p class="focus-note__headline">{{ currentFocusTaskLabel === '未设置' ? '从任务中选择一个目标，开始今天的第一段专注。' : `正在处理：${currentFocusTaskLabel}` }}</p>
          <p class="focus-note__support">{{ running ? '保持当前节奏，完成这一轮后再切换任务。' : '完成的专注会自动进入复盘记录。' }}</p>
          <div class="focus-note__feedback">
            <p v-if="saveMessage" class="status-text">{{ saveMessage }}</p>
            <p v-if="modeSwitchNotice" class="status-text status-text--warning">{{ modeSwitchNotice }}</p>
          </div>
        </aside>
      </section>

      <section id="review-section" class="review-section" aria-label="学习复盘">
        <section class="panel-card stats-panel">
          <div class="panel-card__header panel-card__header--stats">
            <div>
              <p class="panel-card__eyebrow">Stats</p>
              <h2 class="panel-card__title">专注时长统计</h2>
              <p class="panel-card__description">用近 7 天或近 30 天的专注记录回看学习节奏，识别哪些天真正完成了整段专注。</p>
            </div>
            <div class="stats-toolbar">
              <div class="range-switch" role="tablist" aria-label="统计范围切换">
                <button
                  class="range-switch__button"
                  :class="{ 'range-switch__button--active': statsRange === 7 }"
                  type="button"
                  @click="handleStatsRangeChange(7)"
                >
                  近 7 天
                </button>
                <button
                  class="range-switch__button"
                  :class="{ 'range-switch__button--active': statsRange === 30 }"
                  type="button"
                  @click="handleStatsRangeChange(30)"
                >
                  近 30 天
                </button>
              </div>
              <div class="chart-type-switch" role="tablist" aria-label="图表类型切换">
                <button
                  class="chart-type-switch__button"
                  :class="{ 'chart-type-switch__button--active': chartType === 'bar' }"
                  type="button"
                  @click="chartType = 'bar'"
                >
                  柱状图
                </button>
                <button
                  class="chart-type-switch__button"
                  :class="{ 'chart-type-switch__button--active': chartType === 'line' }"
                  type="button"
                  @click="chartType = 'line'"
                >
                  折线图
                </button>
                <button
                  class="chart-type-switch__button"
                  :class="{ 'chart-type-switch__button--active': chartType === 'area' }"
                  type="button"
                  @click="chartType = 'area'"
                >
                  面积图
                </button>
                <button
                  class="chart-type-switch__button"
                  :class="{ 'chart-type-switch__button--active': chartType === 'pie' }"
                  type="button"
                  @click="chartType = 'pie'"
                >
                  环形图
                </button>
              </div>
            </div>
          </div>

          <div class="stats-panel__body">
            <div class="stats-panel__meta">
              <span class="summary-item__label">当前图表</span>
              <span class="summary-item__value">{{ chartTypeLabel }}</span>
            </div>
            <p v-if="statsLoading" class="status-text">统计数据加载中...</p>
            <StatsChart v-else :data="statsData" :type="chartType" />
          </div>
        </section>

      </section>

      <section id="tasks-section" class="panel-card task-workspace">
        <div class="task-workspace__header">
          <div>
            <p class="panel-card__eyebrow">Tasks</p>
            <h2 class="panel-card__title">学习任务</h2>
            <p class="panel-card__description">把今天要完成的内容放在这里，选中一项后即可开始专注。</p>
          </div>
          <button
            class="action-button action-button--danger"
            type="button"
            @click="openClearDialog"
            :disabled="!tasks.length || taskMutationSubmitting"
          >
            清空全部
          </button>
        </div>
        <div class="task-workspace__body">
          <section class="task-form-card">
          <div class="task-form-card__header">
            <p class="task-form-card__eyebrow">New task</p>
            <h3 class="task-form-card__title">添加今天的行动项</h3>
          </div>

          <form class="task-form" @submit.prevent="handleCreateTask">
            <label class="field">
              <span class="field__label">任务名称</span>
              <input v-model="taskDraft.content" class="field__input" maxlength="80" placeholder="例如：完成高数作业" />
            </label>

            <label class="field">
              <span class="field__label">任务描述（可选）</span>
              <textarea
                v-model="taskDraft.description"
                class="field__input field__textarea"
                maxlength="200"
                placeholder="补充本次学习目标或范围"
              />
            </label>

            <p v-if="taskError" class="field__error">{{ taskError }}</p>

            <div class="task-form__actions">
              <button class="action-button action-button--primary" type="submit" :disabled="taskSubmitting">
                {{ taskSubmitting ? '添加中...' : '添加任务' }}
              </button>
            </div>
          </form>
          </section>

          <section class="task-list-card">
            <div class="task-list-card__header">
              <p class="task-list-card__eyebrow">Your list</p>
              <h3 class="task-list-card__title">待完成事项</h3>
              <span class="task-list-card__count">{{ tasks.length }} 项</span>
            </div>

          <div class="task-panel__body">
            <p v-if="taskMessage" class="status-text">{{ taskMessage }}</p>
            <p v-if="!tasks.length" class="empty-text">还没有任务，先添加一项今天要完成的学习内容。</p>

            <ul v-else class="task-list">
              <li v-for="task in tasks" :key="task.id" class="task-item" :class="{ 'task-item--done': task.status === '1' }">
                <div class="task-item__main">
                  <label class="task-item__check">
                    <input
                      type="checkbox"
                      :checked="task.status === '1'"
                      @change="handleToggleTask(task)"
                      :disabled="taskMutationSubmitting"
                    />
                    <span class="task-item__checkmark"></span>
                  </label>

                  <div class="task-item__content">
                    <template v-if="editingTaskId === task.id">
                      <label class="field field--compact">
                        <span class="field__label">任务名称</span>
                        <input v-model="editingDraft.content" class="field__input" maxlength="80" />
                      </label>
                      <label class="field field--compact">
                        <span class="field__label">任务描述</span>
                        <textarea v-model="editingDraft.description" class="field__input field__textarea" maxlength="200" />
                      </label>
                      <p v-if="editingError" class="field__error">{{ editingError }}</p>
                    </template>

                    <template v-else>
                      <h3 class="task-item__title">{{ task.content }}</h3>
                      <p v-if="task.description" class="task-item__description">{{ task.description }}</p>
                      <p class="task-item__meta">创建于 {{ formatDateTime(task.createTime) }}</p>
                    </template>
                  </div>
                </div>

                <div class="task-item__side">
                  <template v-if="editingTaskId === task.id">
                    <button class="action-button action-button--primary action-button--small" type="button" @click="handleSaveEdit(task.id)" :disabled="editingSubmitting">
                      {{ editingSubmitting ? '保存中...' : '保存' }}
                    </button>
                    <button class="action-button action-button--small" type="button" @click="cancelEditing">
                      取消
                    </button>
                  </template>

                  <template v-else>
                    <button
                      class="action-button action-button--small"
                      type="button"
                      @click="handleSetFocusTask(task.id)"
                      :disabled="task.status === '1'"
                    >
                      {{ currentFocusTaskId === task.id ? '当前任务' : '设为当前任务' }}
                    </button>
                    <button class="action-button action-button--small" type="button" @click="startEditing(task)">
                      编辑
                    </button>
                    <button class="action-button action-button--danger action-button--small" type="button" @click="handleDeleteTask(task.id)" :disabled="taskMutationSubmitting">
                      删除
                    </button>
                  </template>
                </div>
              </li>
            </ul>
          </div>
          </section>
        </div>
      </section>
      </div>
      </template>

      <div v-if="settingsOpen" class="overlay" @click.self="closeSettings">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow">计时设置</p>
              <h2 id="settings-title" class="modal__title">调整专注与休息时长</h2>
            </div>
            <button class="icon-button" type="button" @click="closeSettings" aria-label="关闭设置">
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <form class="settings-form" @submit.prevent="handleSaveConfig">
            <label class="field">
              <span class="field__label">专注时长（1-180 分钟）</span>
              <input v-model="configDraft.studyDuration" class="field__input" inputmode="numeric" />
              <span v-if="errors.studyDuration" class="field__error">{{ errors.studyDuration }}</span>
            </label>

            <label class="field">
              <span class="field__label">休息时长（1-60 分钟）</span>
              <input v-model="configDraft.restDuration" class="field__input" inputmode="numeric" />
              <span v-if="errors.restDuration" class="field__error">{{ errors.restDuration }}</span>
            </label>

            <div class="modal__actions">
              <button class="action-button" type="button" @click="closeSettings">取消</button>
              <button class="action-button action-button--primary" type="submit" :disabled="savingConfig">
                {{ savingConfig ? '保存中...' : '保存设置' }}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div v-if="completionDialog.open" class="overlay" @click.self="closeCompletionDialog">
        <section class="modal modal--compact" role="dialog" aria-modal="true" aria-labelledby="completion-title">
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow">计时完成</p>
              <h2 id="completion-title" class="modal__title">{{ completionDialog.title }}</h2>
            </div>
          </div>
          <p class="modal__message">{{ completionDialog.message }}</p>
          <div class="modal__actions">
            <button class="action-button action-button--primary" type="button" @click="closeCompletionDialog">我知道了</button>
          </div>
        </section>
      </div>

      <div v-if="clearDialogOpen" class="overlay" @click.self="closeClearDialog">
        <section class="modal modal--compact" role="dialog" aria-modal="true" aria-labelledby="clear-title">
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow">任务清空确认</p>
              <h2 id="clear-title" class="modal__title">确认清空全部任务？</h2>
            </div>
          </div>
          <p class="modal__message">清空后当前任务选择和任务列表都会被移除，此操作无法撤销。</p>
          <div class="modal__actions">
            <button class="action-button" type="button" @click="closeClearDialog">取消</button>
            <button class="action-button action-button--danger" type="button" @click="confirmClearTasks">
              确认清空
            </button>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const StatsChart = defineAsyncComponent(() => import('./components/StatsChart.vue'))
import useTimer from './composables/useTimer'
import dataApi from './services/api'
import { getStatSeries } from './services/stats'

const STUDY_MIN = 1
const STUDY_MAX = 180
const REST_MIN = 1
const REST_MAX = 60

const currentPage = ref('home')
const initializing = ref(true)
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const initError = ref('')
const editingSubmitting = ref(false)

const config = ref({
  studyDuration: 25,
  restDuration: 5
})

const configDraft = reactive({
  studyDuration: '25',
  restDuration: '5'
})

const errors = reactive({
  studyDuration: '',
  restDuration: ''
})

const tasks = ref([])
const taskDraft = reactive({
  content: '',
  description: ''
})
const editingDraft = reactive({
  content: '',
  description: ''
})

const settingsOpen = ref(false)
const savingConfig = ref(false)
const saveMessage = ref('')
const statsRange = ref(7)
const chartType = ref('bar')
const statsLoading = ref(false)
const statsData = ref([])
const completionDialog = reactive({
  open: false,
  title: '',
  message: ''
})
const clearDialogOpen = ref(false)
const modeSwitchNotice = ref('')
const taskMessage = ref('')
const taskError = ref('')
const editingError = ref('')
const taskSubmitting = ref(false)
const taskMutationSubmitting = ref(false)
const editingTaskId = ref('')
const currentFocusTaskId = ref('')

const timer = useTimer({
  initialConfig: config.value,
  onComplete: handleTimerComplete
})

const { mode, running, progress, display, start, pause, reset, switchMode, applyConfig } = timer

const modeLabel = computed(() => (mode.value === 'study' ? '专注模式' : '休息模式'))
const chartTypeLabel = computed(() => {
  switch (chartType.value) {
    case 'line':
      return '折线图'
    case 'area':
      return '面积图'
    case 'pie':
      return '环形图'
    default:
      return '柱状图'
  }
})
const modeDurationLabel = computed(() => {
  const minutes = mode.value === 'study' ? config.value.studyDuration : config.value.restDuration
  return `本轮 ${minutes} 分钟`
})

const currentFocusTask = computed(() => {
  if (!currentFocusTaskId.value) {
    return null
  }

  return tasks.value.find((task) => task.id === currentFocusTaskId.value) || null
})

const currentFocusTaskLabel = computed(() => {
  if (!currentFocusTask.value) {
    return '未设置'
  }

  return currentFocusTask.value.content
})

const dialStyle = computed(() => {
  const percent = Math.max(0, Math.min(100, progress.value * 100))
  const trackColor = mode.value === 'study' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.18)'
  const fillColor = mode.value === 'study' ? '#f59e0b' : '#10b981'

  return {
    '--dial-track': trackColor,
    '--dial-fill': fillColor,
    '--dial-progress': `${percent}%`
  }
})

function showHome() {
  currentPage.value = 'home'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function showWorkspace() {
  currentPage.value = 'workspace'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openSettings() {
  configDraft.studyDuration = String(config.value.studyDuration)
  configDraft.restDuration = String(config.value.restDuration)
  errors.studyDuration = ''
  errors.restDuration = ''
  settingsOpen.value = true
}

function closeSettings() {
  settingsOpen.value = false
}

function closeCompletionDialog() {
  completionDialog.open = false
}

function openClearDialog() {
  if (!tasks.value.length) {
    return
  }

  clearDialogOpen.value = true
}

function closeClearDialog() {
  clearDialogOpen.value = false
}

function handleStartPause() {
  modeSwitchNotice.value = ''

  if (running.value) {
    pause()
    return
  }

  start()
}

function handleReset() {
  modeSwitchNotice.value = ''
  reset(mode.value)
}

function handleModeSwitch(nextMode) {
  if (nextMode === mode.value) {
    modeSwitchNotice.value = ''
    return
  }

  if (running.value) {
    modeSwitchNotice.value = '请先暂停当前计时，再切换模式。'
    return
  }

  modeSwitchNotice.value = ''
  switchMode(nextMode)
}

function validateDuration(rawValue, min, max, fieldName) {
  if (rawValue === '' || rawValue === null || typeof rawValue === 'undefined') {
    return `${fieldName}不能为空`
  }

  if (!/^\d+$/.test(String(rawValue).trim())) {
    return `${fieldName}必须是正整数`
  }

  const value = Number(rawValue)

  if (!Number.isFinite(value) || value <= 0) {
    return `${fieldName}必须大于 0`
  }

  if (value < min || value > max) {
    return `${fieldName}范围需在 ${min}-${max} 分钟`
  }

  return ''
}

function validateDraft() {
  errors.studyDuration = validateDuration(configDraft.studyDuration, STUDY_MIN, STUDY_MAX, '专注时长')
  errors.restDuration = validateDuration(configDraft.restDuration, REST_MIN, REST_MAX, '休息时长')

  return !errors.studyDuration && !errors.restDuration
}

function normalizeTaskText(value) {
  return String(value || '').trim()
}

function validateTaskContent(content, fieldName = '任务名称') {
  if (!content) {
    return `${fieldName}不能为空`
  }

  return ''
}

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(isoString) {
  const date = new Date(isoString)

  if (Number.isNaN(date.getTime())) {
    return isoString
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function loadStats(days = statsRange.value) {
  statsLoading.value = true

  try {
    statsData.value = await getStatSeries(days)
  } catch (error) {
    statsData.value = []
    initError.value = '统计数据暂时无法加载，已保留本地数据。'
  } finally {
    statsLoading.value = false
  }
}

async function handleStatsRangeChange(days) {
  if (statsRange.value === days) {
    return
  }

  statsRange.value = days
  await loadStats(days)
}

async function handleSaveConfig() {
  saveMessage.value = ''

  if (!validateDraft()) {
    return
  }

  const nextConfig = {
    studyDuration: Number(configDraft.studyDuration),
    restDuration: Number(configDraft.restDuration)
  }

  savingConfig.value = true

  try {
    const result = await dataApi.updateTimerConfig(nextConfig)
    config.value = { ...nextConfig }
    applyConfig(nextConfig)
    closeSettings()
    saveMessage.value = result.offline ? '配置已离线保存，网络恢复后会自动同步。' : '配置已保存。'
  } finally {
    savingConfig.value = false
  }
}

async function handleTimerComplete(finishedMode) {
  if (finishedMode === 'study') {
    completionDialog.title = '专注结束，进入休息模式'
    completionDialog.message = '本轮专注已完成，已切换为休息模式。准备好后手动开始下一轮。'
    completionDialog.open = true

    await dataApi.addSession({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: formatLocalDate(),
      minutes: config.value.studyDuration,
      taskId: currentFocusTask.value?.status === '0' ? currentFocusTask.value.id : null,
      createTime: new Date().toISOString()
    })

    return
  }

  completionDialog.title = '休息结束，回到专注模式'
  completionDialog.message = '本轮休息已完成，已切换为专注模式。准备好后手动开始下一轮。'
  completionDialog.open = true
}

async function loadTasks() {
  const result = await dataApi.getTaskList()
  tasks.value = Array.isArray(result.data) ? result.data : []

  if (currentFocusTaskId.value) {
    const matchedTask = tasks.value.find((task) => task.id === currentFocusTaskId.value && task.status === '0')
    if (!matchedTask) {
      currentFocusTaskId.value = ''
    }
  }
}

async function handleCreateTask() {
  taskError.value = ''
  taskMessage.value = ''

  const content = normalizeTaskText(taskDraft.content)
  const description = normalizeTaskText(taskDraft.description)
  const contentError = validateTaskContent(content)

  if (contentError) {
    taskError.value = contentError
    return
  }

  taskSubmitting.value = true

  const newTask = {
    id: String(Date.now()),
    content,
    description,
    status: '0',
    createTime: new Date().toISOString()
  }

  try {
    const result = await dataApi.addTask(newTask)
    tasks.value = Array.isArray(result.data) ? result.data : tasks.value
    taskDraft.content = ''
    taskDraft.description = ''
    taskMessage.value = result.offline ? '任务已离线保存，网络恢复后会自动同步。' : '任务已添加。'
  } finally {
    taskSubmitting.value = false
  }
}

async function handleToggleTask(task) {
  if (taskMutationSubmitting.value) {
    return
  }

  taskMessage.value = ''
  const nextStatus = task.status === '1' ? '0' : '1'
  taskMutationSubmitting.value = true

  try {
    const result = await dataApi.updateTask({
      id: task.id,
      status: nextStatus
    })

    tasks.value = Array.isArray(result.data) ? result.data : tasks.value

    if (nextStatus === '1' && currentFocusTaskId.value === task.id) {
      currentFocusTaskId.value = ''
    }

    taskMessage.value = result.offline ? '任务状态已离线更新。' : '任务状态已更新。'
  } finally {
    taskMutationSubmitting.value = false
  }
}

function startEditing(task) {
  editingTaskId.value = task.id
  editingDraft.content = task.content
  editingDraft.description = task.description || ''
  editingError.value = ''
  taskMessage.value = ''
}

function cancelEditing() {
  editingTaskId.value = ''
  editingDraft.content = ''
  editingDraft.description = ''
  editingError.value = ''
}

async function handleSaveEdit(taskId) {
  if (editingSubmitting.value) {
    return
  }

  const content = normalizeTaskText(editingDraft.content)
  const description = normalizeTaskText(editingDraft.description)
  const contentError = validateTaskContent(content, '编辑后的任务名称')

  if (contentError) {
    editingError.value = contentError
    return
  }

  editingSubmitting.value = true

  try {
    const result = await dataApi.updateTask({
      id: taskId,
      content,
      description
    })

    tasks.value = Array.isArray(result.data) ? result.data : tasks.value
    cancelEditing()
    taskMessage.value = result.offline ? '任务已离线更新。' : '任务已更新。'
  } finally {
    editingSubmitting.value = false
  }
}

async function handleDeleteTask(taskId) {
  if (taskMutationSubmitting.value) {
    return
  }

  taskMessage.value = ''
  taskMutationSubmitting.value = true

  try {
    const result = await dataApi.deleteTask(taskId)
    tasks.value = Array.isArray(result.data) ? result.data : tasks.value

    if (currentFocusTaskId.value === taskId) {
      currentFocusTaskId.value = ''
    }

    if (editingTaskId.value === taskId) {
      cancelEditing()
    }

    taskMessage.value = result.offline ? '任务已离线删除。' : '任务已删除。'
  } finally {
    taskMutationSubmitting.value = false
  }
}

async function confirmClearTasks() {
  if (taskMutationSubmitting.value) {
    return
  }

  const ids = tasks.value.map((task) => task.id)
  taskMutationSubmitting.value = true

  try {
    for (const id of ids) {
      const result = await dataApi.deleteTask(id)
      tasks.value = Array.isArray(result.data) ? result.data : tasks.value
    }

    currentFocusTaskId.value = ''
    cancelEditing()
    closeClearDialog()
    taskMessage.value = '全部任务已清空。'
  } finally {
    taskMutationSubmitting.value = false
  }
}

function handleSetFocusTask(taskId) {
  const task = tasks.value.find((item) => item.id === taskId)

  if (!task || task.status === '1') {
    return
  }

  currentFocusTaskId.value = taskId
  taskMessage.value = '已设为当前专注任务。'
}

function handleOnline() {
  isOnline.value = true
  dataApi.replayPending().catch(() => {
    initError.value = '网络已恢复，但仍有数据等待同步。'
  })
}

function handleOffline() {
  isOnline.value = false
}

onMounted(async () => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  dataApi.replayPending().catch(() => {
    initError.value = '部分离线数据仍在等待同步。'
  })

  try {
    const results = await Promise.allSettled([
      dataApi.getTimerConfig(),
      loadTasks(),
      loadStats()
    ])
    const configResult = results[0].status === 'fulfilled' ? results[0].value : null

    if (results.some((result) => result.status === 'rejected')) {
      initError.value = '部分数据加载失败，页面已使用本地或默认数据。'
    }

    if (configResult?.data) {
      config.value = {
        studyDuration: Number(configResult.data.studyDuration) || 25,
        restDuration: Number(configResult.data.restDuration) || 5
      }
      applyConfig(config.value)
    }
  } catch (error) {
    initError.value = '工作台初始化失败，已使用本地默认数据。'
  } finally {
    initializing.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>
