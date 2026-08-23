import dataApi from './api'
import storageService from './storage'

const DAY_MS = 24 * 60 * 60 * 1000

function normalizeDate(value) {
  return String(value || '').slice(0, 10)
}

// 统计按用户本地自然日分组；toISOString 使用 UTC，在东八区等时区的午夜附近会偏移日期。
function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getLocalSessions() {
  const sessions = storageService.read('sessions')
  return Array.isArray(sessions) ? sessions : []
}

function aggregateSessions(days) {
  const now = new Date()
  const labels = []
  const map = new Map()

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    const label = formatLocalDate(date)
    labels.push(label)
    map.set(label, 0)
  }

  for (const session of getLocalSessions()) {
    const label = normalizeDate(session.date || session.createTime)
    if (!map.has(label)) {
      continue
    }

    const studyTime = Number(session.studyTime ?? session.minutes ?? 0)
    map.set(label, map.get(label) + (Number.isFinite(studyTime) ? studyTime : 0))
  }

  return labels.map((label) => ({
    label,
    value: map.get(label) || 0
  }))
}

async function getStatSeries(days) {
  const safeDays = days === 30 ? 30 : 7
  const isWeek = safeDays === 7

  try {
    const remoteResult = isWeek ? await dataApi.getWeekStats() : await dataApi.getMonthStats()

    if (Array.isArray(remoteResult.data) && remoteResult.data.length) {
      return remoteResult.data
    }
  } catch (error) {
    return aggregateSessions(safeDays)
  }

  return aggregateSessions(safeDays)
}

export { aggregateSessions, getStatSeries }
export default { aggregateSessions, getStatSeries }
