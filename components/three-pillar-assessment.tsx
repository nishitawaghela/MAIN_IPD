"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface Question {
  id: string
  question_text: string
  question_type: string
  pillar: string
  difficulty_level: number
}

type Pillar = "conceptual" | "analytical" | "practical"

export function ThreePillarAssessment({
  pdfId,
  onComplete,
}: {
  pdfId: string
  onComplete: () => void
}) {
  const pillars: Pillar[] = ["conceptual", "analytical", "practical"]
  const [currentPillar, setCurrentPillar] = useState<Pillar>("conceptual")
  const [questions, setQuestions] = useState<Record<Pillar, Question[]>>({
    conceptual: [],
    analytical: [],
    practical: [],
  })
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/assessments?pdf_id=${pdfId}&type=three-pillar`)
        const data = await response.json()
        setQuestions(data.questions || { conceptual: [], analytical: [], practical: [] })
      } catch (err) {
        setError("Failed to load questions")
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [pdfId])

  const currentQuestions = questions[currentPillar]
  const currentQuestion = currentQuestions[currentQuestionIndex]
  const progress = (currentQuestionIndex + 1) / Math.max(currentQuestions.length, 1)

  const handleAnswerChange = (value: string) => {
    if (currentQuestion) {
      setAnswers({
        ...answers,
        [currentQuestion.id]: value,
      })
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      const nextPillarIndex = pillars.indexOf(currentPillar) + 1
      if (nextPillarIndex < pillars.length) {
        setCurrentPillar(pillars[nextPillarIndex])
        setCurrentQuestionIndex(0)
      }
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const allQuestions = [...questions.conceptual, ...questions.analytical, ...questions.practical]

      const submittedAnswers = allQuestions.map((q) => ({
        question_id: q.id,
        user_answer: answers[q.id] || "",
        is_correct: !!answers[q.id],
      }))

      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_id: pdfId,
          assessment_type: "three-pillar",
          answers: submittedAnswers,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Submission failed")
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setSubmitting(false)
    }
  }

  const isLastQuestion = currentQuestionIndex === currentQuestions.length - 1 && currentPillar === "practical"

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-8">
          <p className="text-muted-foreground">Loading assessment...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>Three-Pillar Assessment</CardTitle>
            <CardDescription>{currentQuestion?.question_text.substring(0, 50)}...</CardDescription>
          </div>
          <Badge variant="outline" className="text-base">
            {currentPillar.toUpperCase()}
          </Badge>
        </div>
        <Progress value={progress * 100} />
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-4 text-lg">{currentQuestion?.question_text}</h3>
          <p className="text-sm text-muted-foreground mb-4">Difficulty: {currentQuestion?.difficulty_level}/5</p>

          <RadioGroup value={answers[currentQuestion?.id] || ""} onValueChange={handleAnswerChange}>
            <div className="space-y-3">
              {["Option A", "Option B", "Option C", "Option D"].map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={option} />
                  <Label htmlFor={option}>{option}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-4 justify-between">
          <Button variant="outline" onClick={handlePrevious}>
            Previous
          </Button>

          {isLastQuestion ? (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Complete Assessment"}
            </Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
