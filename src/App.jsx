import { useEffect, useState } from 'react'
import { Menu, ChevronLeft } from 'lucide-react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { supabase } from './lib/supabaseClient'
import { db } from './lib/localDb'
import { useNotes } from './hooks/useNotes'
import { useTags } from './hooks/useTags'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import NoteList from './components/NoteList'
import NoteEditor from './components/NoteEditor'
import TagOverview from './components/TagOverview'
import CalendarView from './components/CalendarView'
import AuthScreen from './pages/AuthScreen'
import { syncWidget } from './lib/widgetBridge'
import { rehydrateReminders, onNotificationTap } from './lib/reminders'
import { getUpcomingDeadlines } from './lib/noteQueries'

const FILTER_LABELS = {
  all: 'All Notes',
  pinned: 'Pinned',
  done: 'Done',
  archived: 'Archived',
  trashed: 'Trash',
  grouped: 'By Tag',
  calendar: 'Calendar',
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list')
  const [activeId, setActiveId] = useState(null)
  const [activeTag, setActiveTag] = useState(null)
  const [activeDay, setActiveDay] = useState(null) // 'YYYY-MM-DD', for the Calendar menu
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

  const { tags, createTag, updateTag, deleteTag, colorOf } = useTags(userId)

  const {
    notes,
    hasMore,
    isFetchingMore,
    loadMore,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleDone,
  } = useNotes({
    userId,
    filter,
    search,
    tag: activeTag,
    day: activeDay,
  })

  // The currently selected note might not be in the currently-paginated /
  // filtered `notes` result (e.g. opened from a notification tap, or from
  // the calendar/tag drill-in views) — fall back to fetching it directly.
  const [directNote, setDirectNote] = useState(null)
  useEffect(() => {
    if (!activeId || notes.some((n) => n.id === activeId)) {
      setDirectNote(null)
      return
    }
    let cancelled = false
    db.notes.get(activeId).then((n) => {
      if (!cancelled) setDirectNote(n ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [activeId, notes])

  const activeNote = notes.find((n) => n.id === activeId) ?? directNote

  // Mirror the current (loaded) note set to the Android home screen widget
  // whenever it changes (no-op on web, see lib/widgetBridge.js).
  useEffect(() => {
    syncWidget(notes)
  }, [notes])

  // Re-arm reminders for every upcoming deadline once we're logged in —
  // this is what makes reminders survive an app restart (a fresh Android
  // install's alarm table, and the in-memory web timers, both start empty).
  useEffect(() => {
    if (!userId) return
    rehydrateReminders(getUpcomingDeadlines).catch(() => {})
  }, [userId])

  // Tapping an Android notification opens straight to that note.
  useEffect(() => {
    let cleanup = () => {}
    onNotificationTap((noteId) => {
      setActiveId(noteId)
      setMobileView('editor')
    }).then((remove) => {
      cleanup = remove
    })
    return () => cleanup()
  }, [])

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
    setActiveDay(null)
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

  // Drilling into a tag from the "By Tag" overview: keep filter === 'grouped'
  // but now with a tag selected, so the back arrow returns to the overview.
  function handleSelectTagFromOverview(name) {
    setActiveTag(name)
    setActiveId(null)
    setMobileView('list')
  }

  // Drilling into a day from the Calendar menu: keep filter === 'calendar'
  // but now with a day selected, so the back arrow returns to the month grid.
  function handleSelectDay(day) {
    setActiveDay(day)
    setActiveId(null)
    setMobileView('list')
  }

  async function handleRestore(id) {
    await updateNote(id, { trashed: false })
  }

  async function handleHardDelete(id) {
    await deleteNote(id, { hard: true })
    if (activeId === id) {
      setActiveId(null)
      setMobileView('list')
    }
  }

  // Deep links from the Android widget (monote://create, monote://open/<id>)
  // — handled through Capacitor's App plugin, not window.location.search:
  // the WebView always loads the same capacitor://localhost/index.html
  // regardless of what custom-scheme intent launched/resumed the activity,
  // so a query-string check on the page URL never actually sees these.
  // `getLaunchUrl` covers a cold start, `appUrlOpen` covers the app already
  // being open (Android just resumes it and fires onNewIntent natively).
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !session) return

    function handleUrl(url) {
      if (!url) return
      if (url.includes('://create')) {
        handleCreateNote()
      } else if (url.includes('://open/')) {
        const id = url.split('://open/')[1]
        if (id) {
          setActiveId(id)
          setMobileView('editor')
        }
      }
    }

    CapacitorApp.getLaunchUrl().then((res) => handleUrl(res?.url))
    const listenerPromise = CapacitorApp.addListener('appUrlOpen', (data) => handleUrl(data.url))
    return () => {
      listenerPromise.then((l) => l.remove())
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

  const showTagOverview = filter === 'grouped' && !activeTag
  const showCalendarOverview = filter === 'calendar' && !activeDay
  const trashedView = filter === 'trashed'
  const archivedView = filter === 'archived'

  return (
    <div className="h-[100dvh] flex overflow-hidden relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Backdrop for the mobile sidebar drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      {/* Sidebar: static column on desktop, slide-in drawer on mobile.
          `fixed` elements ignore the root's padding above (they position
          against the viewport, not their padded parent), so this drawer
          needs its own safe-area padding to clear the status/nav bars. */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-out
          pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
          md:static md:translate-x-0 md:z-auto md:pt-0 md:pb-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar
          filter={filter}
          onFilterChange={handleFilterChange}
          onCreateNote={handleCreateNote}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
          tags={tags}
          activeTag={activeTag}
          onTagSelect={handleTagSelect}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Note list / tag overview / calendar column */}
      <div
        className={`w-full md:w-80 shrink-0 border-hair flex-col
          ${mobileView === 'editor' ? 'hidden' : 'flex'} md:flex md:border-r`}
      >
        <div className="flex items-center gap-2 p-3 border-b border-hair md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2.5 border border-hair"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm uppercase tracking-widest font-bold truncate">
            {activeTag ? `#${activeTag}` : activeDay ? activeDay : FILTER_LABELS[filter]}
          </span>
        </div>

        {filter === 'grouped' && activeTag && (
          <button
            onClick={() => setActiveTag(null)}
            className="flex items-center gap-1 px-3 py-3 md:py-2 border-b border-hair text-sm md:text-xs uppercase tracking-wide hover:bg-ink-950 dark:hover:bg-ink-100"
          >
            <ChevronLeft size={18} className="md:hidden" />
            <ChevronLeft size={14} className="hidden md:block" /> All tags
          </button>
        )}

        {filter === 'calendar' && activeDay && (
          <button
            onClick={() => setActiveDay(null)}
            className="flex items-center gap-1 px-3 py-3 md:py-2 border-b border-hair text-sm md:text-xs uppercase tracking-wide hover:bg-ink-950 dark:hover:bg-ink-100"
          >
            <ChevronLeft size={18} className="md:hidden" />
            <ChevronLeft size={14} className="hidden md:block" /> Calendar
          </button>
        )}

        {showTagOverview ? (
          <TagOverview
            tags={tags}
            onSelectTag={handleSelectTagFromOverview}
            onUpdateTag={updateTag}
            onDeleteTag={deleteTag}
          />
        ) : showCalendarOverview ? (
          <CalendarView
            onSelectDay={handleSelectDay}
            onCreateNote={createNote}
            onOpenNote={handleSelectNote}
          />
        ) : (
          <>
            <SearchBar value={search} onChange={setSearch} view={view} onViewChange={setView} />
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
              onRestore={handleRestore}
              onHardDelete={handleHardDelete}
              archivedView={archivedView}
              onUnarchive={(id) => updateNote(id, { archived: false })}
            />
          </>
        )}
      </div>

      {/* Editor column */}
      <div className={`flex-1 min-w-0 flex-col ${mobileView === 'list' ? 'hidden' : 'flex'} md:flex`}>
        <button
          onClick={() => setMobileView('list')}
          className="flex items-center gap-1 px-3 py-3 border-b border-hair text-sm uppercase tracking-wide md:hidden"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <NoteEditor
          note={activeNote}
          allTags={tags}
          colorOf={colorOf}
          onCreateTag={createTag}
          onDeleteTag={deleteTag}
          onChange={updateNote}
          onTogglePin={togglePin}
          onToggleDone={toggleDone}
          onArchive={(id, archived) => {
            updateNote(id, { archived })
            setActiveId(null)
            setMobileView('list')
          }}
          onDelete={(id) => {
            deleteNote(id)
            setActiveId(null)
            setMobileView('list')
          }}
          onRestore={handleRestore}
          onHardDelete={handleHardDelete}
        />
      </div>
    </div>
  )
}
