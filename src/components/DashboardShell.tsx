'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

type UserProfile = { role: string; full_name: string }

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/auth/profile').then(r => r.json()).then(json => {
      if (json.profile) setUserProfile(json.profile)
    })
  }, [])

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    ...(userProfile?.role === 'admin' ? [
      { label: 'SLA Config', href: '/dashboard/sla' },
      { label: 'Sync', href: '/dashboard/sync' },
      { label: 'Manage Users', href: '/admin/users' },
    ] : []),
  ]

  return (
    <div className="flex h-screen bg-[#F4F6FB]">
      {/* Sidebar */}
      <aside className="w-56 bg-gradient-to-b from-[#1A2038] to-[#141929] flex-shrink-0 flex flex-col shadow-xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#3B6EF0] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">TV</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">TicketView</div>
              <div className="text-white/40 text-xs">Zendesk Dashboard</div>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-0.5 flex-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                isActive(item.href)
                  ? 'bg-[#3B6EF0] text-white shadow-md shadow-[#3B6EF0]/30'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          {userProfile && (
            <div className="px-3 py-2 mb-1">
              <div className="text-white text-sm font-semibold truncate">{userProfile.full_name}</div>
              <div className="text-white/40 text-xs capitalize mt-0.5">{userProfile.role}</div>
            </div>
          )}
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              window.location.href = '/login'
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all duration-150"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-3M7 11l3-3-3-3M10 8H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content — fades in on each page */}
      <div className="flex-1 flex flex-col overflow-hidden animate-fadeInUp">
        {children}
      </div>
    </div>
  )
}
