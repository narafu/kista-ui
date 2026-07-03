import type {
  AdminAccount,
  AdminReorderTimingAvailability,
  AdminStrategy,
  AdminStrategyOrder,
} from '@entities/user'

export interface ReorderSummary {
  processed: number
  skipped: number
  results: Array<{
    sourceOrderId: string
    originalStatus: string
    resultingStatus: string
  }>
}

export interface AdminTradesState {
  page: number
  size: number
  selectedUserId: string
  selectedBroker: string
  selectedAccountId: string
  selectedStrategyId: string
  accounts: AdminAccount[]
  strategies: AdminStrategy[]
  orders: AdminStrategyOrder[]
  strategyStatusPending: boolean
  reorderPending: boolean
  reorderResult: ReorderSummary | null
  actionError: string | null
  timingAvailability: AdminReorderTimingAvailability
}

const DEFAULT_TIMING_AVAILABILITY: AdminReorderTimingAvailability = {
  atOpen: false,
  atClose: true,
  immediate: false,
}

export function createInitialState({ initialPage, initialSize }: { initialPage: number; initialSize: number }): AdminTradesState {
  return {
    page: initialPage,
    size: initialSize,
    selectedUserId: '',
    selectedBroker: '',
    selectedAccountId: '',
    selectedStrategyId: '',
    accounts: [],
    strategies: [],
    orders: [],
    strategyStatusPending: false,
    reorderPending: false,
    reorderResult: null,
    actionError: null,
    timingAvailability: DEFAULT_TIMING_AVAILABILITY,
  }
}

export type AdminTradesAction =
  | { type: 'SET_SIZE'; size: number }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SELECT_USER'; userId: string }
  | { type: 'SELECT_BROKER'; broker: string }
  | { type: 'SELECT_ACCOUNT'; accountId: string }
  | { type: 'SELECT_STRATEGY'; strategyId: string }
  | { type: 'LOADED_ACCOUNTS'; accounts: AdminAccount[] }
  | { type: 'LOADED_STRATEGIES'; strategies: AdminStrategy[] }
  | { type: 'LOADED_ORDERS'; orders: AdminStrategyOrder[] }
  | { type: 'STRATEGIES_FAILED'; message: string }
  | { type: 'ORDERS_FAILED'; message: string }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'STRATEGY_STATUS_START' }
  | { type: 'STRATEGY_STATUS_END' }
  | { type: 'REORDER_START' }
  | { type: 'REORDER_SUCCESS'; summary: ReorderSummary }
  | { type: 'REORDER_END' }
  | { type: 'SET_TIMING_AVAILABILITY'; timingAvailability: AdminReorderTimingAvailability }

const FEEDBACK_CLEAR = { reorderResult: null, actionError: null } as const

export function adminTradesReducer(state: AdminTradesState, action: AdminTradesAction): AdminTradesState {
  switch (action.type) {
    case 'SET_SIZE': return { ...state, size: action.size, page: 1 }
    case 'SET_PAGE': return { ...state, page: action.page }
    case 'SELECT_USER': return { ...state, ...FEEDBACK_CLEAR, selectedUserId: action.userId, selectedBroker: '', selectedAccountId: '', selectedStrategyId: '', accounts: [], strategies: [], orders: [], page: 1 }
    case 'SELECT_BROKER': return { ...state, ...FEEDBACK_CLEAR, selectedBroker: action.broker, selectedAccountId: '', selectedStrategyId: '', strategies: [], orders: [], page: 1 }
    case 'SELECT_ACCOUNT': return { ...state, ...FEEDBACK_CLEAR, selectedAccountId: action.accountId, selectedStrategyId: '', orders: [], page: 1 }
    case 'SELECT_STRATEGY': return { ...state, ...FEEDBACK_CLEAR, selectedStrategyId: action.strategyId, orders: [], page: 1 }
    case 'LOADED_ACCOUNTS': return { ...state, accounts: action.accounts }
    case 'LOADED_STRATEGIES': return { ...state, strategies: action.strategies }
    case 'LOADED_ORDERS': return { ...state, orders: action.orders }
    case 'STRATEGIES_FAILED': return { ...state, strategies: [], actionError: action.message }
    case 'ORDERS_FAILED': return { ...state, orders: [], actionError: action.message }
    case 'SET_ERROR': return { ...state, actionError: action.message }
    case 'STRATEGY_STATUS_START': return { ...state, strategyStatusPending: true, actionError: null }
    case 'STRATEGY_STATUS_END': return { ...state, strategyStatusPending: false }
    case 'REORDER_START': return { ...state, reorderPending: true, reorderResult: null, actionError: null }
    case 'REORDER_SUCCESS': return { ...state, reorderResult: action.summary }
    case 'REORDER_END': return { ...state, reorderPending: false }
    case 'SET_TIMING_AVAILABILITY': return { ...state, timingAvailability: action.timingAvailability }
  }
}
