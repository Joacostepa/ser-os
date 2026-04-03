/**
 * Leaky Bucket Rate Limiter for Tienda Nube API
 * Bucket size: 40 requests
 * Drain rate: 2 requests/second
 */
export class LeakyBucketRateLimiter {
  private tokens: number
  private lastDrain: number
  private queue: Array<() => void> = []

  constructor(
    private bucketSize: number = 40,
    private drainRate: number = 2 // tokens per second
  ) {
    this.tokens = 0
    this.lastDrain = Date.now()
  }

  private drain() {
    const now = Date.now()
    const elapsed = (now - this.lastDrain) / 1000
    const drained = elapsed * this.drainRate
    this.tokens = Math.max(0, this.tokens - drained)
    this.lastDrain = now
  }

  async acquire(): Promise<void> {
    this.drain()

    if (this.tokens < this.bucketSize) {
      this.tokens++
      return
    }

    // Wait until a token is available
    const waitTime = ((this.tokens - this.bucketSize + 1) / this.drainRate) * 1000
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        this.drain()
        this.tokens++
        resolve()
      }, waitTime)
    })
  }
}

// Shared instances per store
const limiters = new Map<string, LeakyBucketRateLimiter>()

export function getRateLimiter(storeId: string): LeakyBucketRateLimiter {
  if (!limiters.has(storeId)) {
    limiters.set(storeId, new LeakyBucketRateLimiter())
  }
  return limiters.get(storeId)!
}
