// Vercel Sandbox integration — run AI-generated code in isolated environments
import { Sandbox } from "@vercel/sandbox"

export type SandboxSession = {
  sandboxId: string
  url: string | null
  status: string
}

/**
 * Create a new sandbox, write project files, install deps, and start the dev server.
 */
export async function createProjectSandbox(
  files: Record<string, string>,
  options?: { runtime?: "node24" | "node22" | "python3.13"; port?: number }
): Promise<SandboxSession> {
  const runtime = options?.runtime ?? "node24"
  const port = options?.port ?? 3000

  const sandbox = await Sandbox.create({
    runtime,
    ports: [port],
    timeout: 5 * 60 * 1000, // 5 minutes
    resources: { vcpus: 2 },
  })

  // Write all project files to the sandbox
  const fileEntries = Object.entries(files).map(([path, data]) => ({
    path: `/vercel/sandbox/${path}`,
    data,
  }))

  if (fileEntries.length > 0) {
    await sandbox.writeFiles(fileEntries)
  }

  // Detect project type and start appropriately
  const hasPackageJson = "package.json" in files
  const hasPythonMain = "main.py" in files || "app.py" in files
  const hasIndexHtml = "index.html" in files

  if (hasPackageJson) {
    // Node.js project — install deps and start
    const install = await sandbox.runCommand({
      cmd: "npm",
      args: ["install"],
    })

    if (install.exitCode === 0) {
      // Try to start dev server
      await sandbox.runCommand({
        cmd: "npm",
        args: ["start"],
        detached: true,
      })
    }
  } else if (hasPythonMain) {
    // Python project
    const mainFile = "app.py" in files ? "app.py" : "main.py"
    await sandbox.runCommand({
      cmd: "python3",
      args: [mainFile],
      detached: true,
    })
  } else if (hasIndexHtml) {
    // Static HTML — serve with a simple HTTP server
    await sandbox.runCommand({
      cmd: "npx",
      args: ["serve", "-s", ".", "-l", String(port)],
      detached: true,
    })
  }

  return {
    sandboxId: sandbox.sandboxId,
    url: sandbox.domain(port),
    status: "running",
  }
}

/**
 * Execute a command in an existing sandbox.
 */
export async function runInSandbox(
  sandboxId: string,
  cmd: string,
  args: string[] = []
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const sandbox = await Sandbox.get(sandboxId)
  const result = await sandbox.runCommand({ cmd, args })

  return {
    exitCode: result.exitCode,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
  }
}

/**
 * Write files to an existing sandbox (for live updates).
 */
export async function writeToSandbox(
  sandboxId: string,
  files: Record<string, string>
): Promise<void> {
  const sandbox = await Sandbox.get(sandboxId)
  const entries = Object.entries(files).map(([path, data]) => ({
    path: `/vercel/sandbox/${path}`,
    data,
  }))
  await sandbox.writeFiles(entries)
}

/**
 * Stop a sandbox.
 */
export async function stopSandbox(sandboxId: string): Promise<void> {
  const sandbox = await Sandbox.get(sandboxId)
  await sandbox.stop()
}

/**
 * Get the public URL for a sandbox port.
 */
export async function getSandboxUrl(
  sandboxId: string,
  port: number = 3000
): Promise<string | null> {
  try {
    const sandbox = await Sandbox.get(sandboxId)
    return sandbox.domain(port)
  } catch {
    return null
  }
}
