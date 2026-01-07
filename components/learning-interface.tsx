"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GatewayAssessment } from "./gateway-assessment"
import { ThreePillarAssessment } from "./three-pillar-assessment"
import { useRouter } from "next/navigation"

interface Progress {
  gateway_passed: boolean
  conceptual_score: number | null
  analytical_score: number | null
  practical_score: number | null
  overall_score: number | null
}

type AssessmentStage = "menu" | "gateway" | "three-pillar" | "complete"

export function LearningInterface({
  pdfId,
  pdfName,
  progress,
}: {
  pdfId: string
  pdfName: string
  progress: Progress
}) {
  const [stage, setStage] = useState<AssessmentStage>("menu")
  const router = useRouter()

  useEffect(() => {
    if (progress?.gateway_passed) {
      setStage("menu")
    }
  }, [progress])

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{pdfName}</h1>
            <p className="text-muted-foreground">Adaptive Learning Module</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        {progress && (
          <div className="flex gap-2 flex-wrap">
            {progress.gateway_passed && <Badge variant="default">Gateway Passed</Badge>}
            {progress.overall_score && <Badge variant="secondary">Overall: {progress.overall_score.toFixed(1)}%</Badge>}
          </div>
        )}
      </div>

      {stage === "menu" && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Path</CardTitle>
            <CardDescription>
              {progress?.gateway_passed
                ? "You have passed the gateway assessment. Continue with the three-pillar assessment to deepen your learning."
                : "Start with the gateway assessment to ensure foundational understanding."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!progress?.gateway_passed ? (
              <div>
                <h3 className="font-semibold mb-2">1. Gateway Assessment</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  5 foundational questions to verify core understanding. Pass with 70%+ to continue.
                </p>
                <Button onClick={() => setStage("gateway")} className="w-full">
                  Start Gateway Assessment
                </Button>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold mb-2">2. Three-Pillar Assessment</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Master three dimensions: Conceptual (core concepts), Analytical (deeper reasoning), Practical
                  (real-world application).
                </p>
                <Button onClick={() => setStage("three-pillar")} className="w-full">
                  Start Three-Pillar Assessment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {stage === "gateway" && (
        <GatewayAssessment
          pdfId={pdfId}
          onComplete={() => {
            router.refresh()
            setStage("menu")
          }}
        />
      )}

      {stage === "three-pillar" && (
        <ThreePillarAssessment
          pdfId={pdfId}
          onComplete={() => {
            router.refresh()
            setStage("menu")
          }}
        />
      )}
    </div>
  )
}
