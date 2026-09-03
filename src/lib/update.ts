/**
 * 배포된 최신 화면으로 맞추는 일.
 *
 * 이 앱은 서비스 워커가 화면 파일(js·css·html)을 기기에 캐시해 두고
 * 오프라인에서도 열리게 한다. 그 대가로, 새 버전이 올라가도 새로고침
 * 한 번으로는 바뀌지 않을 수 있다 — 브라우저가 캐시에 있는 옛 파일을
 * 그대로 내주기 때문이다. 그래서 워커에게 직접 "다시 받아 보라"고
 * 시키는 길을 따로 둔다.
 */

export const BUILD_TIME = __BUILD_TIME__

export type UpdateResult =
  /** 새 버전을 받아 왔다 — 다시 열면 반영된다 */
  | 'updated'
  /** 이미 최신이다 */
  | 'latest'
  /** 서비스 워커가 없는 환경(개발 서버, 지원하지 않는 브라우저) */
  | 'unsupported'

/** 새 워커가 자리를 잡을 때까지 기다리되, 하염없이 붙들지는 않는다. */
const SETTLE_TIMEOUT = 8000

function settled(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (worker.state === 'activated' || worker.state === 'redundant') {
        worker.removeEventListener('statechange', check)
        resolve()
      }
    }
    worker.addEventListener('statechange', check)
    check()
  })
}

export async function checkForUpdate(): Promise<UpdateResult> {
  if (!('serviceWorker' in navigator)) return 'unsupported'
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return 'unsupported'

  // sw.js는 HTTP 캐시를 건너뛰고 다시 받아 온다 — 새 파일이면 여기서 걸린다
  await registration.update()

  const incoming = registration.installing ?? registration.waiting
  if (!incoming) return 'latest'

  await Promise.race([
    settled(incoming),
    new Promise((resolve) => window.setTimeout(resolve, SETTLE_TIMEOUT)),
  ])
  return 'updated'
}

/*
 * 페이지가 열린 채로 새 워커가 자리를 넘겨받는 일이 있다. 그때 화면에
 * 떠 있는 파일은 이미 옛 것이라 새로고침만 하면 바로 바뀐다.
 *
 * 첫 방문에도 워커가 페이지를 넘겨받으며 같은 신호가 한 번 오는데,
 * 그건 알릴 일이 아니다. 시작할 때 이미 워커가 붙어 있었는지를 기억해
 * 둘을 가른다.
 */
const hadController =
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  navigator.serviceWorker.controller !== null

export function watchForUpdate(notify: () => void): () => void {
  if (!('serviceWorker' in navigator) || !hadController) return () => {}
  const handler = () => notify()
  navigator.serviceWorker.addEventListener('controllerchange', handler)
  return () => navigator.serviceWorker.removeEventListener('controllerchange', handler)
}
