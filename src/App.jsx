import { useEffect, useMemo, useState } from 'react'
import { Menu, ChevronLeft } from 'lucide-react'
import { supabase } from './lib/supabaseClient'
import { useNotes } from './hooks/useNotes'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import NoteList from './components/NoteList'
import NoteEditor from './components/NoteEditor'
import AuthScreen from './pages/AuthScreen'
import { syncWidget } from './lib/widgetBridge'

const FILTER_LABELS = {
  all: 'All Notes',
  pinned: 'Pinned',
  archived: 'Archived',
  trashed: 'Trash',
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list')
  const [activeId, setActiveId] = useState(null)
  const [activeTag, setActiveTag] = useState(null)
  const [darkMode, setDarkMode] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  // Mobile-only navigation state. Below the `md` breakpoint we show one
  // panel at a time (sidebar drawer OR list OR editor) instead of the
  // three-column desktop layout — a phone screen just isn't wide enough
  // for all three at once.
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileView, setMobileView] = useState('list') // 'list' | 'editor'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

  const { notes, createNote, updateNote, deleteNote, togglePin } = useNotes({
    userId,
    filter,
    search,
  })

  const visibleNotes = useMemo(
    () => (activeTag ? notes.filter((n) => (n.tags || []).includes(activeTag)) : notes),
    [notes, activeTag]
  )

  const allTags = useMemo(() => {
    const set = new Set()
    notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)))
    return [...set].sort()
  }, [notes])

  const activeNote = visibleNotes.find((n) => n.id === activeId) ?? null

  // Mirror the current note set to the Android home screen widget
  // whenever it changes (no-op on web, see lib/widgetBridge.js).
  useEffect(() => {
    syncWidget(notes)
  }, [notes])

  async function handleCreateNote() {
    const note = await createNote()
    setActiveId(note.id)
    setSidebarOpen(false)
    setMobileView('editor')
  }

  function handleSelectNote(id) {
    setActiveId(id)
    setMobileView('editor')
  }

  function handleFilterChange(f) {
    setFilter(f)
    setActiveTag(null)
    setActiveId(null)
    setSidebarOpen(false)
    setMobileView('list')
  }

  function handleTagSelect(tag) {
    setActiveTag(tag)
    setActiveId(null)
    setSidebarOpen(false)
    setMobileView('list')
  }

  // Intent used by the Android widget's "Create Note" shortcut
  // (see docs/android-widget.md) — the widget deep-links to /?action=create.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('action') === 'create' && session) {
      handleCreateNote()
    }
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  if (session === undefined) {
    return (
      <div className="h-screen flex items-center justify-center text-sm text-ink-500">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  return (
    <div className="h-[100dvh] flex overflow-hidden relative">
      {/* Backdrop for the mobile sidebar drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      {/* Sidebar: static column on desktop, slide-in drawer on mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-out
          md:static md:translate-x-0 md:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar
          filter={filter}
          onFilterChange={handleFilterChange}
          onCreateNote={handleCreateNote}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
          tags={allTags}
          activeTag={activeTag}
          onTagSelect={handleTagSelect}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Note list column */}
      <div
        className={`w-full md:w-80 shrink-0 border-hair flex-col
          ${mobileView === 'editor' ? 'hidden' : 'flex'} md:flex md:border-r`}
      >
        <div className="flex items-center gap-2 p-3 border-b border-hair md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 border border-hair"
            aria-label="Open menu"
          >
            <Menu size={16} />
          </button>
          <span className="text-xs uppercase tracking-widest font-bold">
            {activeTag ? `#${activeTag}` : FILTER_LABELS[filter]}
          </span>
        </div>
        <SearchBar value={search} onChange={setSearch} view={view} onViewChange={setView} />
        <NoteList notes={visibleNotes} activeId={activeId} onSelect={handleSelectNote} view={view} />
      </div>

      {/* Editor column */}
      <div className={`flex-1 min-w-0 flex-col ${mobileView === 'list' ? 'hidden' : 'flex'} md:flex`}>
        <button
          onClick={() => setMobileView('list')}
          className="flex items-center gap-1 px-3 py-2 border-b border-hair text-xs uppercase tracking-wide md:hidden"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <NoteEditor
          note={activeNote}
          onChange={updateNote}
          onTogglePin={togglePin}
          onArchive={(id) => {
            updateNote(id, { archived: true })
            setMobileView('list')
          }}
          onDelete={(id) => {
            deleteNote(id)
            setActiveId(null)
            setMobileView('list')
          }}
        />
      </div>
    </div>
  )
}
