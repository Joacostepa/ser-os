/**
 * HMAC-SHA256 signature verification for Tienda Nube webhooks
 * Uses Web Crypto API (available in Node.js and Edge runtimes)
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )

    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))
    const computed = Buffer.from(sig).toString("hex")

    // Constant-time comparison
    if (computed.length !== signature.length) return false
    let result = 0
    for (let i = 0; i < computed.length; i++) {
      result |= computed.charCodeAt(i) ^ signature.charCodeAt(i)
    }
    return result === 0
  } catch {
    return false
  }
}
