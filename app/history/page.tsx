import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { HistoryContent } from "@/components/history-content"

export default async function HistoryPage() {
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

  return (
    <main className="min-h-svh bg-background">
      <HistoryContent pdfs={pdfs || []} userId={user.id} />
    </main>
  )
}
