export type UsesStatus = 'using' | 'used'

export const usesStatusLabels = { using: '在用', used: '用过' } as const satisfies Record<UsesStatus, string>

export type UsesLink = { label: string; href: string }

/** 标签存成一段文本，用顿号、逗号、竖线或间隔号分隔。 */
export function splitUsesTags(value: string) {
  return value
    .split(/[、，,|·]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/** 把说明里的 **重点** 拆成普通片段和加粗片段。 */
export function splitEmphasis(value: string) {
  return value
    .split(/\*\*(.+?)\*\*/g)
    .map((text, index) => ({ text, strong: index % 2 === 1 }))
    .filter((part) => part.text)
}
