import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pdf_id = searchParams.get("pdf_id")

    if (!pdf_id) {
      return NextResponse.json({ error: "pdf_id required" }, { status: 400 })
    }

    // Get gateway assessment
    const { data: gatewayAssessment } = await supabase
      .from("assessments")
      .select("*")
      .eq("user_id", user.id)
      .eq("pdf_id", pdf_id)
      .eq("assessment_type", "gateway")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Get 5 gateway questions
    const { data: questions } = await supabase
      .from("questions")
      .select("*")
      .eq("question_type", "gateway")
      .eq("knowledge_graph_id", `(SELECT id FROM knowledge_graphs WHERE pdf_id = ${pdf_id})`)
      .limit(5)

    return NextResponse.json({
      assessment: gatewayAssessment,
      questions: questions || [],
    })
  } catch (error) {
    console.error("Assessment retrieval error:", error)
    return NextResponse.json({ error: "Failed to retrieve assessment" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { pdf_id, assessment_type, answers } = await request.json()

    // Create assessment record
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

    if (assessmentError) {
      return NextResponse.json({ error: assessmentError.message }, { status: 500 })
    }

    // Store answers
    const answerRecords = answers.map((a: { question_id: string; user_answer: string; is_correct: boolean }) => ({
      assessment_id: assessment.id,
      question_id: a.question_id,
      user_answer: a.user_answer,
      is_correct: a.is_correct,
    }))

    const { error: answersError } = await supabase.from("assessment_answers").insert(answerRecords)

    if (answersError) {
      return NextResponse.json({ error: answersError.message }, { status: 500 })
    }

    // Calculate score
    const correctCount = answers.filter((a: { is_correct: boolean }) => a.is_correct).length
    const score = (correctCount / answers.length) * 100

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
      return NextResponse.json({ error: updateError.message }, { status: 500 })
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
    console.error("Assessment creation error:", error)
    return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 })
  }
}
