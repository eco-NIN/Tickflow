import axios from 'axios'
import storageService from './storage'

const DEFAULT_TIMEOUT = 5000
const SUCCESS_CODE = 200

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || DEFAULT_TIMEOUT

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT
})

const CACHE_KEYS = {
  timerConfig: 'config',
  taskList: 'tasks',
  clockList: 'clocks',
  sessionList: 'sessions',
  weekStats: 'stats-week',
  monthStats: 'stats-month'
}

let replaying = false

function cloneValue(value) {
  if (typeof value === 'undefined') {
    return value
  }

  return JSON.parse(JSON.stringify(value))
}

function successResult(data, offline = false) {
  return {
    data: cloneValue(data),
    offline
  }
}

function failureReason(error, fallbackReason = 'REQUEST_FAILED') {
  if (error?.response) {
    return 'HTTP_ERROR'
  }

  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT' || /timeout/i.test(error?.message || '')) {
    return 'TIMEOUT'
  }

  if (error?.message === 'BUSINESS_ERROR') {
    return 'BUSINESS_ERROR'
  }

  return fallbackReason
}

function unwrapResponse(response) {
  const payload = response?.data

  if (!payload || payload.code !== SUCCESS_CODE) {
    const error = new Error('BUSINESS_ERROR')
    error.response = response
    throw error
  }

  return payload.data
}

// cacheKey 将远端资源映射到本地快照槽位；远端可用时用于镜像，远端不可用时用于返回同结构 fallback。
function readCache(cacheKey) {
  return storageService.read(cacheKey)
}

function writeCache(cacheKey, value) {
  return storageService.write(cacheKey, value)
}

// mirror 表示请求成功后，把最新远端状态同步到本地快照，保证离线 fallback 读取到的是最近一次可信数据。
function hasPendingActionForCache(cacheKey) {
  const pendingQueue = storageService.read('pending')
  if (!Array.isArray(pendingQueue)) {
    return false
  }

  const actionTypes = {
    [CACHE_KEYS.timerConfig]: ['SAVE_TIMER_CONFIG'],
    [CACHE_KEYS.taskList]: ['ADD_TASK', 'UPDATE_TASK', 'DELETE_TASK'],
    [CACHE_KEYS.clockList]: ['ADD_CLOCK'],
    [CACHE_KEYS.sessionList]: ['ADD_SESSION']
  }

  return pendingQueue.some((item) => actionTypes[cacheKey]?.includes(item.type))
}

function mirror(cacheKey, value) {
  if (hasPendingActionForCache(cacheKey)) {
    return false
  }

  return writeCache(cacheKey, value)
}

function removePendingHead() {
  const pendingQueue = storageService.read('pending')
  const nextQueue = Array.isArray(pendingQueue) ? pendingQueue.slice(1) : []
  storageService.write('pending', nextQueue)
}

function appendTask(list, task) {
  return [...list, cloneValue(task)]
}

function updateTask(list, payload) {
  return list.map((task) => {
    if (task.id !== payload.id) {
      return task
    }

    return {
      ...task,
      ...payload
    }
  })
}

function deleteTask(list, id) {
  return list.filter((task) => task.id !== id)
}

// 打卡按本地自然日 upsert，避免同一天的重复提交产生多条每日汇总记录。
function upsertClock(list, record) {
  const nextList = list.filter((item) => item.date !== record.date)
  nextList.push(cloneValue(record))
  return nextList
}

function appendSession(list, session) {
  return [...list, cloneValue(session)]
}

function applyLocalMirror(action) {
  switch (action.type) {
    case 'SAVE_TIMER_CONFIG': {
      writeCache(CACHE_KEYS.timerConfig, action.payload)
      break
    }
    case 'ADD_TASK': {
      const taskList = readCache(CACHE_KEYS.taskList)
      writeCache(CACHE_KEYS.taskList, appendTask(taskList, action.payload))
      break
    }
    case 'UPDATE_TASK': {
      const taskList = readCache(CACHE_KEYS.taskList)
      writeCache(CACHE_KEYS.taskList, updateTask(taskList, action.payload))
      break
    }
    case 'DELETE_TASK': {
      const taskList = readCache(CACHE_KEYS.taskList)
      writeCache(CACHE_KEYS.taskList, deleteTask(taskList, action.payload.id))
      break
    }
    case 'ADD_CLOCK': {
      const clockList = readCache(CACHE_KEYS.clockList)
      writeCache(CACHE_KEYS.clockList, upsertClock(clockList, action.payload))
      break
    }
    case 'ADD_SESSION': {
      const sessionList = readCache(CACHE_KEYS.sessionList)
      writeCache(CACHE_KEYS.sessionList, appendSession(sessionList, action.payload))
      break
    }
    default:
      break
  }
}

