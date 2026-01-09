import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("PROCESS PDF ROUTE HIT")
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

    // 4. Status → extracting_text
    await supabase
      .from("pdfs")
      .update({
        processing_status: "extracting_text",
        processing_error: null,
      })
      .eq("id", pdf_id)

    // 5. Call TEXT PARSER service
    const parserResponse = await fetch("http://127.0.0.1:8000/parse-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // pdf_path: pdf.file_path,        REMOVE THIS WHEN I HAVE A FILE SYSTEM
        pdf_path:"C:\\Users\\asus\\Downloads\\chapter_plants_mock.pdf"
      }),
    })

    if (!parserResponse.ok) {
      await supabase
        .from("pdfs")
        .update({
          processing_status: "text_failed",
          processing_error: "Text extraction service failed",
        })
        .eq("id", pdf_id)

      return NextResponse.json(
        { error: "Text extraction service failed" },
        { status: 500 }
      )
    }

    const parserResult = await parserResponse.json()
    console.log("TEXT PARSER RESULT:", parserResult)

    if (parserResult.status !== "success") {
      await supabase
        .from("pdfs")
        .update({
          processing_status: "rejected",
          processing_error: parserResult.reason || "Text extraction failed",
        })
        .eq("id", pdf_id)

      return NextResponse.json(
        {
          error: "Document verification failed",
          reason: parserResult.reason,
        },
        { status: 400 }
      )
    }

    const extractedText: string = parserResult.text
    const extractionConfidence: number = parserResult.confidence ?? 0
    const textLength = extractedText.length
    
    // ✅ STORE extraction metadata
    await supabase
      .from("pdfs")
      .update({
        extraction_confidence: extractionConfidence,
        text_length: textLength,
      })
      .eq("id", pdf_id)

    // -----------------------------
    // 6. Status → building_kg
    // -----------------------------
    await supabase
      .from("pdfs")
      .update({
        processing_status: "building_kg",
      })
      .eq("id", pdf_id)

    // -----------------------------
    // 7. Call KG service
    // -----------------------------
    const kgResponse = await fetch("http://127.0.0.1:8000/build-kg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: extractedText,
        pdf_id,
      }),
    })

    if (!kgResponse.ok) {
      await supabase
        .from("pdfs")
        .update({
          processing_status: "kg_failed",
          processing_error: "Knowledge graph service failed",
        })
        .eq("id", pdf_id)

      return NextResponse.json(
        { error: "Knowledge graph service failed" },
        { status: 500 }
      )
    }

    const kgResult = await kgResponse.json()

    console.log("RAW KG RESPONSE:", JSON.stringify(kgResult, null, 2))

    // ✅ Handle KG service failure explicitly
    if (kgResult.status !== "success") {
      await supabase
        .from("pdfs")
        .update({
          processing_status: "kg_failed",
          processing_error: kgResult.error || "KG service failed",
        })
        .eq("id", pdf_id)

      return NextResponse.json(
        { error: "Knowledge graph generation failed" },
        { status: 500 }
      )
    }

    const { kg, evaluation } = kgResult

    // ✅ Validate KG structure AFTER success
    if (!kg || !Array.isArray(kg.nodes) || !Array.isArray(kg.edges)) {
      await supabase
        .from("pdfs")
        .update({
          processing_status: "kg_failed",
          processing_error: "Invalid knowledge graph output",
        })
        .eq("id", pdf_id)

      return NextResponse.json(
        { error: "Invalid knowledge graph output" },
        { status: 500 }
      )
    }

    // -----------------------------
    // 8. Store Knowledge Graph
    // -----------------------------
    const { data: kgData, error: kgError } = await supabase
      .from("knowledge_graphs")
      .insert({
        pdf_id,
        node_count: kg.nodes.length,
        edge_count: kg.edges.length,
        summary: evaluation?.summary || "Knowledge graph generated",
        // extraction_confidence: extractionConfidence,
      })
      .select()
      .single()

    if (kgError) {
      await supabase
        .from("pdfs")
        .update({
          processing_status: "kg_failed",
          processing_error: "Failed to store knowledge graph",
        })
        .eq("id", pdf_id)

      return NextResponse.json(
        { error: "Failed to store knowledge graph" },
        { status: 500 }
      )
    }

    // -----------------------------
    // 9. Initialize learning progress
    // -----------------------------
    await supabase.from("learning_progress").insert({
      user_id: user.id,
      pdf_id,
      gateway_passed: false,
    })

    // -----------------------------
    // 10. Status → ready
    // -----------------------------
    await supabase
      .from("pdfs")
      .update({
        processing_status: "ready",
        processing_error: null,
      })
      .eq("id", pdf_id)

    // -----------------------------
    // 11. Respond success
    // -----------------------------
    return NextResponse.json({
      success: true,
      pdf_id,
      kg_id: kgData.id,
      nodes_count: kg.nodes.length,
      edges_count: kg.edges.length,
      extraction_confidence: extractionConfidence,
    })
  } catch (error) {
    console.error("Process PDF error:", error)
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    )
  }
}
