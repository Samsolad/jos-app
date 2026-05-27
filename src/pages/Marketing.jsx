import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import HowItWorksGuide from '../components/HowItWorksGuide'

export default function Marketing() {
  return (
    <div className="min-h-screen bg-[#080808] text-white relative">
      <HowItWorksGuide />
      <header className="flex items-center justify-between px-6 sm:px-12 py-6 border-b border-[#1f1f1f]">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">J·OS</h1>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] mt-0.5">Personal Operating System</p>
        </div>
        <div className="flex gap-2">
          <Link to="/login" className="px-4 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#888] border border-[#2a2a2a] rounded hover:text-white transition-colors">Sign In</Link>
          <Link to="/register"><Button size="sm">Register</Button></Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 sm:px-12 py-16 sm:py-24">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-4">For founders and operators</p>
        <h2 className="font-serif text-[32px] sm:text-[42px] font-bold leading-tight mb-6">
          The operating system for people who run <em className="text-[#e8e8e8]">complex lives</em>.
        </h2>
        <p className="text-[15px] text-[#888] font-light leading-relaxed mb-10 max-w-xl">
          J·OS decides what matters today, adapts when reality changes, and speaks with the right mentor voice when you need a push.
        </p>
        <Link to="/register"><Button size="full">Create your OS</Button></Link>
      </main>
    </div>
  )
}
