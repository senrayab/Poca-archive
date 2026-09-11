import { CardGrid } from '@/components/CardGrid'
import {
  CheckIcon,
  CloseIcon,
  RestoreIcon,
  TrashIcon,
} from '@/components/Icons'
import { MemberTabs } from '@/components/MemberTabs'
import { SHOW_CATEGORY } from '@/lib/features'
import { Header } from './Header'
import type { ArchiveView } from '../types'

/**
 * 기본 레이아웃의 보관함.
 *
 * 위에서부터 머리 · 멤버 레일 · 걸린 검색어 · 격자 · 발치 한 줄이다.
 * 격자는 한 줄에 넉 장을 고정으로 두어 사진만 빽빽하게 보인다 —
 * 이 레이아웃은 '한눈에 많이'를 고른 쪽이다.
 */
export function Archive(view: ArchiveView) {
  const {
    mode,
    title,
    loading,
    cards,
    empty,
    selected,
    selectMode,
    onOpen,
    onToggleSelect,
    onSweep,
    onSelectAll,
    onClearSelection,
    memberId,
    onSelectMember,
    onAddMember,
    categories,
    categoryId,
    onSelectCategory,
    onTrash,
    onRestore,
    onPurge,
    onEmptyTrash,
  } = view

  return (
    <>
      <Header
        title={title}
        actions={
          selectMode ? (
            <div className="pick" data-picking>
              {mode === 'trash' ? (
                <>
                  <button className="icon-btn" onClick={onRestore} aria-label="되돌리기">
                    <RestoreIcon />
                  </button>
                  <button className="icon-btn" onClick={onPurge} aria-label="완전 삭제">
                    <TrashIcon />
                  </button>
                </>
              ) : (
                <button className="icon-btn" onClick={onTrash} aria-label="휴지통으로">
                  <TrashIcon />
                </button>
              )}
              <button className="icon-btn" onClick={onClearSelection} aria-label="선택 해제">
                <CloseIcon />
              </button>
            </div>
          ) : (
            <>
              {mode === 'trash' && cards.length > 0 && (
                <button className="icon-btn" onClick={onEmptyTrash} aria-label="휴지통 비우기">
                  <TrashIcon />
                </button>
              )}
              {/*
                검색어가 걸려 있다는 건 탭 아래 칩이 이미 말해준다.
                버튼까지 포인트색으로 켜두면, 검색 시트가 전체화면 딤으로
                열려 있는 동안 그 색만 딤 뒤에서 떠 보인다.
              */}
            </>
          )
        }
      />

      <div className="content">
        {/*
          멤버 레일과 분류 텍스트를 한 덩어리로 묶어 통째로 sticky 시킨다.
          따로 두면 스크롤할 때 둘 사이 틈으로 카드가 비쳐 지나가고,
          레일 그림자가 아래 분류줄에 잘려 보였다.
        */}
        <div className="filters">
          <MemberTabs selected={memberId} onSelect={onSelectMember} onAddMember={onAddMember} />

          {SHOW_CATEGORY && categories.length > 0 && (
            <div className="subtabs" role="tablist" aria-label="카테고리">
              <button
                role="tab"
                aria-selected={categoryId === null}
                onClick={() => onSelectCategory(null)}
              >
                전체 분류
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={categoryId === c.id}
                  onClick={() => onSelectCategory(categoryId === c.id ? null : c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? null : cards.length === 0 ? (
          empty
        ) : (
          <>
            {/*
              누르는 방법을 일러주는 줄은 목록 위에 둔다. 아래에 두면 다 내려간
              뒤에야 보이는데, 그때는 이미 알아냈거나 그냥 지나간 뒤다.
              장수도 같은 줄에 붙여 한 줄로 끝낸다.
            */}
            {!selectMode && (
              <p className="grid-hint">
                <span>총 {cards.length}장 · 길게 눌러 여러 장 선택</span>
                <button className="btn btn--sm" onClick={onSelectAll}>
                  <CheckIcon size={15} />
                  전체 선택
                </button>
              </p>
            )}

            <CardGrid
              cards={cards}
              showFav={mode !== 'favorites'}
              selectable={selectMode}
              selectedIds={selected}
              onSweep={onSweep}
              onOpen={onOpen}
              onToggleSelect={onToggleSelect}
            />
          </>
        )}
      </div>
    </>
  )
}
