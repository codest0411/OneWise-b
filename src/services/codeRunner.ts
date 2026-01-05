import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

interface ExecutionResult {
  output: string
  error: string | null
  executionTime: number
}

const TIMEOUT_MS = 10000

async function createTempFile(code: string, extension: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-exec-'))
  const filePath = path.join(tempDir, `code${extension}`)
  await fs.writeFile(filePath, code, 'utf-8')
  return filePath
}

async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    const dir = path.dirname(filePath)
    await fs.rm(dir, { recursive: true, force: true })
  } catch (err) {
    console.error('Failed to cleanup temp file:', err)
  }
}

export async function executeCode(code: string, language: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  let filePath: string | null = null

  try {
    switch (language.toLowerCase()) {
      case 'javascript':
        return await executeJavaScript(code)

      case 'typescript':
        return await executeTypeScript(code)

      case 'python':
        return await executePython(code)

      case 'java':
        return await executeJava(code)

      case 'csharp':
      case 'c#':
        return await executeCSharp(code)

      case 'go':
        return await executeGo(code)

      default:
        return {
          output: '',
          error: `Language "${language}" is not supported for execution`,
          executionTime: Date.now() - startTime,
        }
    }
  } catch (err: any) {
    return {
      output: '',
      error: err.message || 'Execution failed',
      executionTime: Date.now() - startTime,
    }
  } finally {
    if (filePath) {
      await cleanupTempFile(filePath)
    }
  }
}

async function executeJavaScript(code: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  const filePath = await createTempFile(code, '.js')

  try {
    const { stdout, stderr } = await execAsync(`node "${filePath}"`, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    })

    return {
      output: stdout.trim(),
      error: stderr.trim() || null,
      executionTime: Date.now() - startTime,
    }
  } catch (err: any) {
    return {
      output: err.stdout?.trim() || '',
      error: err.stderr?.trim() || err.message,
      executionTime: Date.now() - startTime,
    }
  } finally {
    await cleanupTempFile(filePath)
  }
}

async function executeTypeScript(code: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  const filePath = await createTempFile(code, '.ts')

  try {
    const { stdout, stderr } = await execAsync(`npx ts-node "${filePath}"`, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    })

    return {
      output: stdout.trim(),
      error: stderr.trim() || null,
      executionTime: Date.now() - startTime,
    }
  } catch (err: any) {
    return {
      output: err.stdout?.trim() || '',
      error: err.stderr?.trim() || err.message,
      executionTime: Date.now() - startTime,
    }
  } finally {
    await cleanupTempFile(filePath)
  }
}

async function executePython(code: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  const filePath = await createTempFile(code, '.py')

  try {
    const { stdout, stderr } = await execAsync(`python "${filePath}"`, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    })

    return {
      output: stdout.trim(),
      error: stderr.trim() || null,
      executionTime: Date.now() - startTime,
    }
  } catch (err: any) {
    return {
      output: err.stdout?.trim() || '',
      error: err.stderr?.trim() || err.message,
      executionTime: Date.now() - startTime,
    }
  } finally {
    await cleanupTempFile(filePath)
  }
}

async function executeJava(code: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'java-exec-'))
  
  const className = extractJavaClassName(code) || 'Main'
  const filePath = path.join(tempDir, `${className}.java`)
  await fs.writeFile(filePath, code, 'utf-8')

  try {
    await execAsync(`javac "${filePath}"`, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    })

    const { stdout, stderr } = await execAsync(`java -cp "${tempDir}" ${className}`, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    })

    return {
      output: stdout.trim(),
      error: stderr.trim() || null,
      executionTime: Date.now() - startTime,
    }
  } catch (err: any) {
    return {
      output: err.stdout?.trim() || '',
      error: err.stderr?.trim() || err.message,
      executionTime: Date.now() - startTime,
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function executeCSharp(code: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  const filePath = await createTempFile(code, '.cs')

  try {
    const { stdout, stderr } = await execAsync(`dotnet script "${filePath}"`, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    })

    return {
      output: stdout.trim(),
      error: stderr.trim() || null,
      executionTime: Date.now() - startTime,
    }
  } catch (err: any) {
    return {
      output: err.stdout?.trim() || '',
      error: err.stderr?.trim() || err.message,
      executionTime: Date.now() - startTime,
    }
  } finally {
    await cleanupTempFile(filePath)
  }
}

async function executeGo(code: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  const filePath = await createTempFile(code, '.go')

  try {
    const { stdout, stderr } = await execAsync(`go run "${filePath}"`, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    })

    return {
      output: stdout.trim(),
      error: stderr.trim() || null,
      executionTime: Date.now() - startTime,
    }
  } catch (err: any) {
    return {
      output: err.stdout?.trim() || '',
      error: err.stderr?.trim() || err.message,
      executionTime: Date.now() - startTime,
    }
  } finally {
    await cleanupTempFile(filePath)
  }
}

function extractJavaClassName(code: string): string | null {
  const match = code.match(/public\s+class\s+(\w+)/)
  return match ? match[1] : null
}
