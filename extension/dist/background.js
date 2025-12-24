// TrueLensAI background (MV3) - Brave-compatible.
// Brave may not support Chrome's Side Panel API; we emulate a right-side panel via a docked popup window.

const UI_PATH = 'index.html'
const UI_URL = chrome.runtime.getURL(UI_PATH)

const DEFAULT_PANEL_WIDTH = 420
const DEFAULT_PANEL_HEIGHT = 800

let panelWindowId = null

async function getCurrentWindow() {
  return await chrome.windows.getCurrent()
}

async function openOrFocusRightPanel() {
  try {
    // If we already opened a panel window, try focusing it.
    if (typeof panelWindowId === 'number') {
      try {
        await chrome.windows.update(panelWindowId, { focused: true })
        return
      } catch {
        panelWindowId = null
      }
    }

    const currentWin = await getCurrentWindow()
    const width = DEFAULT_PANEL_WIDTH
    const height = currentWin.height ?? DEFAULT_PANEL_HEIGHT
    const left = (currentWin.left ?? 0) + Math.max((currentWin.width ?? 1200) - width, 0)
    const top = currentWin.top ?? 0

    const created = await chrome.windows.create({
      url: UI_URL,
      type: 'popup',
      focused: true,
      width,
      height,
      left,
      top,
    })

    panelWindowId = created?.id ?? null
  } catch (err) {
    console.warn('Failed to open right-side panel window:', err)
    // Fallback: open UI in a tab.
    try {
      await chrome.tabs.create({ url: UI_URL })
    } catch {}
  }
}

// Click extension icon -> open right-side panel window
chrome.action.onClicked.addListener(() => {
  void openOrFocusRightPanel()
})

// Listen for messages from content script / UI
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const m = msg || {}

  // Content-script pushes detected article text
  if (m.action === 'articleDetected' || m.action === 'articleNotFound') {
    chrome.storage.local.set({ latestArticle: m }, () => {
      // swallow runtime.lastError if any
      void chrome.runtime.lastError
      sendResponse({ success: true })
    })
    return true
  }

  // UI can request to open panel
  if (m.action === 'openSidePanel') {
    void openOrFocusRightPanel().then(() => sendResponse({ success: true }))
    return true
  }

  // Keep compatibility with older placeholder actions
  if (m.action === 'getArticleText') {
    sendResponse({ received: true })
    return true
  }
  if (m.action === 'analyzeArticle') {
    sendResponse({ status: 'processing' })
    return true
  }

  // Unknown message: respond so sender doesn't log "Receiving end does not exist"
  sendResponse({ success: false, ignored: true })
  return false
})

chrome.runtime.onInstalled.addListener(() => {
  console.log('TrueLensAI extension installed!')
})

// Seed firebase config once (from bundled json)
;(async () => {
  try {
    const existing = await new Promise((resolve) => {
      chrome.storage.local.get(['firebaseConfig'], (res) => resolve(res.firebaseConfig ?? null))
    })
    if (existing) return

    const url = chrome.runtime.getURL('firebase-config.json')
    const resp = await fetch(url)
    if (!resp.ok) return

    const config = await resp.json()
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ firebaseConfig: config }, () => {
        const err = chrome.runtime.lastError
        if (err) reject(err)
        else resolve(undefined)
      })
    })

    // Send a best-effort notification (always provide callback to avoid unchecked lastError)
    try {
      chrome.runtime.sendMessage({ type: 'FIREBASE_CONFIG_UPDATED' }, () => void chrome.runtime.lastError)
    } catch {}
  } catch (err) {
    console.warn('Failed to seed firebase config:', err)
  }
})();