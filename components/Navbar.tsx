'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/',            label: '🏏 Book',        short: 'Book'        },
  { href: '/explain',     label: '📖 Explain',     short: 'Explain'     },
  { href: '/quiz',        label: '🧠 Quiz',         short: 'Quiz'        },
  { href: '/leaderboard', label: '🏆 Leaderboard', short: 'Ranks'       },
  { href: '/qr',          label: '📱 QR Codes',    short: 'QR'          },
  { href: '/admin',       label: '🔒 Admin',        short: 'Admin'       },
]

export default function Navbar() {
  const path = usePathname()

  return (
    <nav className="sticky top-0 z-50 bg-[#0A0E1A]/95 backdrop-blur-md border-b border-white/8"
      style={{ borderBottomColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center px-3 gap-1 overflow-x-auto scrollbar-hide"
        style={{ height: 48 }}>
        {/* Brand */}
        <Link href="/"
          className="flex-shrink-0 flex items-center gap-1.5 mr-3 pr-3 border-r border-white/10">
          <span className="text-lg">🏏</span>
          <span className="text-[#D4A017] font-black text-sm hidden sm:block tracking-tight">IPL Demo</span>
        </Link>

        {/* Nav links */}
        {LINKS.map(({ href, label, short }) => {
          const active = path === href
          return (
            <Link key={href} href={href}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                active
                  ? 'bg-[#0047AB] text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/8'
              }`}
>
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
