import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles OAuth callback from Supabase (after Google consent)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const redirectTo = searchParams.get('next') || '/dashboard'

    if (!code) {
      // If no code, just go home
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Exchange the code for a session and set cookies via SSR helper
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
    }

    return NextResponse.redirect(new URL(redirectTo, request.url))
  } catch (err) {
    return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', request.url))
  }
}


