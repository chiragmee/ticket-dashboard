'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const EMOJI: Record<string, string> = { '1': '😞', '2': '😕', '3': '😐', '4': '😊', '5': '😄' }
const MESSAGE: Record<string, string> = {
  '1': "We're sorry to hear that. We'll work hard to do better.",
  '2': "Thanks for the feedback. We'll use this to improve.",
  '3': "Thanks for letting us know. We're always looking to improve.",
  '4': "Great to hear! We'll keep it up.",
  '5': "Awesome! We're so glad we could help.",
}

function ThankYouContent() {
  const params = useSearchParams()
  const score = params.get('score') ?? '3'

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-[#E5E9F2] shadow-sm p-10 w-full max-w-sm text-center">
        <div className="w-10 h-10 bg-[#3B6EF0] rounded-xl flex items-center justify-center mb-6 mx-auto">
          <span className="text-white font-bold text-sm">TV</span>
        </div>
        <div className="text-5xl mb-4">{EMOJI[score] ?? '😊'}</div>
        <h1 className="text-xl font-bold text-[#1E2A3B] mb-2">Thank you for your feedback!</h1>
        <p className="text-sm text-[#6B7A99]">{MESSAGE[score] ?? MESSAGE['3']}</p>
      </div>
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  )
}
