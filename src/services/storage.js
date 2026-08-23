const STORAGE_PREFIX = 'focusly:'
const PENDING_LIMIT = 100

const STORAGE_KEYS = {
  config: `${STORAGE_PREFIX}config`,
  tasks: `${STORAGE_PREFIX}tasks`,
  clocks: `${STORAGE_PREFIX}clocks`,
  sessions: `${STORAGE_PREFIX}sessions`,
  pending: `${STORAGE_PREFIX}pending`
}

const DEFAULT_DATA = {
  config: {
    studyDuration: 25,
    restDuration: 5
  },
  tasks: [],
  clocks: [],
  sessions: [],
  pending: []
}

function cloneValue(value) {
  if (typeof value === 'undefined') {
    return value
  }

  return JSON.parse(JSON.stringify(value))
}

function getDefaultValue(type) {
  return cloneValue(DEFAULT_DATA[type])
}

function safeParse(rawValue, fallbackValue) {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return cloneValue(fallbackValue)
  }

  try {
    return JSON.parse(rawValue)
  } catch (error) {
    return cloneValue(fallbackValue)
  }
}

function getStorageKey(type) {
  return STORAGE_KEYS[type] || `${STORAGE_PREFIX}${type}`
}

function normalizePendingQueue(queue) {
  if (!Array.isArray(queue)) {
    return []
  }

  return queue.slice(-PENDING_LIMIT)
}

function normalizeValue(type, value) {
  if (type === 'pending') {
    return normalizePendingQueue(value)
  }

  return value
}

function getLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  return window.localStorage
}

// 统一封装默认值工厂，避免调用方拿到共享引用后意外污染内部默认对象。
function resolveFallback(type, fallbackValue) {
  if (typeof fallbackValue !== 'undefined') {
    return cloneValue(fallbackValue)
  }

  return getDefaultValue(type)
}

// read 只做安全读取和解析兜底，不抛出异常，让上层页面逻辑始终可继续运行。
function read(type, fallbackValue) {
  const storage = getLocalStorage()
  const safeFallback = resolveFallback(type, fallbackValue)

  if (!storage) {
    return safeFallback
  }

  try {
    const rawValue = storage.getItem(getStorageKey(type))
    const parsedValue = safeParse(rawValue, safeFallback)
    return normalizeValue(type, parsedValue)
  } catch (error) {
    return safeFallback
  }
}

// write 返回布尔值而不是抛错，避免存储配额、隐私模式等问题直接打断页面渲染流程。
function write(type, value) {
  const storage = getLocalStorage()

  if (!storage) {
    return false
  }

  try {
    const normalizedValue = normalizeValue(type, cloneValue(value))
    storage.setItem(getStorageKey(type), JSON.stringify(normalizedValue))
    return true
  } catch (error) {
    return false
  }
}

// enqueue 专门服务离线待同步队列，采用尾部保留策略，只留下最近 100 条最有价值的操作记录。
function enqueue(item) {
  const currentQueue = read('pending')
  const nextQueue = normalizePendingQueue([...currentQueue, cloneValue(item)])

  const saved = write('pending', nextQueue)
  return saved ? cloneValue(nextQueue) : null
}

const storageService = {
  keys: { ...STORAGE_KEYS },
  defaults: cloneValue(DEFAULT_DATA),
  read,
  write,
  enqueue
}

export { STORAGE_PREFIX, STORAGE_KEYS, PENDING_LIMIT, read, write, enqueue }
export default storageService
