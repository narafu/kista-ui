export const adminKeys = {
  all: ['admin'] as const,
  usersRoot: () => [...adminKeys.all, 'users'] as const,
  users: (filter?: string) => [...adminKeys.usersRoot(), filter ?? 'ALL'] as const,
}
