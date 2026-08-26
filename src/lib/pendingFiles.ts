/**
 * FAB에서 고른 파일을 업로드 화면으로 넘기는 임시 보관소.
 * File 객체는 라우터 state에 담기 곤란해서 모듈 싱글턴으로 들고 있는다.
 */
let pending: File[] = []

export const setPendingFiles = (files: File[]) => {
  pending = files
}

export const takePendingFiles = (): File[] => {
  const files = pending
  pending = []
  return files
}
