import { useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'

interface ApiKeyFieldProps {
  label: string
  keyName: keyof ReturnType<typeof useGraphStore.getState>['apiKeys']
  placeholder: string
  helpUrl: string
  helpText: string
}

function ApiKeyField({ label, keyName, placeholder, helpUrl, helpText }: ApiKeyFieldProps) {
  const value = useGraphStore((state) => state.apiKeys[keyName])
  const setApiKey = useGraphStore((state) => state.setApiKey)

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-white/70 text-sm font-medium">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(event) => setApiKey(keyName, event.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/30 text-sm border border-white/10 focus:outline-none focus:border-[#7F77DD]/60 transition-colors"
      />
      <a
        href={helpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[#7F77DD] hover:text-[#a09af0] transition-colors"
      >
        {helpText}
      </a>
    </div>
  )
}

export default function SettingsPanel() {
  const settingsOpen = useGraphStore((state) => state.settingsOpen)
  const toggleSettings = useGraphStore((state) => state.toggleSettings)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && settingsOpen) toggleSettings()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [settingsOpen, toggleSettings])

  return (
    <>
      {/* Backdrop */}
      {settingsOpen && (
        <div
          className="absolute inset-0 z-20 bg-black/40"
          onClick={toggleSettings}
        />
      )}

      {/* Sliding panel */}
      <div
        className={`absolute top-0 right-0 bottom-0 z-30 w-80 bg-[#1e1e24] border-l border-white/10 flex flex-col transition-transform duration-300 ${
          settingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-base">Settings</h2>
          <button
            onClick={toggleSettings}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <h3 className="text-white/40 text-xs font-semibold uppercase tracking-widest">API Keys</h3>

            <ApiKeyField
              label="WhoSampled"
              keyName="whosampled"
              placeholder="Enter your WhoSampled API key"
              helpUrl="https://www.whosampled.com/api/"
              helpText="Get a WhoSampled API key →"
            />

            <ApiKeyField
              label="YouTube Data API v3"
              keyName="youtube"
              placeholder="Enter your YouTube API key"
              helpUrl="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
              helpText="Get a YouTube API key →"
            />

            <ApiKeyField
              label="Spotify Client ID"
              keyName="spotifyClientId"
              placeholder="Enter your Spotify Client ID"
              helpUrl="https://developer.spotify.com/dashboard"
              helpText="Get Spotify credentials →"
            />

            <ApiKeyField
              label="Spotify Client Secret"
              keyName="spotifyClientSecret"
              placeholder="Enter your Spotify Client Secret"
              helpUrl="https://developer.spotify.com/dashboard"
              helpText="Get Spotify credentials →"
            />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-white/40 text-xs font-semibold uppercase tracking-widest">Development</h3>
            <div className="bg-white/5 rounded-lg px-4 py-3 text-xs text-white/40 leading-relaxed">
              Set <code className="text-[#7F77DD]">VITE_USE_MOCK_DATA=true</code> in{' '}
              <code className="text-[#7F77DD]">.env.local</code> to use mock data without API keys.
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
