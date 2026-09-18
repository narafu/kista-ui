export interface ReorderSummary {
  processed: number
  skipped: number
  results: Array<{
    sourceOrderId: string
    originalStatus: string
    resultingStatus: string
  }>
}
