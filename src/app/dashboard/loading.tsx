export default function DashboardLoading() {
  return (
    <div className="flex h-screen bg-[#F4F6FB]">
      {/* Sidebar skeleton */}
      <aside className="w-56 bg-gradient-to-b from-[#1A2038] to-[#141929] flex-shrink-0 flex flex-col animate-pulse">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10" />
            <div className="space-y-1.5">
              <div className="h-3 bg-white/10 rounded w-20" />
              <div className="h-2 bg-white/10 rounded w-28" />
            </div>
          </div>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {[40, 28, 32, 36].map((w, i) => (
            <div key={i} className="h-9 rounded-xl bg-white/5 mx-0" style={{ width: `${w * 4}px` }} />
          ))}
        </nav>
      </aside>

      {/* Main skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden animate-pulse">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E9F2] px-6 py-3.5 flex items-center justify-between">
          <div className="h-4 bg-[#EEF0F5] rounded w-36" />
          <div className="h-8 bg-[#EEF0F5] rounded-xl w-52" />
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* KPI cards */}
          <div className="flex gap-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex-1 bg-white rounded-2xl border border-[#E5E9F2] p-5">
                <div className="h-7 bg-[#EEF0F5] rounded w-12 mb-2" />
                <div className="h-3 bg-[#EEF0F5] rounded w-20" />
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-[#E5E9F2] h-44" />
            <div className="bg-white rounded-2xl border border-[#E5E9F2] h-44" />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E5E9F2] p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-[#F4F6FB] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
