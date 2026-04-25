import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST() {
  const { error } = await getSupabase()
    .from('ipl_quiz_results')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
