import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: pdfs } = await supabase
    .from("pdfs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: progress } = await supabase.from("learning_progress").select("*").eq("user_id", user.id)

  return (
    <main className="min-h-svh bg-background">
      <DashboardContent pdfs={pdfs || []} progress={progress || []} />
    </main>
  )
}
