/*
 * 차트용 색. 멤버를 추가할 때 색을 고르지 않으므로 여기서 순서대로 배정한다.
 *
 * 매번 새로 뽑는 진짜 난수를 쓰면 화면을 다시 그릴 때마다 색이 바뀌어서
 * 어느 색이 누구였는지 기억할 수 없다. 그래서 '순서 → 색'으로 고정한다.
 * 목록 순서를 바꾸면 색도 따라 바뀌지만, 그건 멤버 관리에서 직접 옮겼을 때뿐이다.
 */
export const CHART_PALETTE = [
  '#f5809f',
  '#5aa9f0',
  '#63c9a4',
  '#f0b23f',
  '#a37bf0',
  '#4fc3d9',
  '#f2865c',
  '#8bc34a',
]

/**
 * 준비된 색을 다 쓰면 황금각(137.5°)으로 색상환을 돌며 만든다.
 * 이렇게 하면 몇 명이 되든 이웃한 색끼리 비슷해지지 않는다.
 */
export function chartColor(index: number): string {
  if (index < CHART_PALETTE.length) return CHART_PALETTE[index]
  const hue = Math.round((index * 137.508) % 360)
  return `hsl(${hue} 58% 62%)`
}
