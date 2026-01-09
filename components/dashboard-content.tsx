"use client"

import { useState } from "react"
import Link from "next/link"
import { Trash2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PDFUploadForm } from "./pdf-upload-form"

interface PDF {
  id: string
  filename: string
  created_at: string
  file_size: number
}

interface Progress {
  pdf_id: string
  gateway_passed: boolean
  overall_score: number | null
  last_assessment_date: string | null
}

export function DashboardContent({
  pdfs,
  progress,
}: {
  pdfs: PDF[]
  progress: Progress[]
}) {
  const [showUpload, setShowUpload] = useState(false)
  const [pdfList, setPdfList] = useState(pdfs)

  const handlePdfUploaded = (newPdf: PDF) => {
    setPdfList((prev) => [newPdf, ...prev])
    setShowUpload(false)
  }

  const getProgressForPdf = (pdfId: string) => {
    return progress.find((p) => p.pdf_id === pdfId)
  }

  const handleDeletePdf = async (pdfId: string, filePath: string) => {
  const confirmed = confirm("Are you sure you want to delete this PDF?")
  if (!confirmed) return

  const supabase = createClient()

  const { error: storageError } = await supabase.storage
    .from("pdfs")
    .remove([filePath])

  if (storageError) {
    alert("Storage delete failed: " + storageError.message)
    return
  }

  const { error: dbError } = await supabase
    .from("pdfs")
    .delete()
    .eq("id", pdfId)

  if (dbError) {
    alert("Database cleanup failed")
    return
  }

  setPdfList((prev) => prev.filter((p) => p.id !== pdfId))
}

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Learning Dashboard</h1>
        <p className="text-muted-foreground">
          Upload PDFs and take adaptive assessments to enhance your learning
        </p>
      </div>

      {!showUpload ? (
        <div className="mb-8">
          <Button onClick={() => setShowUpload(true)} size="lg">
            Upload New PDF
          </Button>
        </div>
      ) : (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
          </CardHeader>
          <CardContent>
            <PDFUploadForm onSuccess={handlePdfUploaded} />
          </CardContent>
        </Card>
      )}

      {pdfList.length === 0 ? (
        <Card>
          <CardContent className="pt-8 text-center">
            <p className="text-muted-foreground mb-4">
              No PDFs uploaded yet. Upload a PDF to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pdfList.map((pdf) => {
            const prog = getProgressForPdf(pdf.id)

            return (
              <Card key={pdf.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{pdf.filename}</CardTitle>
                  <CardDescription>
                    Uploaded {new Date(pdf.created_at).toISOString().split("T")[0]}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Status
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {prog?.gateway_passed ? (
                          <Badge variant="default">Gateway Passed</Badge>
                        ) : (
                          <Badge variant="outline">Not Started</Badge>
                        )}
                        {prog?.overall_score && (
                          <Badge variant="secondary">
                            Score: {prog.overall_score.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeletePdf(pdf.id, pdf.filename)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Link href={`/learn/${pdf.id}`}>
                    <Button className="w-full">Start Learning</Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}