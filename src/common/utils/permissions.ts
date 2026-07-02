// Runtime host-permission helpers for the Custom (self-hosted / OpenAI-compatible)
// provider, whose Base URL is an arbitrary origin declared via optional_host_permissions.

export const hostPatternFromUrl = (url: string): string | null => {
  try {
    return new URL(url).origin + '/*'
  } catch {
    return null
  }
}

export const hasHostPermission = async (url: string): Promise<boolean> => {
  const pattern = hostPatternFromUrl(url)
  if (!pattern) return false
  try {
    return await chrome.permissions.contains({ origins: [pattern] })
  } catch {
    return false
  }
}

/** Must be called from a user gesture (button click). */
export const requestHostPermission = async (url: string): Promise<boolean> => {
  const pattern = hostPatternFromUrl(url)
  if (!pattern) return false
  try {
    return await chrome.permissions.request({ origins: [pattern] })
  } catch {
    return false
  }
}
