export const financeKeys = {
  all: ['finance'] as const,
  assetSnapshotsRoot: () => [...financeKeys.all, 'asset-snapshots'] as const,
  assetSnapshots: () => [...financeKeys.assetSnapshotsRoot(), 'list'] as const,
  categoriesRoot: () => [...financeKeys.all, 'categories'] as const,
  categories: () => [...financeKeys.categoriesRoot(), 'list'] as const,
  accountsRoot: () => [...financeKeys.all, 'accounts'] as const,
  accounts: () => [...financeKeys.accountsRoot(), 'list'] as const,
  monthlyClosingsRoot: () => [...financeKeys.all, 'monthly-closings'] as const,
  monthlyClosings: () => [...financeKeys.monthlyClosingsRoot(), 'list'] as const,
}
