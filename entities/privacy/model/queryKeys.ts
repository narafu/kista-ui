export const privacyKeys = {
  all: ['admin-privacy-bases'] as const,
  list: () => [...privacyKeys.all, 'list'] as const,
}
