export interface DonutSlice {
  id: string
  label: string
  value: number
  color: string
}

interface DonutProps {
  slices: DonutSlice[]
  /** 가운데 큰 숫자 아래 붙는 설명 */
  centerLabel: string
  /** 값이 0인 항목까지 범례에 남길지 (멤버는 0장이어도 보이는 편이 낫다) */
  keepEmpty?: boolean
}

const SIZE = 132
const STROKE = 13
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R
/** 조각 사이 간격(px). 조각이 하나뿐이면 원을 끊지 않는다. */
const GAP = 3

/**
 * 도넛 차트 + 범례. 라이브러리 없이 SVG 원 하나에 dasharray로 조각을 낸다.
 * (차트 하나 때문에 수백 KB짜리 패키지를 들이면 오프라인 첫 로딩이 무거워진다)
 */
export function Donut({ slices, centerLabel, keepEmpty = false }: DonutProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const drawn = slices.filter((s) => s.value > 0)
  const listed = keepEmpty ? slices : drawn

  let offset = 0

  return (
    <div className="chart">
      <div className="chart__ring">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          {/* 바탕 링 — 전체가 0장일 때도 형태가 보인다 */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            style={{ stroke: 'var(--bg-elev-2)' }}
            strokeWidth={STROKE}
          />
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {drawn.map((slice) => {
              const span = (slice.value / total) * C
              // 조각이 하나면 간격을 빼지 않는다 (원이 어중간하게 끊겨 보인다)
              const length = drawn.length > 1 ? Math.max(1, span - GAP) : span
              const dash = `${length} ${C - length}`
              // 색은 속성 대신 style로 준다 — color-mix()는 CSS 속성에서 확실히 먹는다
              const node = (
                <circle
                  key={slice.id}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  style={{ stroke: slice.color }}
                  strokeWidth={STROKE}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              )
              offset += span
              return node
            })}
          </g>
        </svg>

        <div className="chart__center">
          <strong>{total}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>

      <ul className="legend">
        {listed.map((slice) => (
          <li className="legend__row" key={slice.id}>
            <span className="legend__dot" style={{ background: slice.color }} />
            <span className="legend__name">{slice.label}</span>
            <span className="legend__value">
              {slice.value}
              {total > 0 && <b>{Math.round((slice.value / total) * 100)}%</b>}
            </span>
          </li>
        ))}
        {listed.length === 0 && <li className="legend__empty">아직 등록된 카드가 없어요</li>}
      </ul>
    </div>
  )
}