// fallback 表示远端失败后，从本地快照读取同结构数据返回，让业务仍然可继续。
async function requestWithFallback(config, options = {}) {
  const { cacheKey } = options

  const hadPendingAction = cacheKey ? hasPendingActionForCache(cacheKey) : false

  try {
    const response = await client.request(config)
    const data = unwrapResponse(response)
    const isStatsCache = cacheKey === CACHE_KEYS.weekStats || cacheKey === CACHE_KEYS.monthStats
    const normalizedData = isStatsCache ? normalizeStatList(data) : data

    if (cacheKey && hadPendingAction) {
      return successResult(readCache(cacheKey), true)
    }

    if (cacheKey && (!isStatsCache || Array.isArray(data))) {
      mirror(cacheKey, normalizedData)
    }

    return successResult(normalizedData, false)
  } catch (error) {
    if (!cacheKey) {
      return {
        data: null,
        offline: true,
        reason: failureReason(error)
      }
    }

    return {
      data: readCache(cacheKey),
      offline: true,
      reason: failureReason(error)
    }
  }
}

function createQueueItem(type, payload) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    type,
    payload: cloneValue(payload),
    createTime: new Date().toISOString()
  }
}

async function executeRemoteWrite(config) {
  const response = await client.request(config)
  return unwrapResponse(response)
}

// queue 表示离线时暂存未成功发往远端的写操作，等网络恢复后按入队顺序重新发送。
async function writeWithFallback(config, options) {
  const { actionType, payload, cacheKey, onSuccess } = options

  try {
    const remoteData = await executeRemoteWrite(config)
    const nextValue = typeof onSuccess === 'function' ? onSuccess(remoteData) : remoteData

    if (cacheKey) {
      mirror(cacheKey, nextValue)
    }

    return successResult(nextValue, false)
  } catch (error) {
    const queueItem = createQueueItem(actionType, payload)
    const queued = storageService.enqueue(queueItem)
    applyLocalMirror({ type: actionType, payload })

    const localData = cacheKey ? readCache(cacheKey) : null

    return {
      data: localData,
      offline: true,
      reason: queued ? failureReason(error) : 'LOCAL_STORAGE_WRITE_FAILED'
    }
  }
}

async function replayPending() {
  if (replaying) {
    return {
      data: storageService.read('pending'),
      offline: false,
      reason: 'REPLAY_IN_PROGRESS'
    }
  }

  const pendingQueue = storageService.read('pending')

  if (!Array.isArray(pendingQueue) || pendingQueue.length === 0) {
    return successResult([], false)
  }

  replaying = true

  try {
    while (true) {
      const queue = storageService.read('pending')
      const current = queue[0]

      if (!current) {
        break
      }

      await replayQueueItem(current)
      removePendingHead()
    }

    return successResult([], false)
  } catch (error) {
    return {
      data: storageService.read('pending'),
      offline: true,
      reason: failureReason(error, 'REPLAY_FAILED')
    }
  } finally {
    replaying = false
  }
}

async function replayQueueItem(item) {
  switch (item.type) {
    case 'SAVE_TIMER_CONFIG':
      await executeRemoteWrite({
        method: 'put',
        url: '/timer/config',
        data: item.payload
      })
      break
    case 'ADD_TASK':
      await executeRemoteWrite({
        method: 'post',
        url: '/task/add',
        data: item.payload
      })
      break
    case 'UPDATE_TASK':
      await executeRemoteWrite({
        method: 'put',
        url: '/task/update',
        data: item.payload
      })
      break
    case 'DELETE_TASK':
      await executeRemoteWrite({
        method: 'delete',
        url: '/task/delete',
        params: { id: item.payload.id }
      })
      break
    case 'ADD_CLOCK':
      await executeRemoteWrite({
        method: 'post',
        url: '/clock/add',
        data: item.payload
      })
      break
    case 'ADD_SESSION':
      // session 当前只保存在本地；兼容历史遗留队列项，避免它阻塞其他可重放写操作。
      break
    default:
      throw new Error('UNSUPPORTED_REPLAY_ACTION')
  }
}

async function getTimerConfig() {
  return requestWithFallback(
    {
      method: 'get',
      url: '/timer/config'
    },
    {
      cacheKey: CACHE_KEYS.timerConfig
    }
  )
}

