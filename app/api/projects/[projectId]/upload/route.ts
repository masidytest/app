// File upload API — stores files in Vercel Blob and returns URLs
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { blob } from "@/lib/vercelServices"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const uploaded: { name: string; url: string; type: string; size: number }[] = []

    for (const file of files) {
      const pathname = `uploads/${projectId}/${Date.now()}-${file.name}`

      // Check if Vercel Blob is configured
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const result = await blob.put(pathname, file, { access: "public" })
        uploaded.push({
          name: file.name,
          url: result.url,
          type: file.type,
          size: file.size,
        })
      } else {
        // Fallback: read file content as text/base64 for inline use
        const isText = file.type.startsWith("text/") ||
          file.name.endsWith(".json") || file.name.endsWith(".csv") ||
          file.name.endsWith(".md") || file.name.endsWith(".txt")

        if (isText) {
          const text = await file.text()
          uploaded.push({
            name: file.name,
            url: `data:${file.type};text,${encodeURIComponent(text.slice(0, 50000))}`,
            type: file.type,
            size: file.size,
          })
        } else {
          const buffer = await file.arrayBuffer()
          const base64 = Buffer.from(buffer).toString("base64")
          uploaded.push({
            name: file.name,
            url: `data:${file.type};base64,${base64.slice(0, 200000)}`,
            type: file.type,
            size: file.size,
          })
        }
      }
    }

    return NextResponse.json({ files: uploaded })
  } catch (error) {
    return NextResponse.json(
      { error: "Upload failed", details: String(error) },
      { status: 500 }
    )
  }
}
