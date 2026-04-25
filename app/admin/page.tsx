'use client'

import { useState, useEffect, useRef } from 'react'
import { getClientSupabase } from '@/lib/supabase'

type Booking = {
  id: string
  user_name: string
  status: string
  snapshot_count: number
  final_count: number
  created_at: string
}

type QuizResult = {
  id: string
  user_name: string
  score: number
  time_taken: number
  created_at: string
}

const PIN = '1234'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  const [ticketCount, setTicketCount] = useState<number | null>(null)
  const [mode, setMode] = useState<'buggy' | 'locked'>('buggy')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [resetting, setResetting] = useState(false)
  const [togglingMode, setTogglingMode] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [simCount, setSimCount] = useState(5)
  const [shaking, setShaking] = useState(false)
  const [showOverbook, setShowOverbook] = useState(false)
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [activeTab, setActiveTab] = useState<'bookings' | 'quiz'>('bookings')
  const [clearingQuiz, setClearingQuiz] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('ipl_admin_auth') === '1') {
      setAuthed(true)
    }
  }, [])

  useEffect(() => {
    if (!authed) return

    const sb = getClientSupabase()

    async function loadInitial() {
      const [{ data: ticket }, { data: bkgs }, { data: quiz }] = await Promise.all([
        sb.from('ipl_tickets').select('count, mode').eq('id', 1).single(),
        sb.from('ipl_bookings').select('*').order('created_at', { ascending: false }),
        sb.from('ipl_quiz_results').select('*').order('score', { ascending: false }).order('time_taken', { ascending: true }),
      ])
      if (ticket) {
        setTicketCount(ticket.count)
        setMode(ticket.mode as 'buggy' | 'locked')
      }
      if (bkgs) setBookings(bkgs)
      if (quiz) setQuizResults(quiz)
    }
    loadInitial()

    const ticketChannel = sb
      .channel('admin-tickets')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ipl_tickets',
      }, (payload) => {
        const newCount = payload.new.count
        setTicketCount(newCount)
        setMode(payload.new.mode)
        if (newCount < 0) {
          setShaking(true)
          setShowOverbook(true)
          setTimeout(() => setShaking(false), 700)
        } else {
          setShowOverbook(false)
        }
      })
      .subscribe()

    const bookingChannel = sb
      .channel('admin-bookings')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ipl_bookings',
      }, (payload) => {
        setBookings((prev) => [payload.new as Booking, ...prev])
      })
      .subscribe()

    const quizChannel = sb
      .channel('admin-quiz')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ipl_quiz_results',
      }, (payload) => {
        setQuizResults((prev) => {
          const next = [payload.new as QuizResult, ...prev]
          return next.sort((a, b) => b.score - a.score || a.time_taken - b.time_taken)
        })
      })
      .subscribe()

    return () => {
      sb.removeChannel(ticketChannel)
      sb.removeChannel(bookingChannel)
      sb.removeChannel(quizChannel)
    }
  }, [authed])

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin === PIN) {
      localStorage.setItem('ipl_admin_auth', '1')
      setAuthed(true)
    } else {
      setPinError(true)
      setTimeout(() => setPinError(false), 2000)
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      await fetch('/api/reset', { method: 'POST' })
      setBookings([])
      setTicketCount(15)
      setShowOverbook(false)
    } finally {
      setResetting(false)
    }
  }

  async function handleToggleMode() {
    setTogglingMode(true)
    const newMode = mode === 'buggy' ? 'locked' : 'buggy'
    try {
      await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      })
      setMode(newMode)
    } finally {
      setTogglingMode(false)
    }
  }

  async function handleSimulate() {
    setSimulating(true)
    const names = ['Rohit', 'Virat', 'Dhoni', 'Bumrah', 'Jadeja', 'KL Rahul', 'Hardik', 'Ashwin', 'Shami', 'Surya']
    const endpoint = mode === 'locked' ? '/api/book-safe' : '/api/book'
    const requests = Array.from({ length: simCount }, (_, i) =>
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: names[i % names.length] + ` (sim${i + 1})` }),
      })
    )
    // Fire all simultaneously — this is what triggers the race condition
    await Promise.allSettled(requests)
    setSimulating(false)
  }

  async function handleClearQuiz() {
    setClearingQuiz(true)
    try {
      await fetch('/api/clear-quiz', { method: 'POST' })
      setQuizResults([])
    } finally {
      setClearingQuiz(false)
    }
  }

  const successCount = bookings.filter((b) => b.status === 'success').length
  const failCount = bookings.filter((b) => b.status === 'failed').length
  const overbooking = Math.max(0, successCount - 15)

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#0A0E1A]">
        <div className="bg-[#111827] rounded-2xl p-10 w-full max-w-sm border border-[#1f2937]">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
            <p className="text-gray-500 text-sm mt-1">Enter PIN to continue</p>
          </div>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              maxLength={8}
              className={`w-full bg-[#0A0E1A] border rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[0.5em] focus:outline-none transition-colors ${
                pinError ? 'border-red-500 shake' : 'border-[#1f2937] focus:border-[#0047AB]'
              }`}
            />
            {pinError && <p className="text-red-400 text-sm text-center">Wrong PIN</p>}
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-[#0047AB] text-white font-bold text-lg hover:bg-[#0063cc] transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

  const isNegative = ticketCount !== null && ticketCount < 0

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏏</span>
          <div>
            <h1 className="text-2xl font-black text-white">IPL Ticket Booking</h1>
            <p className="text-gray-500 text-sm">Presenter Dashboard · DBMS Concurrency Demo</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs">Student URL</p>
          <p className="text-[#D4A017] font-mono font-bold text-sm">
            {typeof window !== 'undefined' ? `${window.location.origin}/` : '/'}
          </p>
        </div>
      </div>

      {/* Overbooking Banner */}
      {showOverbook && (
        <div className="mb-6 bg-red-900/60 border-2 border-red-500 rounded-2xl px-6 py-4 flex items-center gap-4 fade-in-up">
          <span className="text-4xl">🚨</span>
          <div>
            <p className="text-red-300 font-black text-xl uppercase tracking-wide">Overbooking Detected!</p>
            <p className="text-red-400 text-sm">Ticket count went below zero — race condition confirmed</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL */}
        <div className="space-y-4">
          {/* Ticket Counter */}
          <div className="bg-[#111827] rounded-2xl p-6 border border-[#1f2937] text-center">
            <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mb-3">
              Tickets Available
            </p>
            <div
              className={`text-8xl font-black mb-2 transition-colors ${
                isNegative ? `text-red-500 ${shaking ? 'shake' : ''}` : 'text-white'
              }`}
            >
              {ticketCount ?? '—'}
            </div>
            <p className="text-gray-600 text-xs">/ 15 total</p>
          </div>

          {/* Mode Toggle */}
          <div className="bg-[#111827] rounded-2xl p-5 border border-[#1f2937]">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Current Mode
            </p>
            <div className={`rounded-xl px-4 py-3 mb-4 flex items-center gap-3 ${
              mode === 'buggy' ? 'bg-red-900/30 border border-red-700' : 'bg-green-900/30 border border-green-700'
            }`}>
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${mode === 'buggy' ? 'bg-red-400' : 'bg-green-400'}`} />
              <div>
                <p className={`font-bold text-sm ${mode === 'buggy' ? 'text-red-300' : 'text-green-300'}`}>
                  {mode === 'buggy' ? '⚠️ Buggy Mode' : '🔒 Locked Mode'}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {mode === 'buggy' ? 'No locking — race condition active' : 'SELECT FOR UPDATE — safe'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleMode}
              disabled={togglingMode}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                mode === 'buggy'
                  ? 'bg-green-700 hover:bg-green-600 text-white'
                  : 'bg-red-800 hover:bg-red-700 text-white'
              } disabled:opacity-50`}
            >
              {togglingMode ? '...' : mode === 'buggy' ? '🔒 Switch to Locked Mode' : '⚠️ Switch to Buggy Mode'}
            </button>
          </div>

          {/* Reset */}
          <div className="bg-[#111827] rounded-2xl p-5 border border-[#1f2937]">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Reset Demo
            </p>
            <p className="text-gray-500 text-xs mb-3">Resets count to 15 and clears all bookings.</p>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="w-full py-3 rounded-xl bg-[#1f2937] hover:bg-[#374151] text-gray-300 font-bold text-sm transition-colors disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : '🔄 Reset Everything'}
            </button>
          </div>

          {/* Simulate */}
          <div className="bg-[#111827] rounded-2xl p-5 border border-[#D4A017]/30">
            <p className="text-[#D4A017] text-xs font-semibold uppercase tracking-widest mb-3">
              🧪 Simulate Students
            </p>
            <p className="text-gray-500 text-xs mb-3">
              Fires all requests simultaneously to trigger the race condition.
            </p>
            <div className="flex items-center gap-2 mb-3">
              {[3, 5, 8, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setSimCount(n)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    simCount === n
                      ? 'bg-[#D4A017] text-black'
                      : 'bg-[#1f2937] text-gray-400 hover:bg-[#374151]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="w-full py-3 rounded-xl bg-[#D4A017] hover:bg-yellow-500 text-black font-black text-sm transition-colors disabled:opacity-50"
            >
              {simulating ? `Firing ${simCount} requests...` : `🚀 Fire ${simCount} Simultaneous`}
            </button>
          </div>

          {/* Student URL card */}
          <div className="bg-[#111827] rounded-2xl p-5 border border-[#1f2937]">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Student Link
            </p>
            <div className="bg-[#0A0E1A] rounded-xl p-4 text-center">
              <p className="text-[#D4A017] font-mono text-lg font-bold break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/` : '/'}
              </p>
            </div>
            <p className="text-gray-600 text-xs mt-2 text-center">Share this URL with students</p>
          </div>

          {/* Leaderboard pin */}
          <div className="bg-[#111827] rounded-2xl p-5 border border-[#D4A017]/20">
            <p className="text-[#D4A017] text-xs font-semibold uppercase tracking-widest mb-3">
              🏆 Live Leaderboard
            </p>
            <p className="text-gray-500 text-xs mb-3">Project this after the quiz — updates in realtime as students submit.</p>
            <a href="/leaderboard" target="_blank" rel="noopener noreferrer"
              className="w-full py-3 rounded-xl font-bold text-sm text-white text-center block transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#0047AB,#0063cc)', border: '2px solid #D4A017' }}>
              Open Leaderboard ↗
            </a>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total', value: bookings.length, color: 'text-white' },
              { label: 'Successful', value: successCount, color: 'text-green-400' },
              { label: 'Failed', value: failCount, color: 'text-red-400' },
              { label: 'Overbookings', value: overbooking, color: overbooking > 0 ? 'text-red-400' : 'text-gray-500' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#111827] rounded-xl p-4 border border-[#1f2937] text-center">
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 bg-[#111827] border border-[#1f2937] rounded-xl p-1">
            {([
              { key: 'bookings', label: '📋 Live Booking Feed' },
              { key: 'quiz',     label: `🧠 Quiz Leaderboard ${quizResults.length > 0 ? `(${quizResults.length})` : ''}` },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === key
                    ? 'bg-[#0047AB] text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Booking Feed */}
          {activeTab === 'bookings' && (
            <div className="bg-[#111827] rounded-2xl border border-[#1f2937] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1f2937] flex items-center justify-between">
                <h2 className="text-white font-bold">Live Booking Feed</h2>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs font-medium">LIVE</span>
                </span>
              </div>
              <div ref={feedRef} className="overflow-y-auto" style={{ maxHeight: '520px' }}>
                {bookings.length === 0 ? (
                  <div className="text-center py-16 text-gray-600">
                    <p className="text-4xl mb-3">📋</p>
                    <p>No bookings yet. Waiting for students...</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-[#0A0E1A] sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">#</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Name</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Status</th>
                        <th className="px-4 py-3 text-right text-gray-500 font-medium">Snapshot</th>
                        <th className="px-4 py-3 text-right text-gray-500 font-medium">Final</th>
                        <th className="px-4 py-3 text-right text-gray-500 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b, i) => (
                        <tr key={b.id}
                          className={`border-t border-[#1f2937] slide-in ${
                            b.status === 'success' ? 'hover:bg-green-900/10' : 'hover:bg-red-900/10'
                          }`}>
                          <td className="px-4 py-3 text-gray-600">{bookings.length - i}</td>
                          <td className="px-4 py-3 text-white font-medium">{b.user_name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              b.status === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                            }`}>
                              {b.status === 'success' ? '✓ Success' : '✗ Failed'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${b.snapshot_count > 0 ? 'text-[#D4A017]' : 'text-red-400'}`}>
                            {b.snapshot_count ?? '—'}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${
                            b.final_count < 0 ? 'text-red-500' : b.final_count === 0 ? 'text-yellow-400' : 'text-gray-300'
                          }`}>
                            {b.final_count ?? '—'}{b.final_count < 0 && ' ⚠️'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 text-xs">
                            {new Date(b.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Quiz Leaderboard */}
          {activeTab === 'quiz' && (
            <div className="bg-[#111827] rounded-2xl border border-[#1f2937] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1f2937] flex items-center justify-between">
                <h2 className="text-white font-bold">Quiz Leaderboard</h2>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 text-xs font-medium">LIVE</span>
                  </span>
                  <button
                    onClick={handleClearQuiz}
                    disabled={clearingQuiz || quizResults.length === 0}
                    className="px-3 py-1 rounded-lg bg-red-900/40 hover:bg-red-900/70 text-red-400 text-xs font-semibold border border-red-800/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {clearingQuiz ? 'Clearing...' : 'Clear'}
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '520px' }}>
                {quizResults.length === 0 ? (
                  <div className="text-center py-16 text-gray-600">
                    <p className="text-4xl mb-3">🧠</p>
                    <p>No quiz results yet.</p>
                    <p className="text-xs mt-2">Share <span className="text-gray-400 font-mono">/quiz</span> with students</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-[#0A0E1A] sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Rank</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Name</th>
                        <th className="px-4 py-3 text-center text-gray-500 font-medium">Score</th>
                        <th className="px-4 py-3 text-center text-gray-500 font-medium">Time</th>
                        <th className="px-4 py-3 text-right text-gray-500 font-medium">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizResults.map((r, i) => {
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
                        const scoreColor = r.score === 5 ? 'text-green-400' : r.score >= 4 ? 'text-blue-400' : r.score >= 2 ? 'text-yellow-400' : 'text-red-400'
                        const verdict = r.score <= 1 ? 'Were you even there?' : r.score <= 3 ? 'Saw the bug, missed the fix' : r.score === 4 ? 'Solid — one slip' : 'Better than most devs'
                        return (
                          <tr key={r.id} className={`border-t border-[#1f2937] slide-in ${i < 3 ? 'hover:bg-[#D4A017]/5' : 'hover:bg-white/5'}`}>
                            <td className="px-4 py-3 text-center font-bold text-lg">{medal}</td>
                            <td className="px-4 py-3 text-white font-medium">{r.user_name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-black text-lg ${scoreColor}`}>{r.score}</span>
                              <span className="text-gray-600 text-xs">/5</span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-400 text-xs font-mono">{r.time_taken}s</td>
                            <td className="px-4 py-3 text-right text-gray-500 text-xs">{verdict}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Teaching note */}
          <div className="bg-[#0047AB]/10 border border-[#0047AB]/30 rounded-xl px-5 py-4">
            <p className="text-[#7BA7EF] text-xs font-semibold uppercase tracking-wide mb-1">
              💡 What to look for
            </p>
            <p className="text-gray-400 text-sm">
              In <strong className="text-red-300">Buggy Mode</strong>: multiple students with the same{' '}
              <em>Snapshot</em> means they all read the same stale count. Watch Final count go
              negative — that&apos;s overbooking. In{' '}
              <strong className="text-green-300">Locked Mode</strong>: each snapshot is unique,
              count never goes below 0.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