async function updateTimerConfig(payload) {
  return writeWithFallback(
    {
      method: 'put',
      url: '/timer/config',
      data: payload
    },
    {
      actionType: 'SAVE_TIMER_CONFIG',
      payload,
      cacheKey: CACHE_KEYS.timerConfig,
      onSuccess: (remoteData) => remoteData || payload
    }
  )
}

async function getTaskList() {
  return requestWithFallback(
    {
      method: 'get',
      url: '/task/list'
    },
    {
      cacheKey: CACHE_KEYS.taskList
    }
  )
}

async function addTask(payload) {
  return writeWithFallback(
    {
      method: 'post',
      url: '/task/add',
      data: payload
    },
    {
      actionType: 'ADD_TASK',
      payload,
      cacheKey: CACHE_KEYS.taskList,
      onSuccess: (remoteData) => {
        const taskList = readCache(CACHE_KEYS.taskList)
        return appendTask(taskList, remoteData || payload)
      }
    }
  )
}

async function updateTaskItem(payload) {
  return writeWithFallback(
    {
      method: 'put',
      url: '/task/update',
      data: payload
    },
    {
      actionType: 'UPDATE_TASK',
      payload,
      cacheKey: CACHE_KEYS.taskList,
      onSuccess: (remoteData) => {
        const taskList = readCache(CACHE_KEYS.taskList)
        return updateTask(taskList, remoteData || payload)
      }
    }
  )
}

async function deleteTaskItem(id) {
  return writeWithFallback(
    {
      method: 'delete',
      url: '/task/delete',
      params: { id }
    },
    {
      actionType: 'DELETE_TASK',
      payload: { id },
      cacheKey: CACHE_KEYS.taskList,
      onSuccess: () => {
        const taskList = readCache(CACHE_KEYS.taskList)
        return deleteTask(taskList, id)
      }
    }
  )
}

async function getClockList() {
  return requestWithFallback(
    {
      method: 'get',
      url: '/clock/list'
    },
    {
      cacheKey: CACHE_KEYS.clockList
    }
  )
}

async function addClock(payload) {
  return writeWithFallback(
    {
      method: 'post',
      url: '/clock/add',
      data: payload
    },
    {
      actionType: 'ADD_CLOCK',
      payload,
      cacheKey: CACHE_KEYS.clockList,
      onSuccess: (remoteData) => {
        const clockList = readCache(CACHE_KEYS.clockList)
        return upsertClock(clockList, remoteData || payload)
      }
    }
  )
}

function normalizeStatList(list) {
  if (!Array.isArray(list)) {
    return []
  }

  return list
    .map((item) => ({
      label: String(item.date || item.label || '').slice(0, 10),
      value: Number(item.studyTime ?? item.value ?? item.minutes ?? 0) || 0
    }))
    .filter((item) => item.label)
    .sort((left, right) => left.label.localeCompare(right.label))
}

async function getWeekStats() {
  const result = await requestWithFallback(
    {
      method: 'get',
      url: '/stat/week'
    },
    {
      cacheKey: CACHE_KEYS.weekStats
    }
  )

  return {
    ...result,
    data: result.offline ? result.data : normalizeStatList(result.data)
  }
}

async function getMonthStats() {
  const result = await requestWithFallback(
    {
      method: 'get',
      url: '/stat/month'
    },
    {
      cacheKey: CACHE_KEYS.monthStats
    }
  )

  return {
    ...result,
    data: result.offline ? result.data : normalizeStatList(result.data)
  }
}

async function addSession(payload) {
  const sessionList = appendSession(readCache(CACHE_KEYS.sessionList), payload)
  const saved = writeCache(CACHE_KEYS.sessionList, sessionList)

  return {
    data: sessionList,
    offline: true,
    reason: saved ? 'LOCAL_ONLY' : 'LOCAL_STORAGE_WRITE_FAILED'
  }
}

const apiService = {
  client,
  replayPending,
  getTimerConfig,
  updateTimerConfig,
  getTaskList,
  addTask,
  updateTask: updateTaskItem,
  deleteTask: deleteTaskItem,
  getClockList,
  addClock,
  getWeekStats,
  getMonthStats,
  addSession
}

export {
  client,
  replayPending,
  getTimerConfig,
  updateTimerConfig,
  getTaskList,
  addTask,
  updateTaskItem as updateTask,
  deleteTaskItem as deleteTask,
  getClockList,
  addClock,
  getWeekStats,
  getMonthStats,
  addSession
}

export default apiService
