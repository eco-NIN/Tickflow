import { computed, onBeforeUnmount, ref } from 'vue'

const MODE_STUDY = 'study'
const MODE_REST = 'rest'
const REFRESH_INTERVAL = 250
const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

function normalizeConfig(config = {}) {
  const studyDuration = Number(config.studyDuration)
  const restDuration = Number(config.restDuration)

  return {
    studyDuration: Number.isInteger(studyDuration) && studyDuration >= 1 && studyDuration <= 180 ? studyDuration : 25,
    restDuration: Number.isInteger(restDuration) && restDuration >= 1 && restDuration <= 60 ? restDuration : 5
  }
}

function toSeconds(minutes) {
  return Math.round(minutes * SECONDS_PER_MINUTE)
}

function formatDisplay(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / SECONDS_PER_MINUTE)
  const seconds = safeSeconds % SECONDS_PER_MINUTE

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function useTimer(options = {}) {
  const { initialConfig, initialMode = MODE_STUDY, onComplete } = options

  const config = ref(normalizeConfig(initialConfig))
  const mode = ref(initialMode === MODE_REST ? MODE_REST : MODE_STUDY)
  const running = ref(false)
  const initialSeconds = mode.value === MODE_REST
    ? toSeconds(config.value.restDuration)
    : toSeconds(config.value.studyDuration)
  const remaining = ref(initialSeconds)
  const remainingMilliseconds = ref(initialSeconds * MS_PER_SECOND)
  const deadline = ref(null)
  const tickerId = ref(null)

  function getModeDuration(nextMode = mode.value) {
    return nextMode === MODE_REST ? config.value.restDuration : config.value.studyDuration
  }

  function getModeSeconds(nextMode = mode.value) {
    return toSeconds(getModeDuration(nextMode))
  }

  function syncRemainingByMode(nextMode = mode.value) {
    const nextMilliseconds = getModeSeconds(nextMode) * MS_PER_SECOND
    remainingMilliseconds.value = nextMilliseconds
    remaining.value = getModeSeconds(nextMode)
  }

  function stopTicker() {
    if (tickerId.value !== null) {
      window.clearInterval(tickerId.value)
      tickerId.value = null
    }
  }

  function finishCurrentMode(finishedMode) {
    stopTicker()
    running.value = false
    deadline.value = null

    const nextMode = finishedMode === MODE_STUDY ? MODE_REST : MODE_STUDY
    mode.value = nextMode
    syncRemainingByMode(nextMode)

    if (typeof onComplete === 'function') {
      onComplete(finishedMode)
    }
  }

  function tick() {
    if (!running.value || deadline.value === null) {
      return
    }

    const millisecondsLeft = deadline.value - Date.now()

    if (millisecondsLeft <= 0) {
      remainingMilliseconds.value = 0
      remaining.value = 0
      finishCurrentMode(mode.value)
      return
    }

    remainingMilliseconds.value = millisecondsLeft
    remaining.value = Math.ceil(millisecondsLeft / MS_PER_SECOND)
  }

  // 以 deadline 为唯一时间依据；interval 只刷新视图，后台降频后恢复仍能按真实时间校准。
  function startTicker() {
    stopTicker()
    tickerId.value = window.setInterval(tick, REFRESH_INTERVAL)
  }

  function start() {
    if (running.value) {
      return
    }

    running.value = true
    deadline.value = Date.now() + remainingMilliseconds.value
    tick()
    startTicker()
  }

  function pause() {
    if (!running.value || deadline.value === null) {
      return
    }

    const millisecondsLeft = Math.max(0, deadline.value - Date.now())
    remainingMilliseconds.value = millisecondsLeft
    remaining.value = Math.ceil(millisecondsLeft / MS_PER_SECOND)
    running.value = false
    deadline.value = null
    stopTicker()
  }

  function reset(nextMode = mode.value) {
    running.value = false
    deadline.value = null
    stopTicker()
    mode.value = nextMode === MODE_REST ? MODE_REST : MODE_STUDY
    syncRemainingByMode(mode.value)
  }

  function switchMode(nextMode) {
    reset(nextMode)
  }

  function applyConfig(nextConfig) {
    config.value = normalizeConfig(nextConfig)
    reset(mode.value)
  }

  const progress = computed(() => {
    const total = getModeSeconds(mode.value)

    if (total <= 0) {
      return 0
    }

    const completed = total - remaining.value
    return Math.min(1, Math.max(0, completed / total))
  })

  const display = computed(() => formatDisplay(remaining.value))

  // composable 可能在路由或条件渲染中卸载，必须释放 interval 以避免后台继续执行。
  onBeforeUnmount(() => {
    stopTicker()
  })

  return {
    mode,
    running,
    remaining,
    progress,
    display,
    config,
    start,
    pause,
    reset,
    tick,
    stopTicker,
    switchMode,
    applyConfig
  }
}

export default useTimer
