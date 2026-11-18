import { useEffect, useState } from 'react'
import { Menu, Plus, Moon, Sun, Search, X } from 'lucide-react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { supabase } from './lib/supabaseClient'
import { db } from './lib/localDb'
import { useNotes } from './hooks/useNotes'
import { useTags } from './hooks/useTags'
import NoteList from './components/NoteList'
import NoteEditor from './components/NoteEditor'
import TagOverview from './components/TagOverview'
import CalendarView from './components/CalendarView'
import AuthScreen from './pages/AuthScreen'
import { syncWidget } from './lib/widgetBridge'
import { rehydrateReminders, onNotificationTap } from './lib/reminders'
import { getUpcomingDeadlines } from './lib/noteQueries'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pinned', label: 'Pinned' },
  { key: 'done', label: 'Done' },
  { key: 'grouped', label: 'Tags' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'archived', label: 'Archived' },
  { key: 'trashed', label: 'Trash' },
]

export default function App() {
  const [session, setSession] = useState(undefined)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list')
  const [activeId, setActiveId] = useState(null)
  const [activeTag, setActiveTag] = useState(null)
  const [activeDay, setActiveDay] = useState(null)
  const [darkMode, setDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [mobileShowEditor, setMobileShowEditor] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', darkMode ? '#0a0a0a' : '#ffffff')
  }, [darkMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  const { tags, createTag, updateTag, deleteTag, colorOf } = useTags(userId)
  const { notes, hasMore, isFetchingMore, loadMore, createNote, updateNote, deleteNote, togglePin, toggleDone } = useNotes({
    userId, filter, search, tag: activeTag, day: activeDay,
  })

  const [directNote, setDirectNote] = useState(null)
  useEffect(() => {
    if (!activeId || notes.some((n) => n.id === activeId)) { setDirectNote(null); return }
    let cancelled = false
    db.notes.get(activeId).then((n) => { if (!cancelled) setDirectNote(n ?? null) })
    return () => { cancelled = true }
  }, [activeId, notes])

  const activeNote = notes.find((n) => n.id === activeId) ?? directNote

  useEffect(() => { syncWidget(notes) }, [notes])
  useEffect(() => { if (!userId) return; rehydrateReminders(getUpcomingDeadlines).catch(() => {}) }, [userId])
  useEffect(() => {
    let cleanup = () => {}
    onNotificationTap((noteId) => { setActiveId(noteId); setMobileShowEditor(true) }).then((r) => { cleanup = r })
    return () => cleanup()
  }, [])

  async function handleCreateNote() {
    const note = await createNote()
    setActiveId(note.id)
    setMobileShowEditor(true)
  }

  function handleSelectNote(id) {
    setActiveId(id)
    setMobileShowEditor(true)
  }

  function handleFilterChange(f) {
    setFilter(f); setActiveTag(null); setActiveDay(null); setActiveId(null); setMobileShowEditor(false)
  }

  if (session === undefined) {
    return <div className="h-screen flex items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>Loading...</div>
  }
  if (!session) return <AuthScreen />

  const showTagOverview = filter === 'grouped' && !activeTag
  const showCalendarOverview = filter === 'calendar' && !activeDay
  const trashedView = filter === 'trashed'
  const archivedView = filter === 'archived'

  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <header className={`flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b ${mobileShowEditor ? 'hidden md:flex' : 'flex'}`} style={{ borderColor: 'var(--border-strong)' }}>
        <h1 className="text-xl md:text-3xl font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>monote</h1>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <Search size={16} style={{ color: 'var(--muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-transparent py-2 w-48 text-sm focus:outline-none"
              style={{ color: 'var(--fg)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search">
                <X size={14} style={{ color: 'var(--muted)' }} />
              </button>
            )}
          </div>
          <button onClick={() => setDarkMode(d => !d)} className="btn-bw p-2" aria-label="Toggle theme">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={handleCreateNote} className="btn-bw-solid py-2 px-3 md:px-4">
            <Plus size={18} /> <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </header>

      {/* Filter tabs */}
      <div className={`items-center gap-1 px-4 md:px-6 py-2 md:py-3 border-b overflow-x-auto ${mobileShowEditor ? 'hidden md:flex' : 'flex'}`} style={{ borderColor: 'var(--border)' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className="px-3 md:px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              color: filter === f.key ? 'var(--bg)' : 'var(--muted)',
              background: filter === f.key ? 'var(--fg)' : 'transparent',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Mobile search */}
      <div className={`md:hidden items-center gap-2 px-4 py-2.5 border-b ${mobileShowEditor ? 'hidden' : 'flex'}`} style={{ borderColor: 'var(--border)' }}>
        <Search size={16} style={{ color: 'var(--muted)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: 'var(--fg)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear search"><X size={16} style={{ color: 'var(--muted)' }} /></button>
        )}
      </div>

      {/* Main content: split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* List panel */}
        <div
          className={`w-full md:w-[380px] lg:w-[420px] shrink-0 flex flex-col border-r overflow-hidden
            ${mobileShowEditor ? 'hidden md:flex' : 'flex'}`}
          style={{ borderColor: 'var(--border)' }}
        >
          {showTagOverview ? (
            <TagOverview tags={tags} onSelectTag={(name) => { setActiveTag(name); setMobileShowEditor(false) }} onUpdateTag={updateTag} onDeleteTag={deleteTag} />
          ) : showCalendarOverview ? (
            <CalendarView onSelectDay={(d) => { setActiveDay(d); setMobileShowEditor(false) }} onCreateNote={createNote} onOpenNote={handleSelectNote} />
          ) : (
            <NoteList
              notes={notes}
              activeId={activeId}
              onSelect={handleSelectNote}
              view={view}
              colorOf={colorOf}
              hasMore={hasMore}
              isFetchingMore={isFetchingMore}
              onLoadMore={loadMore}
              trashedView={trashedView}
              onRestore={async (id) => { await updateNote(id, { trashed: false }) }}
              onHardDelete={async (id) => { await deleteNote(id, { hard: true }); if (activeId === id) setActiveId(null) }}
              archivedView={archivedView}
              onUnarchive={async (id) => { await updateNote(id, { archived: false }) }}
            />
          )}
        </div>

        {/* Editor panel */}
        <div className={`flex-1 flex flex-col overflow-hidden ${mobileShowEditor ? 'flex' : 'hidden md:flex'}`}>
          <div className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setMobileShowEditor(false)} className="btn-bw py-2 px-4 text-sm">
              ← Back
            </button>
          </div>
          <NoteEditor
            note={activeNote}
            allTags={tags}
            colorOf={colorOf}
            onCreateTag={createTag}
            onDeleteTag={deleteTag}
            onChange={updateNote}
            onTogglePin={togglePin}
            onToggleDone={toggleDone}
            onArchive={(id, archived) => { updateNote(id, { archived }); setActiveId(null); setMobileShowEditor(false) }}
            onDelete={(id) => { deleteNote(id); setActiveId(null); setMobileShowEditor(false) }}
            onRestore={async (id) => { await updateNote(id, { trashed: false }) }}
            onHardDelete={async (id) => { await deleteNote(id, { hard: true }); setActiveId(null); setMobileShowEditor(false) }}
          />
        </div>
      </div>
    </div>
  )
}
