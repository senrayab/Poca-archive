/**
 * 폰에서 볼 실제 빌드를 5173에 올린다.
 *
 * 이 앱은 폰에서 확인한다. 그런데 개발 서버로 보면 React가 화면을 두 번씩
 * 그리고 코드도 압축되지 않은 상태라, 실제 앱보다 한참 무겁다. 성능을
 * 판단하려면 이 명령으로 올린 것을 봐야 한다.
 *
 * 손으로 하면 세 단계다 — 쓰던 서버 끄고, 빌드하고, 다시 띄우고. 가운데를
 * 빼먹으면 옛 화면이 그대로 나오는데 그게 고쳐진 줄 알기 딱 좋다. 한 번
 * 그렇게 헛다리를 짚어서 묶어둔다.
 */
import { execFileSync, execSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PORT = 5173
const isWindows = process.platform === 'win32'

/**
 * 포트를 쓰고 있는 프로세스를 찾아 끝낸다.
 *
 * 앞서 띄운 서버가 dist 폴더를 붙잡고 있으면 빌드가 EPERM으로 실패한다.
 * 그래서 빌드보다 먼저 자리를 비워야 한다.
 */
function freePort() {
  const pids = new Set()
  try {
    if (isWindows) {
      const out = execSync(`netstat -ano -p tcp | findstr LISTENING | findstr :${PORT}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      for (const line of out.split('\n')) {
        const pid = line.trim().split(/\s+/).pop()
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid)
      }
    } else {
      const out = execSync(`lsof -ti tcp:${PORT}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      for (const pid of out.split('\n')) if (pid.trim()) pids.add(pid.trim())
    }
  } catch {
    // 아무도 안 쓰고 있으면 찾기 명령 자체가 빈손으로 끝난다 — 그게 정상이다
  }

  for (const pid of pids) {
    try {
      if (isWindows) execFileSync('taskkill', ['/PID', pid, '/F'], { stdio: 'ignore' })
      else process.kill(Number(pid), 'SIGKILL')
      console.log(`  쓰던 서버를 껐습니다 (PID ${pid})`)
    } catch {
      console.log(`  PID ${pid}을 끄지 못했습니다 — 직접 종료해 주세요`)
    }
  }
}

/*
 * npx가 아니라 설치된 vite를 직접 부른다. 윈도우에서 npx.cmd를 execFile로
 * 부르면 Node가 막는데(EINVAL), 그걸 피하려고 셸을 끼우면 인자 따옴표가
 * 또 문제가 된다. 파일을 바로 가리키면 둘 다 없다.
 */
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const vite = (args, opts = {}) =>
  execFileSync(process.execPath, [viteBin, ...args], { stdio: 'inherit', ...opts })

console.log(`\n[1/3] ${PORT}번 자리 비우기`)
freePort()

/*
 * base를 '/'로 둔다. 기본값은 깃허브 페이지용 '/Poca-archive/'인데, 그대로
 * 빌드하면 폰 홈 화면에 추가해둔 앱의 시작 주소와 어긋나 빈 화면이 나온다.
 */
console.log('[2/3] 실제 빌드 만들기')
vite(['build', '--base=/'])

console.log(`[3/3] http://<이 PC 주소>:${PORT} 에 올리기\n`)
const preview = spawn(
  process.execPath,
  [viteBin, 'preview', '--host', '--port', String(PORT)],
  { stdio: 'inherit' },
)
preview.on('exit', (code) => process.exit(code ?? 0))
