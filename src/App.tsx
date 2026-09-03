import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { ToastProvider, useToast } from '@/components/Toast'
import { ArchivePage } from '@/pages/ArchivePage'
import { HistoryPage } from '@/pages/HistoryPage'
import { MembersPage } from '@/pages/MembersPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StatsPage } from '@/pages/StatsPage'
import { UploadPage } from '@/pages/UploadPage'
import { watchForUpdate } from '@/lib/update'

/*
 * 앱을 열어둔 사이에 새 버전이 자리를 넘겨받는 일이 있다.
 * 그때 화면에 떠 있는 건 이미 옛 파일이라 새로고침만 하면 바로 바뀐다 —
 * 굳이 설정까지 들어갈 필요가 없다는 걸 알려준다.
 */
function UpdateWatcher() {
  const toast = useToast()
  useEffect(() => watchForUpdate(() => toast('새 버전이 준비됐어요. 새로고침하면 바로 반영됩니다.')), [toast])
  return null
}

export function App() {
  return (
    <ToastProvider>
      <UpdateWatcher />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<ArchivePage mode="all" />} />
          <Route path="/favorites" element={<ArchivePage mode="favorites" />} />
          <Route path="/trash" element={<ArchivePage mode="trash" />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
