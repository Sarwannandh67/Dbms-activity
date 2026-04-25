import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { name, score, time_taken } = await req.json()
  if (!name || score === undefined || time_taken === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const { error } = await getSupabase()
    .from('ipl_quiz_results')
    .insert({ user_name: name, score, time_taken })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
