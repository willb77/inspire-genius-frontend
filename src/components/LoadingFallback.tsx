export default function LoadingFallback() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 bg-[#e5e7eb] rounded-lg w-1/3" />
      <div className="h-3 bg-[#f3f4f6] rounded w-1/2" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[#e5e7eb] rounded-lg p-4">
            <div className="h-3 bg-[#e5e7eb] rounded w-1/2 mb-2" />
            <div className="h-6 bg-[#e5e7eb] rounded w-2/3 mb-1" />
            <div className="h-2 bg-[#f3f4f6] rounded w-1/3" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#e5e7eb] rounded-lg p-4 mt-4">
        <div className="h-4 bg-[#e5e7eb] rounded w-1/4 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[#f3f4f6] rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
