'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState, useEffect } from 'react'
import { getClientSupabase } from '@/lib/supabase'

const PAGES = [
  {
    title: 'IPL Ticket Booking',
    subtitle: 'Students scan to book tickets',
    url: 'https://dbmsteam12.vercel.app/',
    icon: '🎟️',
    accent: '#0047AB',
    border: 'border-[#0047AB]/40',
    bg: 'bg-[#0047AB]/10',
  },
  {
    title: 'Concept Explainer',
    subtitle: 'Race condition explained visually',
    url: 'https://dbmsteam12.vercel.app/explain',
    icon: '📖',
    accent: '#D4A017',
    border: 'border-[#D4A017]/40',
    bg: 'bg-[#D4A017]/10',
  },
  {
    title: 'Viva Quiz',
    subtitle: 'Students test their understanding',
    url: 'https://dbmsteam12.vercel.app/quiz',
    icon: '🧠',
    accent: '#56D364',
    border: 'border-green-600/40',
    bg: 'bg-green-900/15',
  },
]

export default function QRPage() {
  const [qrRevealed, setQrRevealed] = useState<boolean | null>(null)

  useEffect(() => {
    const sb = getClientSupabase()

    sb.from('ipl_tickets').select('qr_revealed').eq('id', 1).single()
      .then(({ data }) => {
        if (data) setQrRevealed(data.qr_revealed)
      })

    const channel = sb
      .channel('qr-page-reveal')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ipl_tickets',
      }, (payload) => {
        if (payload.new.qr_revealed !== undefined) {
          setQrRevealed(payload.new.qr_revealed)
        }
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      {/* Header */}
      <div className="text-center pt-10 pb-8 px-4">
        <p className="text-[#D4A017] text-xs font-semibold uppercase tracking-widest mb-3">DBMS Lab · Concurrency Demo</p>
        <h1 className="text-4xl sm:text-5xl font-black mb-3">Scan to Join</h1>
        <p className="text-white/40 text-base">Share these QR codes with your students</p>

        {/* Reveal status badge */}
        {qrRevealed !== null && (
          <div className={`inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-sm font-semibold border ${
            qrRevealed
              ? 'bg-green-900/30 border-green-700 text-green-300'
              : 'bg-red-900/30 border-red-700 text-red-300'
          }`}>
            <span>{qrRevealed ? '🔓' : '🔒'}</span>
            <span>{qrRevealed ? 'QR Codes Revealed' : 'QR Codes Hidden — Admin can reveal'}</span>
          </div>
        )}
      </div>

      {/* QR Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {PAGES.map(({ title, subtitle, url, icon, accent, border, bg }) => (
          <div key={url}
            className={`rounded-2xl border-2 ${border} ${bg} p-8 flex flex-col items-center text-center`}>
            {/* Icon */}
            <div className="text-4xl mb-4">{icon}</div>
            <h2 className="text-lg font-black text-white mb-1">{title}</h2>
            <p className="text-white/40 text-xs mb-6">{subtitle}</p>

            {/* QR Code with blur overlay */}
            <div className="relative bg-white rounded-2xl p-4 mb-5 shadow-2xl">
              <QRCodeSVG
                value={url}
                size={180}
                bgColor="#ffffff"
                fgColor="#0A0E1A"
                level="M"
                includeMargin={false}
              />
              {/* Blur overlay when not revealed */}
              {!qrRevealed && (
                <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center"
                  style={{ backdropFilter: 'blur(12px)', background: 'rgba(10,14,26,0.55)' }}>
                  <span className="text-4xl mb-1">🔒</span>
                  <p className="text-white text-xs font-bold text-center px-2">Hidden by Admin</p>
                </div>
              )}
            </div>

            {/* URL */}
            <p className="font-mono text-xs break-all leading-relaxed"
              style={{ color: accent }}>
              {url}
            </p>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="text-center pb-10 px-4">
        <p className="text-white/20 text-xs">
          After the demo → <span className="text-white/40">/explain</span> · After explain → <span className="text-white/40">/quiz</span>
        </p>
      </div>
    </div>
  )
}
