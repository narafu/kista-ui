// entities/account public API
export type { Account, AccountRequest } from './model/types'
export type { MarginItem, PriceMap } from './api'
export {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getMargin,
  getPrices,
} from './api'
export {
  useAccountsQuery,
  useAccountMarginQuery,
  useAccountPricesQuery,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
} from './hooks/useAccountMarginQuery'
