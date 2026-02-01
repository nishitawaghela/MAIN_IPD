import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query
    const { searchParams } = new URL(request.url)
    const pdf_id = searchParams.get("pdf_id")

    if (!pdf_id) {
      return NextResponse.json({ error: "pdf_id required" }, { status: 400 })
    }

    // Fetch knowledge graph
    const { data: kg, error: kgError } = await supabase
      .from("knowledge_graphs")
      .select("id")
      .eq("pdf_id", pdf_id)
      .single()

    if (kgError || !kg) {
      return NextResponse.json(
        { error: "Knowledge graph not found" },
        { status: 404 }
      )
    }

    // Fetch latest gateway assessment
    const { data: gatewayAssessment } = await supabase
      .from("assessments")
      .select("*")
      .eq("user_id", user.id)
      .eq("pdf_id", pdf_id)
      .eq("assessment_type", "gateway")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Fetch questions
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .eq("knowledge_graph_id", kg.id)
      .order("created_at", { ascending: true })
      .limit(5)

    if (questionsError) {
      return NextResponse.json(
        { error: "Failed to fetch questions" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      assessment: gatewayAssessment ?? null,
      questions: questions ?? [],
    })
  } catch (error) {
    console.error("Assessment GET error:", error)
    return NextResponse.json(
      { error: "Failed to retrieve assessment" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse body
    const { pdf_id, assessment_type, answers } = await request.json()

    if (!pdf_id || !assessment_type || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }

    // Create assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .insert({
        user_id: user.id,
        pdf_id,
        assessment_type,
        status: "in_progress",
        total_questions: answers.length,
      })
      .select()
      .single()

    if (assessmentError || !assessment) {
      return NextResponse.json(
        { error: "Failed to create assessment" },
        { status: 500 }
      )
    }

    // Store answers
    const answerRows = answers.map(
      (a: {
        question_id: string
        user_answer: any
        is_correct: boolean
      }) => ({
        assessment_id: assessment.id,
        question_id: a.question_id,
        user_answer: a.user_answer,
        is_correct: a.is_correct,
      })
    )

    const { error: answersError } = await supabase
      .from("assessment_answers")
      .insert(answerRows)

    if (answersError) {
      return NextResponse.json(
        { error: "Failed to store answers" },
        { status: 500 }
      )
    }

    // Calculate score
    const correctCount = answers.filter(
      (a: { is_correct: boolean }) => a.is_correct
    ).length

    const score = Math.round(
      (correctCount / Math.max(answers.length, 1)) * 100
    )

    // Update assessment
    const { error: updateError } = await supabase
      .from("assessments")
      .update({
        status: "completed",
        score,
        correct_answers: correctCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", assessment.id)

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update assessment" },
        { status: 500 }
      )
    }

    // Update learning progress
    if (assessment_type === "gateway" && score >= 70) {
      await supabase
        .from("learning_progress")
        .update({ gateway_passed: true })
        .eq("user_id", user.id)
        .eq("pdf_id", pdf_id)
    }

    return NextResponse.json({
      success: true,
      assessment_id: assessment.id,
      score,
      correct: correctCount,
      total: answers.length,
    })
  } catch (error) {
    console.error("Assessment POST error:", error)
    return NextResponse.json(
      { error: "Failed to submit assessment" },
      { status: 500 }
    )
  }
}