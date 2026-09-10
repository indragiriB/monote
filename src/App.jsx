import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { useNotes } from './hooks/useNotes'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import NoteList from './components/NoteList'
import NoteEditor from './components/NoteEditor'
import AuthScreen from './pages/AuthScreen'
import { syncWidget } from './lib/widgetBridge'

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
    <div className="h-screen flex">
      <Sidebar
        filter={filter}
        onFilterChange={(f) => {
          setFilter(f)
          setActiveTag(null)
        }}
        onCreateNote={handleCreateNote}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        tags={allTags}
        activeTag={activeTag}
        onTagSelect={setActiveTag}
      />

      <div className="w-80 shrink-0 border-r border-hair flex flex-col">
        <SearchBar value={search} onChange={setSearch} view={view} onViewChange={setView} />
        <NoteList notes={visibleNotes} activeId={activeId} onSelect={setActiveId} view={view} />
      </div>

      <NoteEditor
        note={activeNote}
        onChange={updateNote}
        onTogglePin={togglePin}
        onArchive={(id) => updateNote(id, { archived: true })}
        onDelete={(id) => {
          deleteNote(id)
          setActiveId(null)
        }}
      />
    </div>
  )
}
