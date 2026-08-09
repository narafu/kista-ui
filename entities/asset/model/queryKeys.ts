export const assetKeys = {
  all: ['assets'] as const,
  list: () => [...assetKeys.all, 'list'] as const,
  monthlyChecksRoot: () => [...assetKeys.all, 'monthly-checks'] as const,
  monthlyChecks: () => [...assetKeys.monthlyChecksRoot(), 'list'] as const,
}
