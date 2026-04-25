import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// SAFE route — delegates to a Postgres function that uses SELECT FOR UPDATE
export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data, error } = await getSupabase().rpc('book_ticket_safe', { p_user: name })

  if (error) {
    return NextResponse.json({ error: 'DB error', detail: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
