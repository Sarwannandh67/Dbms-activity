'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import { getClientSupabase } from '@/lib/supabase'
import Link from 'next/link'

/* ── helpers ── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function FadeIn({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView()
  return (
    <div ref={ref} className={className}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms` }}>
      {children}
    </div>
  )
}

function SectionDivider() {
  return <div className="w-full max-w-4xl mx-auto h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-20" />
}

function Pill({ children, color = 'blue' }: { children: ReactNode; color?: 'blue' | 'gold' | 'red' | 'green' }) {
  const colors = {
    blue:  'bg-[#0047AB]/30 text-[#7BA7EF] border-[#0047AB]/50',
    gold:  'bg-[#D4A017]/20 text-[#D4A017] border-[#D4A017]/40',
    red:   'bg-red-900/30 text-red-400 border-red-700/50',
    green: 'bg-green-900/30 text-green-400 border-green-700/50',
  }
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${colors[color]} mr-2 mb-2`}>
      {children}
    </span>
  )
}

/* ── syntax-highlighted code block ── */
type Token = { t: string; c: string }
function CodeBlock({ lines }: { lines: (string | Token[])[] }) {
  function renderLine(line: string | Token[], i: number) {
    if (typeof line === 'string') {
      const trimmed = line.trimStart()
      const indent = line.length - trimmed.length
      const spaces = ' '.repeat(indent)

      // colour rules
      if (trimmed.startsWith('--')) return (
        <div key={i} className="text-[#6A737D]">{spaces}{trimmed}</div>
      )
      const html = trimmed
        .replace(/(BEGIN|COMMIT|SELECT|UPDATE|INSERT|INTO|VALUES|FROM|WHERE|AND|SET|FOR|RETURNS|LANGUAGE|DECLARE|IF|THEN|ELSE|END IF|RETURN|CREATE OR REPLACE FUNCTION|const|await|\/\/)/g,
          '<span style="color:#79C0FF">$1</span>')
        .replace(/('[\w\s@.,!?-]*')/g, '<span style="color:#A5D6FF">$1</span>')
        .replace(/(FOR UPDATE|SELECT FOR UPDATE)/g, '<span style="color:#56D364">$1</span>')
        .replace(/(🔒|⏳|🔓|💥|✅|❌)/g, '$1')
      return (
        <div key={i} dangerouslySetInnerHTML={{ __html: `${spaces}${html}` }} />
      )
    }
    return (
      <div key={i}>
        {(line as Token[]).map((tok, j) => (
          <span key={j} style={{ color: tok.c }}>{tok.t}</span>
        ))}
      </div>
    )
  }

  return (
    <pre className="rounded-xl p-5 overflow-x-auto text-sm leading-6 font-mono text-[#C9D1D9]"
      style={{ background: '#0D1117', border: '1px solid #30363D' }}>
      {lines.map(renderLine)}
    </pre>
  )
}

