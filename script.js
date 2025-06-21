// デフォルトデータ
const DEFAULT_MISSIONS = {
  daily: [
    "武神の塔 7階",
    "儀式 1回",
    "フィールドボス: 黒獣神",
    "フィールドボス: ナマズ",
    "フィールドボス: キョンシー",
    "フィールドボス: 鬼蛮",
    "4ID: ポルコロッソ",
    "4ID: 落猿寺院",
    "4ID: クモの巣",
    "4ID: 霊鱗族の遺跡",
    "英雄ID: 悪虫団の襲撃",
    "英雄ID: 海蛇 支援部",
    "英雄ID: 海蛇 司令部",
    "英雄ID: 氷倉庫",
    "英雄ID: 鮫港 訓練基地",
    "英雄ID: 鮫港 指揮本部",
    "伝説ID: シント流刑地",
    "伝説ID: 侵食された迷宮",
    "勢力: 修練の谷",
    "勢力: トムンジン",
    "勢力: 五色岩都",
    "勢力: 炎天の大地",
    "勢力: 養豚場",
    "勢力: 霧霞の森(共通)",
    "勢力: 霧霞の森(ギテツ/レッコウ+8)",
    "白鯨湖 3戦",
  ],
  weekly: [
    "武神 7階x7",
    "伝説ID 7回",
    "4ID 7回",
    "英雄ID(鮫以外) 7回",
    "フィールドボス 7体",
    "白鯨戦2勝",
  ],
}

// 状態管理
const state = {
  missions: {
    daily: [],
    weekly: [],
  },
  editing: false,
  undoState: null,
}

// DOM要素の取得
const elements = {
  dailyContainer: document.getElementById("daily-missions"),
  weeklyContainer: document.getElementById("weekly-missions"),
  editToggle: document.getElementById("edit-toggle"),
  editSection: document.getElementById("edit-section"),
  themeToggle: document.getElementById("theme-toggle"),
  resetChecks: document.getElementById("reset-checks"),
  addMission: document.getElementById("add-mission"),
  newMissionText: document.getElementById("new-mission-text"),
  addTarget: document.getElementById("add-target"),
  resetMissions: document.getElementById("reset-missions"),
  undoReset: document.getElementById("undo-reset"),
  currentTime: document.getElementById("current-time"),
  infoToggle: document.getElementById("info-toggle"),
  infoContent: document.getElementById("info-content"),
}

// 改善されたストレージユーティリティ
const storage = {
  get: (key, defaultValue = {}) => {
    try {
      const item = localStorage.getItem(key)
      if (item === null) return defaultValue
      return JSON.parse(item)
    } catch (error) {
      console.warn(`ストレージ読み込みエラー (${key}):`, error)
      return defaultValue
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error(`ストレージ保存エラー (${key}):`, error)
      return false
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error(`ストレージ削除エラー (${key}):`, error)
      return false
    }
  },
}

// テーマ管理
const theme = {
  get: () => {
    const saved = localStorage.getItem("theme")
    return saved === "dark" ? "dark" : "light"
  },

  set: (newTheme) => {
    try {
      localStorage.setItem("theme", newTheme)
      document.body.classList.toggle("dark", newTheme === "dark")
      elements.editToggle.setAttribute("aria-pressed", newTheme === "dark")
    } catch (error) {
      console.error("テーマ保存エラー:", error)
    }
  },

  toggle: () => {
    const current = theme.get()
    theme.set(current === "dark" ? "light" : "dark")
  },
}

// チェック状態の管理（改善版）
function getChecked(type) {
  return storage.get(`checked_${type}`, {})
}

function setChecked(type, index, checked) {
  const checkedData = getChecked(type)
  if (checked) {
    checkedData[index] = true
  } else {
    delete checkedData[index]
  }
  storage.set(`checked_${type}`, checkedData)
}

// チェック状態のリセット
function resetAllChecks() {
  if (confirm("すべてのチェック状態をリセットしますか？")) {
    storage.remove("checked_daily")
    storage.remove("checked_weekly")
    renderAll()
    console.log("チェック状態をリセットしました")
  }
}

