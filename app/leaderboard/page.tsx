'use client'

import { useState, useEffect } from 'react'
import { getClientSupabase } from '@/lib/supabase'
import Link from 'next/link'

type Result = {
  id: string
  user_name: string
  score: number
  time_taken: number
  created_at: string
  isNew?: boolean
}

function badge(score: number) {
  if (score === 5) return '🏆'
  if (score === 4) return '🥈'
  if (score === 3) return '🥉'
  return '💀'
}

function rowStyle(rank: number) {
  if (rank === 0) return { border: '1px solid rgba(212,160,23,0.5)', background: 'transparent' }
  if (rank === 1) return { border: '1px solid rgba(192,192,192,0.3)', background: 'rgba(192,192,192,0.04)' }
  if (rank === 2) return { border: '1px solid rgba(205,127,50,0.3)', background: 'rgba(205,127,50,0.04)' }
  return { border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }
}

function rankDisplay(rank: number) {
  if (rank === 0) return <span className="text-[#D4A017] font-black text-3xl w-10 text-center">1</span>
  if (rank === 1) return <span className="text-[#C0C0C0] font-black text-2xl w-10 text-center">2</span>
  if (rank === 2) return <span className="text-[#CD7F32] font-black text-2xl w-10 text-center">3</span>
  return <span className="text-white/25 font-mono text-base w-10 text-center">{rank + 1}</span>
}

function scoreBar(score: number) {
  const pct = (score / 5) * 100
  const color = score === 5 ? '#56D364' : score >= 4 ? '#3498DB' : score >= 3 ? '#D4A017' : '#E74C3C'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const sb = getClientSupabase()

    sb.from('ipl_quiz_results')
      .select('*')
      .order('score', { ascending: false })
      .order('time_taken', { ascending: true })
      .then(({ data }) => {
        if (data) setResults(data)
        setLoading(false)
      })

    const channel = sb
      .channel('leaderboard-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ipl_quiz_results',
      }, (payload) => {
        const entry = payload.new as Result
        setNewIds(prev => new Set(prev).add(entry.id))
        setResults(prev => {
          const next = [...prev, entry]
          return next.sort((a, b) => b.score - a.score || a.time_taken - b.time_taken)
        })
        setTimeout(() => {
          setNewIds(prev => { const s = new Set(prev); s.delete(entry.id); return s })
        }, 1500)
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white flex flex-col">

      {/* Header */}
      <div className="px-5 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight">🧠 Quiz Leaderboard</h1>
            <p className="text-white/30 text-xs mt-0.5">
              {results.length} participant{results.length !== 1 ? 's' : ''} · sorted by score, then time
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-semibold">LIVE</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">

        {loading && (
          <div className="text-center py-24 text-white/20 text-sm">Loading...</div>
        )}

        {!loading && results.length === 0 && (
          <div className="text-center py-24">
            <p className="text-5xl mb-5">🕐</p>
            <p className="text-white/40 text-lg font-semibold">No results yet</p>
            <p className="text-white/20 text-sm mt-2 mb-8">Waiting for students to take the quiz</p>
            <Link href="/quiz"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#0047AB,#0063cc)', border: '2px solid #D4A017' }}>
              Take the Quiz →
            </Link>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3">
            {results.map((r, i) => {
              const isFirst = i === 0
              const isNew = newIds.has(r.id)
              const scoreColor = r.score === 5 ? 'text-green-400' : r.score >= 4 ? 'text-blue-400' : r.score >= 3 ? 'text-[#D4A017]' : 'text-red-400'

              return (
                <div key={r.id}
                  className={`flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-300 ${isFirst ? 'shimmer-gold' : ''} ${isNew ? 'new-row' : ''}`}
                  style={rowStyle(i)}>

                  {/* Rank */}
                  {rankDisplay(i)}

                  {/* Badge */}
                  <span className="text-2xl w-8 text-center flex-shrink-0">{badge(r.score)}</span>

                  {/* Name + score bar */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate text-sm sm:text-base ${isFirst ? 'text-[#D4A017]' : 'text-white'}`}>
                      {r.user_name}
                      {isNew && <span className="ml-2 text-xs text-green-400 font-normal animate-pulse">● new</span>}
                    </p>
                    {scoreBar(r.score)}
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <span className={`font-black text-2xl ${scoreColor}`}>{r.score}</span>
                    <span className="text-white/25 text-sm">/5</span>
                    <p className="text-white/25 text-xs font-mono mt-0.5">{r.time_taken}s</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="sticky bottom-0 bg-[#0A0E1A]/95 backdrop-blur-md border-t border-white/5 px-5 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/admin" className="text-xs text-white/30 hover:text-white/60 transition-colors">← Admin</Link>
          <Link href="/explain" className="text-xs text-white/30 hover:text-white/60 transition-colors">Explainer →</Link>
        </div>
      </div>
    </div>
  )
}
