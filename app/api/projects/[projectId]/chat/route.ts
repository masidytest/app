// Real streaming AI chat powered by Claude
import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { checkUsageLimit, recordUsage } from "@/lib/usage"
import { z } from "zod"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are Masidy, an AI assistant that helps users build and modify web applications.

⚠️ RULE #1 — OBEY THE USER:
- You are a tool. Do EXACTLY what the user asks — nothing more, nothing less.
- If the user says "add a contact page", you add ONLY a contact page. Do NOT rebuild the whole project.
- If the user says "fix the navbar", you fix ONLY the navbar file. Do NOT touch other files.
- If the user says "build a new app from scratch", THEN you build everything from scratch.
- NEVER decide on your own to start over or recreate files the user didn't ask you to change.
- NEVER add features the user didn't request.

RESPONSE FORMAT — always use this:

One sentence describing what you are doing.

📋 Plan:
• Step 1: [specific thing you will do]
• Step 2: [specific thing you will do]

Then output each file using:

FILE: path/to/filename.ext
\`\`\`lang
...complete file content...
\`\`\`

PROJECT TYPES — you support TWO modes:

A) STATIC WEB APP (default — HTML/CSS/JS):
   Use this when the user asks for websites, landing pages, dashboards, or front-end apps.

B) FULLSTACK APP (Node.js or Python):
   Use this when the user asks for APIs, servers, backends, real-time apps, databases, or says "fullstack".
   The user can click "Run" to execute code in a real isolated sandbox (Linux VM).

FILE RULES FOR STATIC WEB APPS:

1. SEPARATE FILES — never put everything in one index.html.
   - HTML pages go in pages/ (e.g., pages/login.html, pages/dashboard.html)
   - JavaScript goes in js/ (js/app.js, js/api.js, js/auth.js, etc.)
   - CSS goes in css/ (css/styles.css)
   - index.html is ONLY the landing/home page

2. FOLDER STRUCTURE:
   index.html          ← landing page only
   pages/              ← all other HTML pages
   js/                 ← JavaScript modules
   css/                ← stylesheets

3. LINKING BETWEEN FILES:
   - From index.html to a page: href="pages/login.html"
   - From pages/ back to index: href="../index.html"
   - From pages/ to other pages: href="dashboard.html"
   - JS from pages/: <script src="../js/app.js"></script>
   - CSS from pages/: <link rel="stylesheet" href="../css/styles.css">

4. HTML FILES:
   - Include Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script>
   - Dark theme: bg-gray-950, text-gray-100, accent violet-500

5. JS MODULES:
   - js/app.js: shared utilities, navbar/footer injection
   - js/api.js: mock REST API with localStorage
   - js/db.js: localStorage/IndexedDB database layer
   - js/auth.js: authentication (login/logout/register/token)

FILE RULES FOR FULLSTACK APPS:

1. ALWAYS include a package.json with a "start" script.
2. Node.js example structure:
   package.json         ← dependencies + "start": "node server.js"
   server.js            ← Express/Fastify server on port 3000
   public/index.html    ← frontend served by the server
   public/css/styles.css
   public/js/app.js
   routes/              ← API route handlers
   lib/                 ← shared utilities

3. Python example structure:
   main.py or app.py    ← Flask/FastAPI server on port 3000
   requirements.txt     ← pip dependencies
   templates/           ← Jinja2 templates
   static/              ← CSS/JS/images

4. The server MUST listen on port 3000.
5. Use environment variables for secrets (process.env.XXX or os.environ).

GENERAL RULES:

6. WHEN MODIFYING AN EXISTING PROJECT:
   - Output ONLY files that are NEW or CHANGED
   - Existing unchanged files are preserved automatically by the system
   - Do NOT re-output files you did not modify
   - Keep the same design, theme, and style as the existing project
   - New pages must match the look and feel of existing pages

7. WHEN BUILDING A NEW PROJECT:
   - Output ALL files
   - Generate index.html FIRST (or package.json for fullstack), then CSS, then pages, then JS/routes

8. NEVER truncate files or use "..." placeholders — always output FULL file content`

