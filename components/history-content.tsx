"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import Link from "next/link"

interface PDF {
  id: string
  filename: string
  created_at: string
}

interface ProgressData {
  pdf_id: string
  gateway_passed: boolean
  conceptual_score: number | null
  analytical_score: number | null
  practical_score: number | null
  overall_score: number | null
}

export function HistoryContent({ pdfs, userId }: { pdfs: PDF[]; userId: string }) {
  const [progress, setProgress] = useState<Record<string, ProgressData>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProgress = async () => {
      const progressData: Record<string, ProgressData> = {}

      for (const pdf of pdfs) {
        try {
          const response = await fetch(`/api/evaluation-metrics?pdf_id=${pdf.id}`)
          const data = await response.json()
          if (data.progress) {
            progressData[pdf.id] = data.progress
          }
        } catch (error) {
          console.error(`Failed to fetch progress for ${pdf.id}`)
        }
      }

      setProgress(progressData)
      setLoading(false)
    }

    if (pdfs.length > 0) {
      fetchProgress()
    } else {
      setLoading(false)
    }
  }, [pdfs])

  const chartData = pdfs.map((pdf) => {
    const prog = progress[pdf.id]
    return {
      name: pdf.filename.substring(0, 15) + (pdf.filename.length > 15 ? "..." : ""),
      conceptual: prog?.conceptual_score || 0,
      analytical: prog?.analytical_score || 0,
      practical: prog?.practical_score || 0,
    }
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Learning History</h1>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      {/* Performance Chart */}
      {pdfs.length > 0 && chartData.some((d) => d.conceptual || d.analytical || d.practical) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Three-pillar scores across your PDFs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="conceptual" fill="#3b82f6" />
                <Bar dataKey="analytical" fill="#10b981" />
                <Bar dataKey="practical" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* PDF History */}
      <Card>
        <CardHeader>
          <CardTitle>All PDFs</CardTitle>
          <CardDescription>Your uploaded PDFs and progress</CardDescription>
        </CardHeader>
        <CardContent>
          {pdfs.length === 0 ? (
            <p className="text-muted-foreground">No PDFs uploaded yet</p>
          ) : (
            <div className="space-y-4">
              {pdfs.map((pdf) => {
                const prog = progress[pdf.id]
                return (
                  <div key={pdf.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{pdf.filename}</h3>
                        <p className="text-sm text-muted-foreground">
                          Uploaded {new Date(pdf.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Link href={`/learn/${pdf.id}`}>
                        <Button variant="outline" size="sm">
                          Resume
                        </Button>
                      </Link>
                    </div>

                    {prog && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Gateway</p>
                          <Badge variant={prog.gateway_passed ? "default" : "outline"}>
                            {prog.gateway_passed ? "Passed" : "Not Started"}
                          </Badge>
                        </div>
                        {prog.conceptual_score && (
                          <div>
                            <p className="text-muted-foreground">Conceptual</p>
                            <p className="font-semibold">{prog.conceptual_score.toFixed(1)}%</p>
                          </div>
                        )}
                        {prog.analytical_score && (
                          <div>
                            <p className="text-muted-foreground">Analytical</p>
                            <p className="font-semibold">{prog.analytical_score.toFixed(1)}%</p>
                          </div>
                        )}
                        {prog.practical_score && (
                          <div>
                            <p className="text-muted-foreground">Practical</p>
                            <p className="font-semibold">{prog.practical_score.toFixed(1)}%</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
