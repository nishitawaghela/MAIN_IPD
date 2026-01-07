"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [])

  return (
    <main className="min-h-svh bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">AdaptiveLearn</h1>
          <div className="flex gap-4">
            {!loading && !user ? (
              <>
                <Link href="/auth/login">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button>Sign Up</Button>
                </Link>
              </>
            ) : (
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">Learn Smarter, Not Harder</h2>
          <p className="text-xl text-slate-300 mb-8">
            Upload any PDF and get AI-powered adaptive assessments with knowledge graphs, multi-pillar evaluations, and
            personalized learning paths.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            {!loading && user ? (
              <Link href="/dashboard">
                <Button size="lg" className="px-8">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/sign-up">
                  <Button size="lg" className="px-8">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="px-8 bg-transparent">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-800/50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-white text-center mb-12">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-slate-700/30 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white">1. Upload PDF</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300">
                Upload any PDF document to create your adaptive learning module
              </CardContent>
            </Card>

            <Card className="bg-slate-700/30 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white">2. AI Analysis</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300">
                Our AI generates knowledge graphs and adaptive questions in seconds
              </CardContent>
            </Card>

            <Card className="bg-slate-700/30 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white">3. Master Concepts</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300">
                Pass the gateway test, then complete three-pillar assessments
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Detail */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <h3 className="text-3xl font-bold text-white text-center mb-12">Powerful Features</h3>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div>
            <h4 className="text-xl font-semibold text-white mb-3">Knowledge Graphs</h4>
            <p className="text-slate-300">
              AI-generated knowledge graphs visualize concept relationships and help you understand the big picture
            </p>
          </div>

          <div>
            <h4 className="text-xl font-semibold text-white mb-3">Adaptive Assessments</h4>
            <p className="text-slate-300">
              Multi-level assessments that adapt to your knowledge: gateway, conceptual, analytical, and practical
            </p>
          </div>

          <div>
            <h4 className="text-xl font-semibold text-white mb-3">Detailed Metrics</h4>
            <p className="text-slate-300">
              Track your progress across three pillars with comprehensive performance metrics and insights
            </p>
          </div>

          <div>
            <h4 className="text-xl font-semibold text-white mb-3">Learning History</h4>
            <p className="text-slate-300">
              Review past assessments, track improvements, and revisit challenging concepts at your own pace
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-800/50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-6">Ready to Transform Your Learning?</h3>
          {!loading && !user && (
            <Link href="/auth/sign-up">
              <Button size="lg" className="px-8">
                Start Learning Today
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900 py-8">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>&copy; 2026 AdaptiveLearn. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
