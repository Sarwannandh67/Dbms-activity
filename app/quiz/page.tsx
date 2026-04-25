'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getClientSupabase } from '@/lib/supabase'

const TIMER = 15
const CIRC = 2 * Math.PI * 40

const QUESTIONS = [
  {
    q: 'During the buggy demo, what did both users read before booking?',
    options: ['count = 0', 'count = 1', 'count = -1', 'count = 2'],
    answer: 1,
  },
  {
    q: 'What is it called when two transactions read the same value and both overwrite each other?',
    options: ['Deadlock', 'Dirty Read', 'Lost Update', 'Phantom Read'],
    answer: 2,
  },
  {
    q: 'Which SQL clause fixed the overbooking in this demo?',
    options: ['WHERE count > 0', 'SELECT FOR UPDATE', 'ON CONFLICT DO NOTHING', 'LIMIT 1'],
    answer: 1,
  },
  {
    q: 'Why did the 1.5 second delay make the bug worse?',
    options: [
      'It slowed the database',
      'It gave time for more users to read the same value before any write happened',
      'It caused a timeout error',
      'It disconnected users from Supabase',
    ],
    answer: 1,
  },
  {
    q: 'Which ACID property was violated in buggy mode?',
    options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
    answer: 2,
  },
]

const VERDICTS = [
  { max: 0, emoji: '💀', text: 'Were you even there?',                                    color: 'text-red-400',    border: 'border-red-700',   bg: 'bg-red-900/30',    meme: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7wrn1RSdMlOPf6v7zjFOpKmisvf3BT_60WQ&s',        memeAlt: 'zero score meme'    },
  { max: 2, emoji: '😶', text: 'You saw the bug but missed the fix',                      color: 'text-red-400',    border: 'border-red-700',   bg: 'bg-red-900/30',    meme: 'https://media1.tenor.com/m/hHURum-PBKsAAAAC/virat-kohli-virat-kohli-aggression.gif',        memeAlt: 'below 3 meme'       },
  { max: 3, emoji: '🤔', text: 'You saw the bug but missed the fix',                      color: 'text-yellow-400', border: 'border-yellow-700', bg: 'bg-yellow-900/20', meme: 'https://media.tenor.com/yDA46Ztr58AAAAAM/virat-funny-virat-huh.gif',                                  memeAlt: 'Virat huh meme'     },
  { max: 4, emoji: '💪', text: 'Solid — one slip',                                        color: 'text-blue-400',   border: 'border-blue-700',   bg: 'bg-blue-900/20',   meme: 'https://indianmemetemplates.com/wp-content/uploads/virat-kohli-big-eyes-meme.jpg',                       memeAlt: 'Virat Kohli big eyes'},
  { max: 5, emoji: '🏆', text: 'You understood it better than most devs in production',   color: 'text-green-400',  border: 'border-green-700',  bg: 'bg-green-900/20',  meme: 'https://pbs.twimg.com/profile_images/1444531096171937792/p55TsT3F_400x400.jpg',                          memeAlt: 'perfect score meme' },
]

/* ── Name screen ── */
function NameScreen({ name, setName, onStart }: { name: string; setName: (v: string) => void; onStart: () => void }) {
  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col items-center justify-center p-6">
      <div className="text-5xl mb-4">🧠</div>
      <h1 className="text-3xl font-black text-white mb-2 text-center">Concurrency Quiz</h1>
      <p className="text-white/40 text-center mb-2">5 questions · 15 seconds each</p>
      <p className="text-[#D4A017] text-sm text-center mb-10">Based on what you just witnessed in the demo</p>

      <form onSubmit={(e) => { e.preventDefault(); onStart() }} className="w-full max-w-sm space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={40}
          required
          autoFocus
          className="w-full bg-[#111827] border border-[#1f2937] rounded-xl px-4 py-4 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-[#D4A017] focus:ring-1 focus:ring-[#D4A017] transition-colors"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full py-4 rounded-xl font-black text-lg text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#0047AB,#0063cc)', border: '2px solid #D4A017' }}
        >
          Start Quiz →
        </button>
      </form>

      <Link href="/explain" className="mt-8 text-white/30 hover:text-white/60 text-sm transition-colors">
        ← Back to Explainer
      </Link>
    </div>
  )
}