// チェック状態のインデックス更新（ドラッグ&ドロップ対応）
function updateCheckedIndices(type, oldIndex, newIndex) {
  const checkedData = getChecked(type)
  const newCheckedData = {}

  Object.keys(checkedData).forEach((index) => {
    const idx = Number.parseInt(index)
    let newIdx = idx

    if (idx === oldIndex) {
      newIdx = newIndex
    } else if (oldIndex < newIndex && idx > oldIndex && idx <= newIndex) {
      newIdx = idx - 1
    } else if (oldIndex > newIndex && idx >= newIndex && idx < oldIndex) {
      newIdx = idx + 1
    }

    if (checkedData[index]) {
      newCheckedData[newIdx] = true
    }
  })

  storage.set(`checked_${type}`, newCheckedData)
}

// ミッション表示の更新
function renderMissions(type) {
  const container = type === "daily" ? elements.dailyContainer : elements.weeklyContainer
  const missions = state.missions[type]
  const checked = getChecked(type)

/* 6/6チェックでCOMPLETE!表示がいらなくなったため変更になった部分　一応残す
  const checkedCount = Object.values(checked).filter(Boolean).length
  const isComplete = checkedCount >= 6

  const counterHtml = `<div class="mission-counter ${isComplete ? "complete" : ""}" role="status" aria-live="polite">
    ${isComplete ? "COMPLETE!" : `${checkedCount} / 6`}
  </div>`
*/
  const itemsHtml = missions
    .map(
      (mission, index) => `
    <li data-index="${index}" ${state.editing ? 'draggable="true"' : ""}
        class="${checked[index] ? "checked" : ""}"
        role="listitem">
      <label>
        <input type="checkbox"
               data-type="${type}"
               data-index="${index}"
               ${checked[index] ? "checked" : ""}
               ${state.editing ? "disabled" : ""}
               aria-describedby="mission-${type}-${index}">
        <span id="mission-${type}-${index}">${mission}</span>
      </label>
      <button class="delete-btn"
              data-type="${type}"
              data-index="${index}"
              aria-label="${mission}を削除"
              tabindex="${state.editing ? "0" : "-1"}">🗑️</button>
    </li>
  `,
    )
    .join("")

  // 6/6チェックでCOMPLETE!表示機能がいらなくなったため変更になった部分　一応残す
  // container.innerHTML = `${counterHtml}<ul class="${state.editing ? "editing" : ""}" role="list">${itemsHtml}</ul>`
  container.innerHTML = `<ul class="${state.editing ? "editing" : ""}" role="list">${itemsHtml}</ul>`

  if (state.editing) {
    setupDragAndDrop(container.querySelector("ul"), type)
  }
}


// 全体の表示更新
function renderAll() {
  renderMissions("daily")
  renderMissions("weekly")
}

// ミッションデータの保存
function saveMissions() {
  storage.set("missions_daily", state.missions.daily)
  storage.set("missions_weekly", state.missions.weekly)
}

// ミッションデータの読み込み
function loadMissions() {
  state.missions.daily = storage.get("missions_daily", [...DEFAULT_MISSIONS.daily])
  state.missions.weekly = storage.get("missions_weekly", [...DEFAULT_MISSIONS.weekly])
}

// 改善されたドラッグ&ドロップ
function setupDragAndDrop(container, type) {
  let dragSrcEl = null
  let dragSrcIndex = null

  container.addEventListener("dragstart", (e) => {
    if (e.target.tagName === "LI") {
      dragSrcEl = e.target
      dragSrcIndex = Number.parseInt(e.target.dataset.index)
      e.target.classList.add("dragging")
      e.dataTransfer.effectAllowed = "move"
    }
  })

  container.addEventListener("dragend", (e) => {
    if (e.target.tagName === "LI") {
      e.target.classList.remove("dragging")
      container.querySelectorAll("li").forEach((li) => li.classList.remove("drag-over"))
      dragSrcEl = null
      dragSrcIndex = null
    }
  })

  container.addEventListener("dragover", (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    const afterElement = getDragAfterElement(container, e.clientY)
    const dragging = container.querySelector(".dragging")

    container.querySelectorAll("li").forEach((li) => li.classList.remove("drag-over"))
    if (afterElement && afterElement !== dragging) {
      afterElement.classList.add("drag-over")
    }
  })

  container.addEventListener("drop", (e) => {
    e.preventDefault()
    const afterElement = getDragAfterElement(container, e.clientY)

    if (dragSrcEl && afterElement && dragSrcEl !== afterElement) {
      const targetIndex = Number.parseInt(afterElement.dataset.index)

      // チェック状態のインデックスを更新
      updateCheckedIndices(type, dragSrcIndex, targetIndex)

      // ミッション配列を更新
      const movedItem = state.missions[type].splice(dragSrcIndex, 1)[0]
      state.missions[type].splice(targetIndex, 0, movedItem)

      saveMissions()
      renderAll()
    }
  })
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll("li:not(.dragging)")]

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect()
      const offset = y - box.top - box.height / 2

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child }
      } else {
        return closest
      }
    },
    { offset: Number.NEGATIVE_INFINITY },
  ).element
}

