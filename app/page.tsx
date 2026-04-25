'use client'

import { useState, useEffect } from 'react'
import { getClientSupabase } from '@/lib/supabase'

type BookingResult = {
  success: boolean
  message: string
  remaining: number
  snapshot?: number
}

const IPL_BG    = 'https://documents.iplt20.com/bcci/articles/1776319555_Video_BG_V02__1_.png'
const TEAMS_IMG = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTf-t20_ykfAKXxhxrUrAkzwFOuGuNTtUOJPA&s'

export default function StudentPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BookingResult | null>(null)
  const [mode, setMode] = useState<'buggy' | 'locked'>('buggy')

  useEffect(() => {
    const sb = getClientSupabase()
    sb.from('ipl_tickets').select('mode').eq('id', 1).single()
      .then(({ data }) => { if (data) setMode(data.mode as 'buggy' | 'locked') })
    const channel = sb.channel('mode-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ipl_tickets' },
        (payload) => { if (payload.new?.mode) setMode(payload.new.mode) })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [])

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const endpoint = mode === 'locked' ? '/api/book-safe' : '/api/book'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      setResult(await res.json())
    } catch {
      setResult({ success: false, message: 'Network error. Try again.', remaining: 0 })
    } finally {
      setLoading(false)
    }
  }

  /* ── shared wrapper: full-screen bg image with dark overlay ── */
  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={IPL_BG}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      {/* Dark overlay so text is readable */}
      <div className="absolute inset-0 bg-black/65" />
      {/* Content above overlay */}
      <div className="relative z-10 w-full flex flex-col items-center px-5 py-10">
        {children}
      </div>
    </div>
  )

  /* ── Result screen ── */
  if (result) {
    return (
      <PageWrapper>
        {/* Teams badge */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={TEAMS_IMG} alt="MI vs CSK"
          className="w-32 h-16 object-cover rounded-xl border-2 border-white/20 mb-6 shadow-xl" />

        <div className={`w-full max-w-sm rounded-2xl p-8 text-center border-2 backdrop-blur-sm fade-in-up ${
          result.success ? 'bg-green-900/60 border-green-400' : 'bg-red-900/60 border-red-400'
        }`}>
          <div className="text-6xl mb-4">{result.success ? '🎟️' : '❌'}</div>
          <h2 className={`text-2xl font-bold mb-2 ${result.success ? 'text-green-300' : 'text-red-300'}`}>
            {result.success ? 'Ticket Booked!' : 'No Ticket!'}
          </h2>
          <p className="text-gray-200 text-base mb-4">{result.message}</p>
          {result.success && (
            <div className="bg-[#0047AB]/50 rounded-xl p-4 mb-4 border border-[#0047AB]">
              <p className="text-[#D4A017] font-semibold text-xs uppercase tracking-widest mb-1">Tickets Remaining</p>
              <p className="text-5xl font-black text-white">{result.remaining}</p>
            </div>
          )}
          <p className="text-gray-400 text-sm mb-6">
            Booked as <span className="text-white font-medium">{name}</span>
          </p>
          <button onClick={() => { setResult(null); setName('') }}
            className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/20">
            Book Another
          </button>
        </div>

        {/* Mode badge */}
        <div className="mt-5 flex items-center gap-2 bg-black/40 rounded-full px-4 py-1.5">
          <span className={`w-2 h-2 rounded-full ${mode === 'buggy' ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
          <span className="text-xs text-white/70">{mode === 'buggy' ? 'Buggy Mode' : 'Safe Mode'}</span>
        </div>
      </PageWrapper>
    )
  }

  /* ── Booking screen ── */
  return (
    <PageWrapper>
      {/* Teams image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={TEAMS_IMG}
        alt="MI vs CSK"
        className="w-44 h-20 object-cover rounded-2xl border-2 border-white/20 shadow-2xl mb-6"
      />

      {/* Title */}
      <div className="text-center mb-2 fade-in-up">
        <h1 className="text-4xl font-black text-white drop-shadow-lg">
          IPL <span className="text-[#D4A017]">2025</span>
        </h1>
        <p className="text-white/70 text-sm mt-1 font-medium">
          🔵 Mumbai Indians &nbsp;vs&nbsp; Chennai Super Kings 🟡
        </p>
        <p className="text-white/40 text-xs mt-1">Wankhede Stadium · Apr 26 · 7:30 PM IST</p>
      </div>

      {/* Divider */}
      <div className="w-24 h-0.5 bg-[#D4A017]/60 rounded my-5" />

      {/* Form card */}
      <div className="w-full max-w-sm bg-black/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl fade-in-up">
        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2 font-medium">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohit Sharma"
              maxLength={40}
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white text-lg placeholder-white/30 focus:outline-none focus:border-[#D4A017] focus:ring-1 focus:ring-[#D4A017] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-5 rounded-xl font-black text-xl tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading || !name.trim()
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(135deg, #0047AB 0%, #0063cc 50%, #0047AB 100%)',
              color: '#ffffff',
              border: '2px solid #D4A017',
              animation: (!loading && name.trim()) ? 'pulse-gold 2s infinite' : 'none',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Booking...
              </span>
            ) : '🎟️ BOOK TICKET'}
          </button>
        </form>
      </div>

      {/* Mode badge */}
      <div className="mt-6 flex items-center gap-2 bg-black/40 rounded-full px-4 py-1.5">
        <span className={`w-2 h-2 rounded-full ${mode === 'buggy' ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
        <span className="text-xs text-white/70">{mode === 'buggy' ? 'Buggy Mode' : 'Safe Mode'}</span>
      </div>

      <p className="mt-3 text-white/30 text-xs">DBMS Lab · Concurrency Demo</p>
    </PageWrapper>
  )
}
