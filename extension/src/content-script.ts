// Content Script - Runs on every page

// Extract article text from current page
function extractArticleText(): string {
  // Try common article containers
  const articleSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content',
  ]

  let articleElement: Element | null = null
  for (const selector of articleSelectors) {
    articleElement = document.querySelector(selector)
    if (articleElement) break
  }

  if (!articleElement) {
    // Fallback to body
    articleElement = document.body
  }

  // Remove script and style elements
  const clone = articleElement.cloneNode(true) as Element
  const scripts = clone.querySelectorAll('script, style, nav, footer')
  scripts.forEach((el) => el.remove())

  // Get text content and clean it up
  let text = clone.textContent || ''
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()

  return text.substring(0, 5000) // Limit to 5000 chars
}

// Extract metadata
function extractMetadata(): { title: string; url: string; description: string } {
  const title = document.title || ''
  const url = window.location.href
  const description =
    document.querySelector('meta[name="description"]')?.getAttribute('content') || ''

  return { title, url, description }
}

// Listen for messages from extension
chrome.runtime.onMessage.addListener(
  (request: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
    const req = request as { action?: string } | undefined
    if (req?.action === 'getArticleText') {
      const text = extractArticleText()
      const metadata = extractMetadata()

      sendResponse({
        text,
        metadata,
        success: true,
      })
    } else if (req?.action === 'openSidePanel') {
      // The side panel will open via manifest configuration
      chrome.runtime.sendMessage({ action: 'openSidePanel' })
      sendResponse({ success: true })
    }

    return true // Keep channel open
  }
)

// Auto-extract article when page loads
window.addEventListener('load', () => {
  const articleText = extractArticleText()
  if (articleText.length > 100) {
    // Only notify if we found substantial content
    chrome.runtime.sendMessage(
      { action: 'articleDetected', text: articleText },
      (response: unknown) => {
        if (chrome.runtime.lastError) {
          console.log('Extension context invalidated')
        }
      }
    )
  }
})