// 時刻計算のユーティリティ関数
const timeUtils = {
  getTodayAt(hour, minute = 0) {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute, 0, 0)
  },

  getThisWeekAt(targetDay, hour, minute = 0) {
    const now = new Date()
    const currentDay = now.getDay()
    const daysFromTarget = targetDay - currentDay

    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() + daysFromTarget)
    targetDate.setHours(hour, minute, 0, 0)

    return targetDate
  },

  getLastResetTime(storageKey) {
    const lastReset = localStorage.getItem(storageKey)
    return lastReset ? new Date(lastReset) : null
  },

  saveResetTime(storageKey, time = new Date()) {
    localStorage.setItem(storageKey, time.toISOString())
  },
}

// 自動リセット機能
function autoReset() {
  const now = new Date()
  resetDaily(now)
  resetWeekly(now)
}

function resetDaily(now) {
  const RESET_HOUR = 6
  const STORAGE_KEY = "last_daily_reset"

  const todayResetTime = timeUtils.getTodayAt(RESET_HOUR)

  if (now < todayResetTime) {
    return
  }

  const lastResetTime = timeUtils.getLastResetTime(STORAGE_KEY)

  if (!lastResetTime || lastResetTime < todayResetTime) {
    storage.remove("checked_daily")
    timeUtils.saveResetTime(STORAGE_KEY, now)
    renderMissions("daily")
    console.log(`デイリーリセット実行: ${now.toLocaleString()}`)
  }
}

function resetWeekly(now) {
  const RESET_HOUR = 6
  const RESET_DAY = 3
  const STORAGE_KEY = "last_weekly_reset"

  const thisWeekResetTime = timeUtils.getThisWeekAt(RESET_DAY, RESET_HOUR)

  if (now < thisWeekResetTime) {
    return
  }

  const lastResetTime = timeUtils.getLastResetTime(STORAGE_KEY)

  if (!lastResetTime || lastResetTime < thisWeekResetTime) {
    storage.remove("checked_weekly")
    timeUtils.saveResetTime(STORAGE_KEY, now)
    renderMissions("weekly")
    console.log(`ウィークリーリセット実行: ${now.toLocaleString()}`)
  }
}

// 修正された次回リセット時刻取得
function getNextResetTimes() {
  const now = new Date()

  const todayReset = timeUtils.getTodayAt(6)
  const nextDailyReset = now >= todayReset ? new Date(todayReset.getTime() + 24 * 60 * 60 * 1000) : todayReset

  const thisWeekReset = timeUtils.getThisWeekAt(3, 6)
  const nextWeeklyReset =
    now >= thisWeekReset ? new Date(thisWeekReset.getTime() + 7 * 24 * 60 * 60 * 1000) : thisWeekReset

  return {
    daily: nextDailyReset,
    weekly: nextWeeklyReset,
  }
}

// 時刻表示の更新
function updateCurrentTime() {
  const now = new Date()
  const days = ["日", "月", "火", "水", "木", "金", "土"]
  const day = days[now.getDay()]
  const time = now.toTimeString().slice(0, 8)
  elements.currentTime.textContent = `${day}曜日 ${time}`
}

