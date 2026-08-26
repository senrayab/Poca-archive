import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { ToastProvider } from '@/components/Toast'
import { ArchivePage } from '@/pages/ArchivePage'
import { MembersPage } from '@/pages/MembersPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StatsPage } from '@/pages/StatsPage'
import { UploadPage } from '@/pages/UploadPage'

export function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<ArchivePage mode="all" />} />
          <Route path="/favorites" element={<ArchivePage mode="favorites" />} />
          <Route path="/trash" element={<ArchivePage mode="trash" />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
