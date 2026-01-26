import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 })
    }

    // storage path (THIS is what delete will use)
    const filePath = `${user.id}/${Date.now()}-${file.name}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(filePath, file, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Save metadata AFTER upload succeeds
    const { data: pdfRow, error: dbError } = await supabase
      .from("pdfs")
      .insert({
        user_id: user.id,
        filename: file.name,
        file_path: filePath,
        file_size: file.size,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pdf_id: pdfRow.id,
      filename: pdfRow.filename,
      file_path: pdfRow.file_path,
    })
  } catch (err) {
    console.error("Upload error:", err)
    return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 })
  }
}
