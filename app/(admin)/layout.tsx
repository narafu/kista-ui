import { AdminSidebar } from '@widgets/layout/AdminSidebar'
import { AdminTopBar } from '@widgets/layout/AdminTopBar'
import { Toaster } from 'sonner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <AdminTopBar />
        <main className="flex-1 p-4 lg:p-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}
