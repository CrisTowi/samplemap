// Phase 2: full implementation
export default function SearchBar() {
  return (
    <div className="flex-1 max-w-xl">
      <input
        type="text"
        placeholder="Search a song or artist..."
        disabled
        className="w-full px-4 py-2 rounded-lg bg-white/10 text-white/40 placeholder-white/30 text-sm border border-white/10 cursor-not-allowed"
      />
    </div>
  )
}
