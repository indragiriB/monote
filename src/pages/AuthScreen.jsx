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
    <div className="h-screen flex items-center justify-center font-mono">
      <form onSubmit={handleSubmit} className="w-full max-w-xs border border-hair p-6">
        <h1 className="text-sm font-bold uppercase tracking-widest mb-6 text-center">monote</h1>

        <label className="block text-[11px] uppercase tracking-wide text-ink-500 mb-1">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-hair px-3 py-2 mb-3 bg-transparent outline-none text-sm"
        />

        <label className="block text-[11px] uppercase tracking-wide text-ink-500 mb-1">
          Password
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-hair px-3 py-2 mb-4 bg-transparent outline-none text-sm"
        />

        {status && <p className="text-xs mb-3 text-ink-500">{status}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full border border-hair py-2 text-xs uppercase tracking-wide hover:bg-ink-0 hover:text-ink-1000 dark:hover:bg-ink-1000 dark:hover:text-ink-0 transition-colors disabled:opacity-50"
        >
          {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          className="w-full text-center text-[11px] text-ink-500 mt-3 underline"
        >
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
