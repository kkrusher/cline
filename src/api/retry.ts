interface RetryOptions {
	maxRetries?: number
	baseDelay?: number
	maxDelay?: number
	retryAllErrors?: boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxRetries: 3,
	baseDelay: 1_000,
	maxDelay: 10_000,
	retryAllErrors: false,
}

/**
 * Method decorator that implements retry logic for API calls
 * Supports both old-style decorators and new TypeScript 5.0+ decorators
 */
export function withRetry(options: RetryOptions = {}) {
	const { maxRetries, baseDelay, maxDelay, retryAllErrors } = { ...DEFAULT_OPTIONS, ...options }

	return function (
		target: any,
		context: ClassMethodDecoratorContext | string | symbol,
		descriptorOrIndex?: PropertyDescriptor | number,
	) {
		// New decorator API (TypeScript 5.0+)
		if (typeof context === "object" && context !== null && "kind" in context && context.kind === "method") {
			const methodName = String(context.name)
			return function (this: any, ...args: any[]) {
				return retryAsyncGenerator.call(this, target.prototype[methodName], args, {
					maxRetries,
					baseDelay,
					maxDelay,
					retryAllErrors,
				})
			}
		}

		// Legacy decorator API (pre-TypeScript 5.0)
		if (typeof context === "string" || typeof context === "symbol") {
			const propertyKey = context
			const descriptor = descriptorOrIndex as PropertyDescriptor

			if (descriptor && typeof descriptor.value === "function") {
				const originalMethod = descriptor.value

				descriptor.value = function (this: any, ...args: any[]) {
					return retryAsyncGenerator.call(this, originalMethod, args, {
						maxRetries,
						baseDelay,
						maxDelay,
						retryAllErrors,
					})
				}

				return descriptor
			}
		}

		return target
	}
}

/**
 * Helper function to implement retry logic for async generator functions
 */
async function* retryAsyncGenerator(
	this: any,
	originalMethod: (...args: any[]) => AsyncGenerator<any, any, any>,
	args: any[],
	options: Required<RetryOptions>,
) {
	const { maxRetries, baseDelay, maxDelay, retryAllErrors } = options

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			yield* originalMethod.apply(this, args)
			return
		} catch (error: any) {
			const isRateLimit = error?.status === 429
			const isLastAttempt = attempt === maxRetries - 1

			if ((!isRateLimit && !retryAllErrors) || isLastAttempt) {
				throw error
			}

			// Get retry delay from header or calculate exponential backoff
			// Check various rate limit headers
			const retryAfter =
				error.headers?.["retry-after"] || error.headers?.["x-ratelimit-reset"] || error.headers?.["ratelimit-reset"]

			let delay: number
			if (retryAfter) {
				// Handle both delta-seconds and Unix timestamp formats
				const retryValue = parseInt(retryAfter, 10)
				if (retryValue > Date.now() / 1000) {
					// Unix timestamp
					delay = retryValue * 1000 - Date.now()
				} else {
					// Delta seconds
					delay = retryValue * 1000
				}
			} else {
				// Use exponential backoff if no header
				delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt))
			}

			await new Promise((resolve) => setTimeout(resolve, delay))
		}
	}
}