/* ── Score screen ── */
function ScoreScreen({ name, score, totalTime, answers }: {
  name: string; score: number; totalTime: number; answers: (number | null)[]
}) {
  const verdict = VERDICTS.find(v => score <= v.max) ?? VERDICTS[VERDICTS.length - 1]
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  // Save result once on mount
  useEffect(() => {
    getClientSupabase()
      .from('ipl_quiz_results')
      .insert({ user_name: name, score, time_taken: totalTime })
      .then(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 5-second countdown then redirect to leaderboard
  useEffect(() => {
    if (countdown <= 0) { router.push('/leaderboard'); return }
    const t = setTimeout(() => setCountdown(p => p - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, router])

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Score card */}
        <div className={`rounded-2xl border-2 p-6 text-center mb-6 ${verdict.bg} ${verdict.border}`}>
          {/* Meme image */}
          {verdict.meme && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={verdict.meme}
              alt={verdict.memeAlt}
              className="w-36 h-36 object-cover rounded-2xl mx-auto mb-4 border-2 border-white/20 shadow-xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          {!verdict.meme && <div className="text-5xl mb-3">{verdict.emoji}</div>}
          <p className="text-white/40 text-sm mb-1">{name}</p>
          <div className="text-7xl font-black text-white mb-1">{score}<span className="text-3xl text-white/30">/5</span></div>
          <p className={`text-lg font-bold mt-3 ${verdict.color}`}>{verdict.text}</p>
          <p className="text-white/30 text-xs mt-2">Completed in {totalTime}s</p>
        </div>

        {/* Per-question breakdown */}
        <div className="bg-[#111827] rounded-2xl border border-[#1f2937] overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-[#1f2937]">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Question Breakdown</p>
          </div>
          {QUESTIONS.map((q, i) => {
            const chose = answers[i]
            const correct = chose === q.answer
            const timeout = chose === null
            return (
              <div key={i} className="px-5 py-3 border-b border-[#1f2937] last:border-0 flex items-start gap-3">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                  correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {correct ? '✓' : '✗'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-xs leading-snug mb-1">{q.q}</p>
                  {!correct && <p className="text-green-400 text-xs">✓ {q.options[q.answer]}</p>}
                  {timeout && <p className="text-red-400 text-xs">⏱ Time ran out</p>}
                  {!correct && !timeout && <p className="text-red-400 text-xs">You chose: {q.options[chose!]}</p>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Leaderboard CTA with countdown */}
        <Link href="/leaderboard"
          className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-bold text-white mb-3 transition-all"
          style={{ background: 'linear-gradient(135deg,#0047AB,#0063cc)', border: '2px solid #D4A017' }}>
          <span>🏆 See Live Leaderboard</span>
          <span className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-sm font-black">
            {countdown}
          </span>
        </Link>

        {/* Secondary actions */}
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 rounded-xl bg-[#111827] border border-[#1f2937] text-white/60 font-semibold text-sm hover:bg-[#1f2937] transition-colors"
          >
            Try Again
          </button>
          <Link href="/"
            className="flex-1 py-3 rounded-xl text-white/60 font-semibold text-sm text-center border border-[#1f2937] bg-[#111827] hover:bg-[#1f2937] transition-colors">
            Book Ticket
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Main quiz screen ── */
export default function QuizPage() {
  const [phase, setPhase] = useState<'name' | 'quiz' | 'done'>('name')
  const [name, setName] = useState('')
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [timeLeft, setTimeLeft] = useState(TIMER)
  const [startTime, setStartTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)

  const submitAnswer = useCallback((chosen: number | null) => {
    if (revealed) return
    setSelected(chosen)
    setRevealed(true)
    setAnswers(prev => [...prev, chosen])
    setTimeout(() => {
      setRevealed(false)
      setSelected(null)
      setTimeLeft(TIMER)
      setCurrent(prev => prev + 1)
    }, 900)
  }, [revealed])

  // Countdown
  useEffect(() => {
    if (phase !== 'quiz' || revealed) return
    if (timeLeft <= 0) { submitAnswer(null); return }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft, revealed, submitAnswer])

  // Detect end
  useEffect(() => {
    if (phase === 'quiz' && current >= QUESTIONS.length) {
      setTotalTime(Math.round((Date.now() - startTime) / 1000))
      setPhase('done')
    }
  }, [current, phase, startTime])

  function startQuiz() {
    if (!name.trim()) return
    setPhase('quiz')
    setStartTime(Date.now())
    setTimeLeft(TIMER)
  }

  if (phase === 'name') {
    return <NameScreen name={name} setName={setName} onStart={startQuiz} />
  }

  if (phase === 'done') {
    return <ScoreScreen name={name} score={answers.filter((a, i) => a === QUESTIONS[i]?.answer).length} totalTime={totalTime} answers={answers} />
  }

  // Guard: current may briefly exceed array length between state updates
  if (current >= QUESTIONS.length) return null

  const q = QUESTIONS[current]
  const timerColor = timeLeft > 8 ? '#56D364' : timeLeft > 4 ? '#D4A017' : '#E74C3C'
  const dashOffset = CIRC * (1 - timeLeft / TIMER)

  const optionStyle = (i: number) => {
    if (!revealed) return 'bg-[#111827] border-[#1f2937] text-white hover:bg-[#1f2937] hover:border-[#0047AB] active:scale-95'
    if (i === q.answer) return 'bg-green-900/60 border-green-500 text-green-300'
    if (i === selected) return 'bg-red-900/60 border-red-500 text-red-300'
    return 'bg-[#111827] border-[#1f2937] text-white/30'
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col p-5 max-w-lg mx-auto">
      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-8 pt-2">
        {QUESTIONS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i < current ? 'bg-[#D4A017]' : i === current ? 'bg-white/60' : 'bg-white/10'
          }`} />
        ))}
      </div>

      {/* Question number + timer */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-white/30 text-sm font-mono">Q{current + 1} of {QUESTIONS.length}</span>
        {/* Circular timer */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg width="64" height="64" className="-rotate-90 absolute">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle cx="32" cy="32" r="28" fill="none" stroke={timerColor}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
          </svg>
          <span className="relative z-10 font-black text-lg" style={{ color: timerColor }}>{timeLeft}</span>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-white text-xl sm:text-2xl font-bold leading-snug mb-8">
          {q.q}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => submitAnswer(i)}
              disabled={revealed}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all duration-200 text-sm sm:text-base leading-snug ${optionStyle(i)}`}
            >
              <span className="text-white/30 font-mono mr-3">{String.fromCharCode(65 + i)}.</span>
              {opt}
              {revealed && i === q.answer && <span className="float-right">✓</span>}
              {revealed && i === selected && i !== q.answer && <span className="float-right">✗</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-white/20 text-xs mt-8 pb-2">DBMS Lab · Concurrency Quiz</p>
    </div>
  )
}