const ALLOWED_MODELS = [
  "claude-sonnet-4-5-20250929",
  "claude-opus-4-6",
  "claude-haiku-4-5-20251001",
] as const

const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.string(),
})

const bodySchema = z.object({
  message: z.string().min(1),
  model: z.enum(ALLOWED_MODELS).optional().default("claude-sonnet-4-5-20250929"),
  attachments: z.array(attachmentSchema).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  // Auth check
  const session = await getSession()
  if (!session?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Usage limit check
  const usage = await checkUsageLimit(session.sub)
  if (!usage.allowed) {
    return new Response(
      JSON.stringify({
        error: "Usage limit reached",
        used: usage.used,
        limit: usage.limit,
        plan: usage.plan,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const body = await req.json()
    const { message, model, attachments } = bodySchema.parse(body)

    // Load conversation history (last 20 messages for context)
    const history = await prisma.projectMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      take: 20,
    })

    // Load existing project files so the AI knows what already exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { configJson: true },
    })
    type ConfigJson = { files?: Record<string, string>; htmlContent?: string }
    const config = project?.configJson as ConfigJson | null
    const existingFileList = Object.keys(config?.files ?? {})

    // Build system prompt — include existing file context if project already has files
    let systemPrompt = SYSTEM_PROMPT
    if (existingFileList.length > 0) {
      systemPrompt += `\n\n⚠️ THIS IS AN EXISTING PROJECT — DO NOT START OVER.

📂 Files that already exist (preserved automatically — do NOT recreate):
${existingFileList.map((f) => `- ${f}`).join("\n")}

RULES FOR THIS REQUEST:
- The user wants to ADD TO or MODIFY this existing project.
- Output ONLY the files the user asked you to create or change.
- Do NOT rebuild or re-output files that already exist unless the user specifically asked to change them.
- Match the existing design, theme, colors, and code style.
- If the user asks to "add missing pages", create ONLY the missing pages — not the whole project again.`
    }

    // Persist the user message immediately
    await prisma.projectMessage.create({
      data: { projectId, role: "user", content: message },
    })

    // Build the user message content — text + optional image attachments
    const userContent: Anthropic.ContentBlockParam[] = []

    // Add image attachments (for Claude vision)
    if (attachments?.length) {
      for (const att of attachments) {
        if (att.type.startsWith("image/") && att.url.startsWith("data:")) {
          const base64Match = att.url.match(/^data:([^;]+);base64,(.+)$/)
          if (base64Match) {
            userContent.push({
              type: "image",
              source: {
                type: "base64",
                media_type: base64Match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64Match[2],
              },
            })
          }
        } else if (att.type.startsWith("text/") || att.url.startsWith("data:")) {
          // Text file — include content inline
          const textMatch = att.url.match(/^data:[^;]+;text,(.+)$/)
          if (textMatch) {
            userContent.push({
              type: "text",
              text: `[Attached file: ${att.name}]\n${decodeURIComponent(textMatch[1])}`,
            })
          }
        }
      }
    }

    userContent.push({ type: "text", text: message })

    const anthropicMessages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: userContent },
    ]

    let fullResponse = ""

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = anthropic.messages.stream({
            model,
            max_tokens: model === "claude-haiku-4-5-20251001" ? 16384 : 32768,
            system: systemPrompt,
            messages: anthropicMessages,
          })

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text
              fullResponse += text
              controller.enqueue(new TextEncoder().encode(text))
            }
          }

          // Save assistant message to DB
          await prisma.projectMessage.create({
            data: { projectId, role: "assistant", content: fullResponse },
          })

          // Record usage event
          await recordUsage(session.sub)

          // Signal client that stream + save is complete
          controller.enqueue(new TextEncoder().encode("\n[NOVA_READY]"))
        } catch (err) {
          controller.enqueue(
            new TextEncoder().encode(`\n[Error: ${String(err)}]`)
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid payload", details: error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }
    return new Response(
      JSON.stringify({ error: "Failed to process chat", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
