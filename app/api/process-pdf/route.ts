import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import os from "os"
import path from "path"
// from dotenv import load_dotenv 
// load_dotenv()
export async function POST(request: NextRequest) {
  console.log("PROCESS PDF ROUTE HIT")

  let tempPath: string | null = null

  try {
    const supabase = await createClient()

    // 1. Parse request
    const { pdf_id } = await request.json()

    if (!pdf_id) {
      return NextResponse.json({ error: "pdf_id is required" }, { status: 400 })
    }

    // 2. Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 3. Verify PDF ownership
    const { data: pdf, error: pdfError } = await supabase
      .from("pdfs")
      .select("*")
      .eq("id", pdf_id)
      .eq("user_id", user.id)
      .single()

    if (pdfError || !pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }

    // 4. Create signed URL
    const { data: signed, error: signedError } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(pdf.file_path, 60)

    if (signedError || !signed?.signedUrl) {
      throw new Error("Failed to create signed PDF URL")
    }

    const pdfUrl = signed.signedUrl

    // 5. Download PDF to /tmp
    const pdfResponse = await fetch(pdfUrl)

    if (!pdfResponse.ok) {
      throw new Error("Failed to download PDF from storage")
    }

    const buffer = Buffer.from(await pdfResponse.arrayBuffer())
    const tempDir = os.tmpdir()
    tempPath = path.join(tempDir, `${pdf_id}.pdf`)

    await fs.promises.writeFile(tempPath, buffer)

    // 6. Status → extracting_text
    await supabase
      .from("pdfs")
      .update({
        processing_status: "extracting_text",
        processing_error: null,
      })
      .eq("id", pdf_id)

    // 7. Call TEXT PARSER service
    const parserResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/parse-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pdf_path: tempPath,
      }),
    })

    if (!parserResponse.ok) {
      throw new Error("Text extraction service failed")
    }

    const parserResult = await parserResponse.json()

    if (parserResult.status !== "success") {
      await supabase
        .from("pdfs")
        .update({
          processing_status: "rejected",
          processing_error: parserResult.reason || "Text extraction failed",
        })
        .eq("id", pdf_id)

      return NextResponse.json(
        { error: "Document verification failed" },
        { status: 400 }
      )
    }

    const extractedText: string = parserResult.text
    const extractionConfidence: number = parserResult.confidence ?? 0

    await supabase
      .from("pdfs")
      .update({
        extraction_confidence: extractionConfidence,
        text_length: extractedText.length,
      })
      .eq("id", pdf_id)

    // 8. Status → building_kg
    await supabase
      .from("pdfs")
      .update({ processing_status: "building_kg" })
      .eq("id", pdf_id)

    // 9. Call KG service
    const kgResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/build-kg`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: extractedText,
        pdf_id,
      }),
    })

    if (!kgResponse.ok) {
      throw new Error("Knowledge graph service failed")
    }

    const kgResult = await kgResponse.json()

    if (kgResult.status !== "success") {
      throw new Error("Knowledge graph generation failed")
    }

    const { kg, evaluation } = kgResult

    // 10. Store Knowledge Graph
    const { data: kgData, error: kgError } = await supabase
      .from("knowledge_graphs")
      .insert({
        pdf_id,
        node_count: kg.nodes.length,
        edge_count: kg.edges.length,
        summary: evaluation?.summary || "Knowledge graph generated",
      })
      .select()
      .single()

    if (kgError) {
      throw new Error("Failed to store knowledge graph")
    }

    // 11. Generate Questions
    const questionResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/generate-questions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knowledge_graph: kg,
          knowledge_graph_id: kgData.id,
          difficulty_level: 1,
        }),
      }
    )

    if (!questionResponse.ok) {
      throw new Error("Question generation failed")
    }

    const { questions } = await questionResponse.json()

    // 12. Store Questions (SAFE)
    const formattedQuestions = questions.map((q: any) => ({
      knowledge_graph_id: kgData.id,

      question_text: q.question ?? "",
      question_type: q.question_type ?? "mcq",
      pillar: q.pillar ?? "Recall",
      difficulty_level: Number.isInteger(q.difficulty) ? q.difficulty : 1,

      concepts: Array.isArray(q.concepts) ? q.concepts : [],
      options: Array.isArray(q.options) ? q.options : [],
      correct_answer: Array.isArray(q.correct_answer)
        ? q.correct_answer
        : [],

      is_multi_correct: Boolean(q.is_multi_correct),
      generation_source: q.generation_source ?? "kg",
    }))

    const { error: questionInsertError } = await supabase
      .from("questions")
      .insert(formattedQuestions)

    if (questionInsertError) {
      console.error("QUESTION INSERT ERROR:", questionInsertError)
      console.error("FORMATTED QUESTIONS:", formattedQuestions)
      throw questionInsertError
    }

    // 13. Initialize learning progress
    await supabase.from("learning_progress").insert({
      user_id: user.id,
      pdf_id,
      gateway_passed: false,
    })

    // 14. Status → ready
    await supabase
      .from("pdfs")
      .update({
        processing_status: "ready",
        processing_error: null,
      })
      .eq("id", pdf_id)

    return NextResponse.json({
      success: true,
      pdf_id,
      kg_id: kgData.id,
    })
  } catch (error) {
    console.error("Process PDF error:", error)

    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    )
  } finally {
    // Cleanup temp file 
    if (tempPath) {
      try {
        await fs.promises.unlink(tempPath)
      } catch {}
    }
  }
}
