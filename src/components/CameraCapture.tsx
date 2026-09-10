import { useEffect, useRef, useState } from 'react'
import { useBackClose } from '@/hooks/useBackClose'
import { CloseIcon } from './Icons'

interface CameraCaptureProps {
  /** 한 장 찍을 때마다 부른다 */
  onShot: (file: File) => void
  onClose: () => void
}

/** 카메라에 이 정도로 달라고 청한다. 어차피 1000px로 저장하니 더 받아도 버린다. */
const WANT = 1600

/** 앱 안에서 카메라를 켤 수 있는 자리인지 (HTTPS가 아니면 브라우저가 막는다) */
export const canUseCamera = () =>
  typeof navigator !== 'undefined' &&
  Boolean(navigator.mediaDevices?.getUserMedia) &&
  window.isSecureContext

/**
 * 앱 안에서 카메라를 켜고 연달아 찍는다.
 *
 * 폰 카메라 앱을 부르는 길(input capture)도 남아 있지만, 그쪽은 카드 한 장마다
 * 앱을 나갔다 와야 한다. 스무 장, 서른 장을 찍을 때 그 왕복이 전부 값이다.
 * 여기서는 셔터만 연달아 누르면 되고, 화면이 한 번도 바뀌지 않는다.
 *
 * 덤이 둘 있다. 찍은 그림이 폰 갤러리에 남지 않고(카메라에서 앱으로 바로 온다),
 * 카메라에 처음부터 필요한 크기만 청하므로 1200만 화소를 받아 버리는 일이 없다 —
 * 그래서 셔터를 누르면 곧바로 목록에 뜬다.
 */
export function CameraCapture({ onShot, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()
  const [count, setCount] = useState(0)
  const [flash, setFlash] = useState(0)

  // 카메라 화면은 Modal을 거치지 않으므로 여기서 직접 붙인다
  useBackClose(onClose)

  useEffect(() => {
    let alive = true

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            // 뒷면 카메라. 앞면밖에 없는 기기면 브라우저가 알아서 그걸 준다.
            facingMode: { ideal: 'environment' },
            width: { ideal: WANT },
            height: { ideal: WANT },
          },
          audio: false,
        })
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setReady(true)
      } catch (e) {
        if (!alive) return
        const name = e instanceof DOMException ? e.name : ''
        setError(
          name === 'NotAllowedError'
            ? '카메라를 쓰도록 허용해 주세요. 주소창 옆 자물쇠에서 바꿀 수 있어요.'
            : name === 'NotFoundError'
              ? '쓸 수 있는 카메라를 찾지 못했습니다.'
              : '카메라를 열지 못했습니다.',
        )
      }
    })()

    return () => {
      alive = false
      // 화면을 나가면 카메라도 끈다 — 켜둔 채로 두면 불이 계속 들어와 있다
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  /*
   * 안내 틀 안에 보이는 만큼만 잘라 온다.
   *
   * 화면에는 영상이 잘려서(cover) 꽉 차게 보이므로, 틀에 걸린 자리가 원본
   * 영상의 어디인지 되짚어야 한다. 자르기 화면과 같은 약속이다 — 틀 안이 곧 결과다.
   */
  const shoot = () => {
    const video = videoRef.current
    const frame = frameRef.current
    if (!video || !frame || !ready) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return

    const box = frame.getBoundingClientRect()
    const stage = video.getBoundingClientRect()
    // 영상이 화면을 덮도록 늘어난 배율
    const fit = Math.max(stage.width / vw, stage.height / vh)
    const sw = box.width / fit
    const sh = box.height / fit
    const sx = (vw - sw) / 2 + (box.left + box.width / 2 - (stage.left + stage.width / 2)) / fit
    const sy = (vh - sh) / 2 + (box.top + box.height / 2 - (stage.top + stage.height / 2)) / fit

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(sw))
    canvas.height = Math.max(1, Math.round(sh))
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onShot(new File([blob], `poca-${Date.now()}.jpg`, { type: 'image/jpeg' }))
        setCount((n) => n + 1)
        setFlash((n) => n + 1)
        navigator.vibrate?.(12)
      },
      'image/jpeg',
      0.95,
    )
  }

  return (
    <div className="shot" role="dialog" aria-modal="true" aria-label="카메라로 촬영">
      <div className="shot__top">
        <button className="shot__close" onClick={onClose} aria-label="닫기">
          <CloseIcon size={20} />
        </button>
        <span className="shot__count">{count > 0 ? `${count}장 찍음` : '카드를 틀에 맞춰 주세요'}</span>
      </div>

      <div className="shot__stage">
        <video ref={videoRef} className="shot__video" playsInline muted autoPlay />
        <div className="shot__frame" ref={frameRef} />
        {error && <p className="shot__error">{error}</p>}
        {/* 찍힌 순간을 알리는 번쩍임 — 소리가 없으니 눈으로 알려준다 */}
        {flash > 0 && <span className="shot__flash" key={flash} aria-hidden="true" />}
      </div>

      <div className="shot__bar">
        <button
          className="shot__shutter"
          onClick={shoot}
          disabled={!ready || Boolean(error)}
          aria-label="찍기"
        />
        <button className="btn shot__done" onClick={onClose}>
          {count > 0 ? `${count}장 넣고 닫기` : '닫기'}
        </button>
      </div>
    </div>
  )
}
