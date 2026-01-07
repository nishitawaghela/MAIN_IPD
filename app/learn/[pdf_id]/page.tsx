import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LearningInterface } from "@/components/learning-interface"

export default async function LearnPage({
  params,
}: {
  params: Promise<{ pdf_id: string }>
}) {
  const { pdf_id } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify PDF belongs to user
  const { data: pdf } = await supabase.from("pdfs").select("*").eq("id", pdf_id).eq("user_id", user.id).single()

  if (!pdf) {
    redirect("/dashboard")
  }

  // Get learning progress
  const { data: progress } = await supabase
    .from("learning_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("pdf_id", pdf_id)
    .single()

  return (
    <main className="min-h-svh bg-background">
      <LearningInterface pdfId={pdf_id} pdfName={pdf.filename} progress={progress} />
    </main>
  )
}