// イベントリスナーの設定
function setupEventListeners() {
  // 編集モード切り替え
  elements.editToggle.addEventListener("click", () => {
    state.editing = !state.editing
    elements.editSection.classList.toggle("show", state.editing)
    elements.editToggle.textContent = state.editing ? "編集モード解除" : "編集モード"
    elements.editToggle.setAttribute("aria-pressed", state.editing)
    renderAll()
  })

  // テーマ切り替え
  elements.themeToggle.addEventListener("click", theme.toggle)

  // チェック状態リセット
  elements.resetChecks.addEventListener("click", resetAllChecks)

  // ミッション追加
  elements.addMission.addEventListener("click", addNewMission)

  // Enterキーでミッション追加
  elements.newMissionText.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addNewMission()
    }
  })

  // 初期化
  elements.resetMissions.addEventListener("click", resetToDefault)

  // 初期化の取り消し
  elements.undoReset.addEventListener("click", undoReset)

  // イベント委譲
  document.addEventListener("change", handleCheckboxChange)
  document.addEventListener("click", handleDeleteClick)

  // 情報セクション切り替え
  elements.infoToggle.addEventListener("click", toggleInfoSection)
}

// ミッション追加関数
function addNewMission() {
  const text = elements.newMissionText.value.trim()
  const target = elements.addTarget.value

  if (text) {
    state.missions[target].push(text)
    saveMissions()
    renderAll()
    elements.newMissionText.value = ""
    elements.newMissionText.focus()
  }
}

// 初期化関数
function resetToDefault() {
  if (confirm("本当に初期状態に戻しますか？この操作は元に戻せません。")) {
    state.undoState = {
      daily: [...state.missions.daily],
      weekly: [...state.missions.weekly],
      checkedDaily: getChecked("daily"),
      checkedWeekly: getChecked("weekly"),
    }

    state.missions.daily = [...DEFAULT_MISSIONS.daily]
    state.missions.weekly = [...DEFAULT_MISSIONS.weekly]

    storage.remove("checked_daily")
    storage.remove("checked_weekly")
    saveMissions()
    renderAll()

    elements.undoReset.style.display = "inline-block"
  }
}

// 初期化取り消し関数
function undoReset() {
  if (state.undoState) {
    state.missions.daily = [...state.undoState.daily]
    state.missions.weekly = [...state.undoState.weekly]
    saveMissions()

    storage.set("checked_daily", state.undoState.checkedDaily)
    storage.set("checked_weekly", state.undoState.checkedWeekly)
    renderAll()

    state.undoState = null
    elements.undoReset.style.display = "none"
  }
}

// チェックボックス変更ハンドラー
function handleCheckboxChange(e) {
  if (e.target.matches('input[type="checkbox"]')) {
    const type = e.target.dataset.type
    const index = e.target.dataset.index
    setChecked(type, index, e.target.checked)
    e.target.closest("li").classList.toggle("checked", e.target.checked)
    renderMissions(type)
  }
}

// 削除ボタンクリックハンドラー
function handleDeleteClick(e) {
  if (e.target.classList.contains("delete-btn")) {
    const type = e.target.dataset.type
    const index = Number.parseInt(e.target.dataset.index)

    if (confirm("このミッションを削除しますか？")) {
      state.missions[type].splice(index, 1)
      saveMissions()
      renderAll()
    }
  }
}

// 情報セクション切り替え
function toggleInfoSection() {
  const isExpanded = elements.infoToggle.getAttribute("aria-expanded") === "true"
  const newState = !isExpanded

  elements.infoToggle.setAttribute("aria-expanded", newState)
  elements.infoContent.classList.toggle("show", newState)

  // 状態を保存
  localStorage.setItem("info_section_expanded", newState)
}

// 情報セクションの状態復元
function restoreInfoSection() {
  const isExpanded = localStorage.getItem("info_section_expanded") === "true"
  elements.infoToggle.setAttribute("aria-expanded", isExpanded)
  elements.infoContent.classList.toggle("show", isExpanded)
}

// 初期化
function init() {
  try {
    // データ読み込み
    loadMissions()

    // テーマ復元
    theme.set(theme.get())

    // イベントリスナー設定
    setupEventListeners()

    // 初期表示
    renderAll()
    updateCurrentTime()

    // 情報セクション状態復元
    restoreInfoSection()

    // タイマー設定
    setInterval(updateCurrentTime, 1000)
    setInterval(autoReset, 60000)
    autoReset()

    console.log("アプリケーション初期化完了")
  } catch (error) {
    console.error("初期化エラー:", error)
    alert("アプリケーションの初期化に失敗しました。ページを再読み込みしてください。")
  }
}

// DOMContentLoadedイベントでアプリケーション開始
document.addEventListener("DOMContentLoaded", init)
