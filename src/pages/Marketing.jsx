import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import HowItWorksGuide from '../components/HowItWorksGuide'

export default function Marketing() {
  return (
    <div className="min-h-screen bg-jos-bg text-jos-text relative">
      <HowItWorksGuide />
      <header className="flex items-center justify-between px-6 sm:px-12 py-6 border-b border-jos-border">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">J·OS</h1>
          <p className="text-[10px] tracking-[0.2em] uppercase text-jos-muted mt-0.5">Idea to market</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/login"
            className="px-4 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase text-jos-muted border border-jos-border rounded hover:text-jos-text transition-colors"
          >
            Sign In
          </Link>
          <Link to="/register"><Button size="sm">Register</Button></Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 sm:px-12 py-16 sm:py-24">
        <p className="text-[10px] tracking-[0.2em] uppercase text-jos-muted font-medium mb-4">For builders</p>
        <h2 className="font-serif text-[32px] sm:text-[42px] font-bold leading-tight mb-6">
          One idea. Clear steps. <em className="text-jos-muted">Always know what&apos;s next.</em>
        </h2>
        <p className="text-[15px] text-jos-muted font-light leading-relaxed mb-10 max-w-xl">
          Describe your product idea. Get a build plan and a go-to-market plan. When life changes, rearrange what&apos;s left.
        </p>
        <Link to="/register"><Button size="full">Start your plan</Button></Link>
      </main>
    </div>
  )
}