/* ── timeline row ── */
function TimelineRow({ a, db, b, highlight = false, delay = 0 }: {
  a: string; db: string; b: string; highlight?: boolean; delay?: number
}) {
  const { ref, visible } = useInView(0.05)
  return (
    <div ref={ref} className={`grid font-mono text-xs sm:text-sm leading-6 py-1.5 transition-all duration-500 ${highlight ? 'bg-red-900/20 rounded px-2' : ''}`}
      style={{ gridTemplateColumns: '1fr auto 1fr', gap: '1rem', opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-12px)', transitionDelay: `${delay}ms` }}>
      <span style={{ color: '#3498DB' }}>{a}</span>
      <span className="text-white/50 text-center whitespace-nowrap">{db}</span>
      <span style={{ color: '#D4A017' }} className="text-right">{b}</span>
    </div>
  )
}

function TimelineHeader() {
  return (
    <div className="grid font-mono text-xs text-white/30 pb-2 border-b border-white/10 mb-2"
      style={{ gridTemplateColumns: '1fr auto 1fr', gap: '1rem' }}>
      <span style={{ color: '#3498DB' }}>User A</span>
      <span className="text-center">Database</span>
      <span style={{ color: '#D4A017' }} className="text-right">User B</span>
    </div>
  )
}

/* ── main page ── */
export default function ExplainPage() {
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 })

  useEffect(() => {
    const sb = getClientSupabase()
    sb.from('ipl_bookings').select('status').then(({ data }) => {
      if (!data) return
      setStats({
        total: data.length,
        success: data.filter(r => r.status === 'success').length,
        failed:  data.filter(r => r.status === 'failed').length,
      })
    })
  }, [])

  const impossible = Math.max(0, stats.success - 15)
  const sections = ['What Happened', 'The Bug', 'The Fix', 'The Gap', 'Real World', 'Vocabulary']

  const buggyCode = [
    '-- Both users ran this at the same time',
    '-- No lock. No check. Just trust.',
    '',
    '-- Step 1: Read current count (both see 1)',
    'SELECT count FROM ipl_tickets WHERE id = 1;',
    '',
    '-- Step 2: Application waits 1.5s (processing)',
    '-- 💥 This gap is where the race condition lives',
    '',
    '-- Step 3: Both proceed because both saw count = 1',
    'UPDATE ipl_tickets SET count = count - 1 WHERE id = 1;',
    '',
    '-- Step 4: Both insert a booking',
    "INSERT INTO ipl_bookings (user_name, status)",
    "VALUES ('User A', 'success');",
    '-- User B does the exact same insert simultaneously',
    '',
    '-- Final state: count = -1, two bookings confirmed',
  ]

  const fixCode = [
    '-- The fix: SELECT FOR UPDATE',
    '-- This locks the row until our transaction commits',
    '-- No other transaction can read OR write it in between',
    '',
    'BEGIN;',
    '',
    '  -- Step 1: Read AND lock the row atomically',
    '  SELECT count FROM ipl_tickets',
    '  WHERE id = 1',
    '  FOR UPDATE;  -- 🔒 row is now locked',
    '',
    '  -- Step 2: Check inside the lock (safe now)',
    '  -- No other transaction can sneak in here',
    '',
    '  -- Step 3: If available, decrement',
    '  UPDATE ipl_tickets',
    '  SET count = count - 1',
    '  WHERE id = 1',
    '    AND count > 0;  -- extra safety check',
    '',
    '  -- Step 4: Log the booking',
    '  INSERT INTO ipl_bookings (user_name, status)',
    "  VALUES ('User A', 'success');",
    '',
    'COMMIT; -- 🔓 lock released, next transaction proceeds',
  ]

  const rpcCode = [
    '-- In production, we wrapped this in a DB function',
    '-- so the lock lives entirely inside the database',
    '-- and never crosses a network round-trip',
    '',
    'CREATE OR REPLACE FUNCTION book_ticket_safe(p_user TEXT)',
    'RETURNS JSON LANGUAGE plpgsql AS $$',
    'DECLARE',
    '  v_count INTEGER;',
    'BEGIN',
    '  -- Lock + read in one atomic step',
    '  SELECT count INTO v_count',
    '  FROM ipl_tickets WHERE id = 1',
    '  FOR UPDATE;',
    '',
    '  IF v_count > 0 THEN',
    '    UPDATE ipl_tickets SET count = count - 1 WHERE id = 1;',
    '    INSERT INTO ipl_bookings (user_name, status, snapshot_count)',
    '    VALUES (p_user, \'success\', v_count);',
    "    RETURN json_build_object('success', true, 'remaining', v_count - 1);",
    '  ELSE',
    "    RETURN json_build_object('success', false, 'remaining', 0);",
    '  END IF;',
    'END;',
    '$$;',
  ]

  const gapCode = [
    '-- The dangerous pattern (common in application code)',
    "const tickets = await db.query('SELECT count FROM ipl_tickets')",
    '// ← HTTP calls, validations, payment processing happen here',
    '//   other users are booking RIGHT NOW',
    "await db.query('UPDATE ipl_tickets SET count = count - 1')",
    '',
    '-- Why this is wrong:',
    '-- The value you read is already stale by the time you write.',
    '-- This is not a bug you can reproduce easily in testing.',
    '-- It only appears under concurrent load. That\'s what makes it dangerous.',
  ]

  const vocabRows = [
    ['Race Condition',      'Two operations interfere because of timing',          'Both users read count=1 before either writes'],
    ['Lost Update',         "A write overwrites another write that it didn't see", "User B's write ignored User A's write entirely"],
    ['Dirty Read',          'Reading uncommitted data from another transaction',    'Would happen without transaction isolation'],
    ['Pessimistic Locking', 'Lock before you read, release after you write',        'SELECT FOR UPDATE in book_ticket_safe()'],
    ['Optimistic Locking',  'No lock — check before write, retry on conflict',      'Check version/timestamp before UPDATE'],
    ['ACID — Isolation',    "Transactions don't see each other's partial work",     "The 'I' that we violated in buggy mode"],
  ]

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">

      {/* ── Section jump sub-nav ── */}
      <div className="bg-[#0A0E1A]/80 backdrop-blur-sm border-b border-white/5 px-4 overflow-x-auto scrollbar-hide">
        <div className="max-w-5xl mx-auto flex items-center gap-1 py-2">
          {sections.map((s, i) => (
            <a key={s} href={`#s${i + 1}`}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs text-white/40 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap">
              {s}
            </a>
          ))}
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-32 pt-12 space-y-0">

        {/* ════════════════ SECTION 1 ════════════════ */}
        <section id="s1">
          <FadeIn>
            <p className="text-[#D4A017] text-sm font-semibold uppercase tracking-widest mb-4">Section 01 — The Crime Scene</p>
            <h1 className="text-4xl sm:text-6xl font-black leading-tight mb-4">
              The system just<br />committed fraud.
            </h1>
            <p className="text-xl text-white/50 mb-12">
              You booked a ticket. So did they. There was only one left.
            </p>
          </FadeIn>

          {/* Live stats */}
          <FadeIn delay={150}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              {[
                { icon: '🎟', label: 'Tickets Available', val: '15', sub: 'total seats' },
                { icon: '👥', label: 'Booking Attempts',  val: stats.total, sub: 'from DB' },
                { icon: '✅', label: 'Confirmed Bookings', val: stats.success, sub: 'from DB', green: true },
                { icon: '💥', label: 'Impossible Bookings', val: impossible, sub: 'success − 15', red: true },
              ].map(({ icon, label, val, sub, green, red }) => (
                <div key={label} className={`rounded-2xl p-5 border text-center ${
                  red && impossible > 0 ? 'bg-red-900/30 border-red-700' :
                  green ? 'bg-green-900/20 border-green-800' :
                  'bg-[#111827] border-[#1f2937]'}`}>
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className={`text-3xl font-black mb-1 ${
                    red && impossible > 0 ? 'text-red-400' : green ? 'text-green-400' : 'text-white'}`}>
                    {val}
                  </div>
                  <div className="text-white/40 text-xs">{label}</div>
                  <div className="text-white/20 text-xs">{sub}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={250}>
            <div className="rounded-2xl border border-[#D4A017]/30 bg-[#D4A017]/5 p-8 text-center">
              <p className="text-2xl sm:text-3xl font-black leading-snug text-white">
                &ldquo;The database confirmed{' '}
                <span className="text-red-400">{stats.success}</span> bookings<br />
                for a ticket that didn&apos;t exist.&rdquo;
              </p>
            </div>
          </FadeIn>
        </section>

        <SectionDivider />

        {/* ════════════════ SECTION 2 ════════════════ */}
        <section id="s2">
          <FadeIn>
            <p className="text-[#D4A017] text-sm font-semibold uppercase tracking-widest mb-4">Section 02 — The Bug</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Two users.<br />One ticket. No coordination.</h2>
            <p className="text-white/40 text-lg mb-10">What the database actually saw, step by step.</p>
          </FadeIn>

          {/* Buggy timeline */}
          <FadeIn delay={100}>
            <div className="bg-[#111827] rounded-2xl p-5 sm:p-8 border border-[#1f2937] mb-8 overflow-x-auto">
              <TimelineHeader />
              <TimelineRow delay={0}   a="SELECT count → reads 1"  db="count = 1"  b="SELECT count → reads 1" />
              <TimelineRow delay={100} a="[waiting 1.5s...]"       db="count = 1"  b="[waiting 1.5s...]" />
              <TimelineRow delay={200} a="count > 0 ✅ → proceed"  db="count = 1"  b="count > 0 ✅ → proceed" />
              <TimelineRow delay={300} a="UPDATE count = 0"        db="count = 0"  b="UPDATE count = 0  ← 💥" highlight />
              <TimelineRow delay={400} a="INSERT booking ✅"        db=""           b="INSERT booking ✅" />
              <div className="mt-4 pt-4 border-t border-white/10 font-mono text-sm">
                <span className="text-red-400 font-bold">Result: </span>
                <span className="text-white/70">2 confirmed bookings. 0 tickets.</span>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <p className="text-white/40 text-sm font-mono mb-3">— The SQL that ran in buggy mode —</p>
            <CodeBlock lines={buggyCode} />
          </FadeIn>

          <FadeIn delay={200}>
            <div className="mt-6 flex flex-wrap gap-2">
              <Pill color="red">Race Condition</Pill>
              <Pill color="red">Lost Update</Pill>
              <Pill color="red">No Isolation</Pill>
            </div>
          </FadeIn>
        </section>

        <SectionDivider />

        {/* ════════════════ SECTION 3 ════════════════ */}
        <section id="s3">
          <FadeIn>
            <p className="text-[#D4A017] text-sm font-semibold uppercase tracking-widest mb-4">Section 03 — The Fix</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">One lock.<br />Infinite order.</h2>
            <p className="text-white/40 text-lg mb-10">The same two users — with <code className="text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded text-base">SELECT FOR UPDATE</code></p>
          </FadeIn>

          {/* Safe timeline */}
          <FadeIn delay={100}>
            <div className="bg-[#111827] rounded-2xl p-5 sm:p-8 border border-green-900/40 mb-8 overflow-x-auto">
              <TimelineHeader />
              <TimelineRow delay={0}   a="SELECT count"            db="count = 1"   b="" />
              <TimelineRow delay={100} a="FOR UPDATE → 🔒 LOCKED"  db="LOCK HELD"   b="SELECT count" />
              <TimelineRow delay={200} a="[waiting 1.5s...]"       db="LOCK HELD"   b="FOR UPDATE → ⏳ BLOCKED" />
              <TimelineRow delay={300} a="count > 0 ✅ → proceed"  db="LOCK HELD"   b="(waiting for lock...)" />
              <TimelineRow delay={400} a="UPDATE count = 0"        db="count = 0"   b="" />
              <TimelineRow delay={500} a="COMMIT → 🔓 released"    db="count = 0"   b="🔓 Lock acquired" />
              <TimelineRow delay={600} a=""                        db=""            b="SELECT count → reads 0" />
              <TimelineRow delay={700} a=""                        db=""            b="count = 0 ❌ → REJECTED" />
              <div className="mt-4 pt-4 border-t border-white/10 font-mono text-sm">
                <span className="text-green-400 font-bold">Result: </span>
                <span className="text-white/70">1 confirmed booking. 0 tickets. Correct.</span>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <p className="text-white/40 text-sm font-mono mb-3">— The SQL that fixed it —</p>
            <CodeBlock lines={fixCode} />
          </FadeIn>

          <FadeIn delay={200}>
            <p className="text-white/40 text-sm font-mono mt-8 mb-3">— Wrapped as a Supabase RPC function —</p>
            <CodeBlock lines={rpcCode} />
          </FadeIn>

          <FadeIn delay={250}>
            <div className="mt-6 flex flex-wrap gap-2">
              <Pill color="green">Pessimistic Locking</Pill>
              <Pill color="green">SELECT FOR UPDATE</Pill>
              <Pill color="green">Serializable Execution</Pill>
              <Pill color="green">ACID Transactions</Pill>
            </div>
          </FadeIn>
        </section>

        <SectionDivider />

        {/* ════════════════ SECTION 4 ════════════════ */}
        <section id="s4">
          <FadeIn>
            <p className="text-[#D4A017] text-sm font-semibold uppercase tracking-widest mb-4">Section 04 — The Gap</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              The bug didn&apos;t live<br />in the database.<br />
              <span className="text-red-400">It lived in the gap.</span>
            </h2>
            <p className="text-white/40 text-lg mb-10">
              The 1.5s delay simulates real-world processing — payment gateway, seat assignment, PDF generation.
              In production this gap is milliseconds, but it&apos;s enough.
              Any two requests that overlap inside this window produce a lost update.
            </p>
          </FadeIn>

          {/* Timeline bar graphic */}
          <FadeIn delay={150}>
            <div className="bg-[#111827] rounded-2xl p-8 border border-[#1f2937] mb-8 overflow-x-auto">
              <div className="font-mono text-sm sm:text-base">
                <div className="flex items-center gap-0 mb-2">
                  <span className="text-green-400 font-bold whitespace-nowrap">[Read]</span>
                  <div className="flex-1 mx-3 relative h-8 flex items-center">
                    <div className="w-full h-0.5 bg-gradient-to-r from-green-400 via-red-500 to-red-400" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-[#111827] px-2 text-red-400 text-xs sm:text-sm font-bold whitespace-nowrap">
                        ── 1.5 seconds ──
                      </span>
                    </div>
                  </div>
                  <span className="text-red-400 font-bold whitespace-nowrap">[Write]</span>
                </div>
                <div className="text-center mt-1 mb-3">
                  <span className="text-white/40 text-xs">↑</span>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-white/50 text-sm">Every other user fit here.</p>
                  <p className="text-[#D4A017] text-sm font-semibold">All of them saw count = 1.</p>
                  <p className="text-red-400 text-sm font-bold">All of them booked.</p>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={200}>
            <CodeBlock lines={gapCode} />
          </FadeIn>
        </section>

        <SectionDivider />

        {/* ════════════════ SECTION 5 ════════════════ */}
        <section id="s5">
          <FadeIn>
            <p className="text-[#D4A017] text-sm font-semibold uppercase tracking-widest mb-4">Section 05 — Real World</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Every high-traffic system<br />has fought this bug.</h2>
            <p className="text-white/40 text-lg mb-10">These aren&apos;t hypotheticals. These are documented production incidents.</p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                icon: '🚂', name: 'IRCTC Tatkal',
                risk: 'Two users book the last berth simultaneously',
                fix: 'Seat locked with SELECT FOR UPDATE on booking attempt',
                col: 'blue',
              },
              {
                icon: '💸', name: 'UPI / Banking',
                risk: 'Balance read before debit allows double spend',
                fix: 'Debit runs inside serializable transaction with row lock',
                col: 'gold',
              },
              {
                icon: '🛒', name: 'Flipkart Big Billion Day',
                risk: 'Flash sale item oversold under burst traffic',
                fix: 'Inventory decremented atomically with CHECK constraint',
                col: 'gold',
              },
              {
                icon: '✈️', name: 'Flight Check-in',
                risk: 'Middle seat assigned to two passengers',
                fix: 'Seat record locked at selection, released only on timeout',
                col: 'blue',
              },
            ].map(({ icon, name, risk, fix, col }, i) => (
              <FadeIn key={name} delay={i * 80}>
                <div className={`h-full rounded-2xl p-6 border ${col === 'blue' ? 'bg-[#0047AB]/10 border-[#0047AB]/30' : 'bg-[#D4A017]/5 border-[#D4A017]/20'}`}>
                  <div className="text-3xl mb-3">{icon}</div>
                  <h3 className={`font-black text-lg mb-2 ${col === 'blue' ? 'text-[#7BA7EF]' : 'text-[#D4A017]'}`}>{name}</h3>
                  <div className="mb-3">
                    <span className="text-red-400 text-xs font-semibold uppercase tracking-wide">Risk</span>
                    <p className="text-white/70 text-sm mt-1">{risk}</p>
                  </div>
                  <div>
                    <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">Fix</span>
                    <p className="text-white/70 text-sm mt-1">{fix}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        <SectionDivider />

        {/* ════════════════ SECTION 6 ════════════════ */}
        <section id="s6">
          <FadeIn>
            <p className="text-[#D4A017] text-sm font-semibold uppercase tracking-widest mb-4">Section 06 — Vocabulary</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">What to call this<br />in your exam.</h2>
            <p className="text-white/40 text-lg mb-10">Six terms. Learn them cold.</p>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="rounded-2xl border border-[#1f2937] overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-3 bg-[#111827] px-5 py-3 border-b border-[#1f2937]"
                style={{ gridTemplateColumns: '1fr 2fr 2fr' }}>
                <span className="text-[#D4A017] text-xs font-bold uppercase tracking-widest">Term</span>
                <span className="text-white/30 text-xs font-bold uppercase tracking-widest">What it means</span>
                <span className="text-white/30 text-xs font-bold uppercase tracking-widest">In this demo</span>
              </div>
              {vocabRows.map(([term, meaning, demo], i) => (
                <div key={term}
                  className={`grid px-5 py-4 gap-4 border-b border-[#1f2937] last:border-0 items-start text-sm ${i % 2 === 0 ? 'bg-[#0A0E1A]' : 'bg-[#111827]/50'}`}
                  style={{ gridTemplateColumns: '1fr 2fr 2fr' }}>
                  <span className="text-white font-bold leading-snug">{term}</span>
                  <span className="text-white/50 leading-snug">{meaning}</span>
                  <span className="text-[#7BA7EF] leading-snug font-mono text-xs sm:text-sm">{demo}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        {/* ════════════════ QUIZ CTA ════════════════ */}
        <section className="pt-4 pb-8">
          <FadeIn>
            <div className="rounded-2xl border-2 border-[#D4A017]/40 bg-[#D4A017]/5 p-8 sm:p-12 text-center">
              <div className="text-4xl mb-4">🧠</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Think you got it?</h2>
              <p className="text-white/40 mb-8">5 questions. 15 seconds each. Based on exactly what you just saw.</p>
              <Link href="/quiz"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-lg text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#0047AB,#0063cc)', border: '2px solid #D4A017' }}>
                Take the Quiz →
              </Link>
            </div>
          </FadeIn>
        </section>

      </div>

      {/* ── Fixed bottom buttons ── */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-between px-4 sm:px-8 z-50 pointer-events-none">
        <Link href="/admin"
          className="pointer-events-auto flex items-center gap-2 bg-[#111827]/90 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white px-4 py-2.5 rounded-full text-sm font-semibold transition-all hover:border-white/20 shadow-xl">
          ← Admin Dashboard
        </Link>
        <Link href="/"
          className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-xl"
          style={{ background: 'linear-gradient(135deg,#0047AB,#0063cc)', border: '2px solid #D4A017', color: '#fff' }}>
          Try Booking →
        </Link>
      </div>
    </div>
  )
}
