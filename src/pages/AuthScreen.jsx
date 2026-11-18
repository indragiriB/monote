import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('sign-in')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    const fn = mode === 'sign-in' ? supabase.auth.signInWithPassword({ email, password }) : supabase.auth.signUp({ email, password })
    const { error } = await fn
    setLoading(false)
    if (error) setStatus(error.message)
    else if (mode === 'sign-up') setStatus('Check your email to confirm your account.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="text-4xl font-semibold tracking-tight mb-2" style={{ color: 'var(--fg)' }}>monote</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--muted)' }}>Write. Think. Keep it simple.</p>

        <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-line mb-6" />

        <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Password</label>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input-line mb-6" />

        {status && <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>{status}</p>}

        <button type="submit" disabled={loading} className="btn-bw-solid w-full py-3">
          {loading ? 'Please wait...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>

        <button type="button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} className="w-full text-sm mt-6 underline" style={{ color: 'var(--muted)' }}>
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
