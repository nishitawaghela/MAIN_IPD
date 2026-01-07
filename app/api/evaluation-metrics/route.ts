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

    // Get all assessments for this PDF
    const { data: assessments } = await supabase
      .from("assessments")
      .select("*")
      .eq("user_id", user.id)
      .eq("pdf_id", pdf_id)
      .eq("status", "completed")

    // Get learning progress
    const { data: progress } = await supabase
      .from("learning_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("pdf_id", pdf_id)
      .single()

    // Calculate metrics
    const metrics: Record<string, Record<string, number | boolean>> = {
      gateway: {
        completed: false,
        score: 0,
        passed: false,
        attempts: 0,
      },
      conceptual: {
        score: 0,
        attempts: 0,
      },
      analytical: {
        score: 0,
        attempts: 0,
      },
      practical: {
        score: 0,
        attempts: 0,
      },
    }

    if (assessments) {
      assessments.forEach((a) => {
        const type = a.assessment_type
        if (type in metrics) {
          if (metrics[type].score !== undefined && typeof metrics[type].score === "number") {
            ;(metrics[type] as Record<string, number>).score = a.score || 0
          }
          if (metrics[type].attempts !== undefined && typeof metrics[type].attempts === "number") {
            ;(metrics[type] as Record<string, number>).attempts =
              ((metrics[type] as Record<string, number>).attempts || 0) + 1
          }
          if (type === "gateway") {
            ;(metrics[type] as Record<string, boolean>).completed = true
            ;(metrics[type] as Record<string, boolean>).passed = (a.score || 0) >= 70
          }
        }
      })
    }

    return NextResponse.json({
      metrics,
      progress,
      summary: {
        gateway_passed: progress?.gateway_passed || false,
        overall_score:
          progress?.overall_score ||
          (assessments && assessments.length > 0
            ? assessments.reduce((sum, a) => sum + (a.score || 0), 0) / assessments.length
            : 0),
      },
    })
  } catch (error) {
    console.error("Metrics retrieval error:", error)
    return NextResponse.json({ error: "Failed to retrieve metrics" }, { status: 500 })
  }
}
