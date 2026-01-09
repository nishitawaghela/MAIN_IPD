"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

interface Question {
  id: string
  question_text: string
  concepts: string[]
  options: {
    text: string
    is_correct: boolean
  }[]
  is_multi_correct: boolean
}

export function GatewayAssessment({
  pdfId,
  onComplete,
}: {
  pdfId: string
  onComplete: () => void
}) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/assessments?pdf_id=${pdfId}&type=gateway`)
        const data = await response.json()
        setQuestions(data.questions || [])
      } catch (err) {
        setError("Failed to load questions")
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [pdfId])

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / Math.max(questions.length, 1)) * 100

  const handleAnswerChange = (value: string) => {
    setAnswers({
      ...answers,
      [currentQuestion?.id]: value,
    })
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
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
      // For demo, mark answers as correct if they exist
      const submittedAnswers = questions.map((q) => ({
        question_id: q.id,
        user_answer: answers[q.id] || "",
        is_correct: !!answers[q.id],
      }))

      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_id: pdfId,
          assessment_type: "gateway",
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

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-8">
          <p className="text-muted-foreground">Loading assessment...</p>
        </CardContent>
      </Card>
    )
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8">
          <p className="text-muted-foreground">No questions available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gateway Assessment</CardTitle>
        <CardDescription>
          Question {currentQuestionIndex + 1} of {questions.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={progress} />

        <div>
          <h3 className="font-semibold mb-4 text-lg">{currentQuestion?.question_text}</h3>

          <RadioGroup
            value={answers[currentQuestion.id] || ""}
            onValueChange={handleAnswerChange}
          >
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2"
                >
                  <RadioGroupItem
                    value={option.text}
                    id={`${currentQuestion.id}-${idx}`}
                  />
                  <Label htmlFor={`${currentQuestion.id}-${idx}`}>
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-4 justify-between">
          <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Assessment"}
            </Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
