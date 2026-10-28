

export function normalize(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/\s+/gu, ' ').trim();
}

export function compact(value: string, max: number) {
  const normalized = value.replace(/\s+/gu, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

export function escapeMarkdown(value: string) {
  return value.replace(/[\\`*_{}[\]<>#]/gu, '\\$&');
}
