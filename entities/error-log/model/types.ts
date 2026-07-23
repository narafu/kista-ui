export interface ClientErrorLogInput {
  errorType: string
  message?: string
  stackTrace?: string
  context?: Record<string, string>
}
