const KEY = 'jos_task_activity'

export function markTaskActivityToday() {
  localStorage.setItem(KEY, new Date().toDateString())
}

export function hadTaskActivityToday() {
  return localStorage.getItem(KEY) === new Date().toDateString()
}
