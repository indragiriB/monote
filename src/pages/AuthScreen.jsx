import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('sign-in') // 'sign-in' | 'sign-up'
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    const fn =
      mode === 'sign-in'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })
    const { error } = await fn
    setLoading(false)
    if (error) setStatus(error.message)
    else if (mode === 'sign-up') setStatus('Check your email to confirm your account.')
  }

  return (
    <div className="h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="glass-strong w-full max-w-sm rounded-[2rem] p-7">
        <div className="flex flex-col items-center mb-8">
          <h1 className="dot-display text-4xl leading-none flex items-center gap-2">
            monote
            <span className="w-2 h-2 rounded-full bg-accent shadow-glow" />
          </h1>
          <p className="mt-3 dot-label text-[9px] text-ink-500">Dot matrix notes</p>
        </div>

        <label className="block dot-label text-[9px] text-ink-500 mb-1.5">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="glass-input w-full px-4 py-2.5 mb-3.5 outline-none text-sm"
        />

        <label className="block dot-label text-[9px] text-ink-500 mb-1.5">
          Password
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="glass-input w-full px-4 py-2.5 mb-4 outline-none text-sm"
        />

        {status && <p className="text-xs mb-3 text-ink-500">{status}</p>}

        <button
          type="submit"
          disabled={loading}
          className="pill pill-invert w-full py-3 text-xs disabled:opacity-50"
        >
          <span className="dot-label text-[11px]">
            {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          className="w-full text-center text-[11px] text-ink-500 mt-4 hover:text-accent transition-colors"
        >
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="h-1.5 w-1.5 rounded-full bg-ink-0 dark:bg-ink-1000 opacity-70" />
          <span className="h-1.5 w-1.5 rounded-full bg-ink-400 opacity-40" />
        </div>
      </form>
    </div>
  )
}
