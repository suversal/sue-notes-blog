// 友邻卡片上的展示用纯函数，浏览器和测试都能直接引用。

function hash(text: string) {
  let value = 7
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) | 0
  return Math.abs(value)
}

export function friendDomain(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/** 邮戳的倾斜角按网址算，刷新后不变，不同站点彼此错开，范围 -9° 到 9°。 */
export function friendTilt(url: string) {
  return (hash(url) % 19) - 9
}

/** 没有头像时邮票的底色。 */
export function friendHue(url: string) {
  return hash(friendDomain(url)) % 360
}

/** 交换友链用的「一句话」要在信纸上占一行：站点标语带冒号补充说明时，只取冒号前的第一句。 */
export function shortMotto(tagline: string) {
  const first = tagline.split(/[：:]/)[0].trim().replace(/[。.]$/, '')
  return first ? `${first}。` : tagline.trim()
}

/** 页头显示的「第一封」，取最早的结识月份，如 2024.05。 */
export function earliestMetMonth(dates: string[]) {
  const first = [...dates].sort()[0]
  return first ? first.slice(0, 7).replace('-', '.') : ''
}
