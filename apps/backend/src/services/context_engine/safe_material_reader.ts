import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import mammoth from 'mammoth'

const STORAGE_PREFIX = 'storage/intake-uploads/'
const SUPPORTED_EXTENSIONS = new Set(['.docx', '.json', '.md', '.txt'])
const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024

export type SafeMaterialReaderOptions = {
  repositoryRoot?: string
  maxFileBytes?: number
}

export type SafeMaterialReadResult = {
  storageUri: string
  content: string
  contentLength: number
}

function defaultRepositoryRoot() {
  return path.resolve(__dirname, '../../../../..')
}

function readerError(code: string): Error {
  const error = new Error(code)
  ;(error as any).code = code
  return error
}

function isInside(parent: string, candidate: string) {
  const relative = path.relative(parent, candidate)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export class SafeMaterialReader {
  private readonly repositoryRoot: string
  private readonly storageRoot: string
  private readonly maxFileBytes: number

  constructor(options: SafeMaterialReaderOptions = {}) {
    this.repositoryRoot = path.resolve(options.repositoryRoot || defaultRepositoryRoot())
    this.storageRoot = path.join(this.repositoryRoot, 'storage/intake-uploads')
    this.maxFileBytes = options.maxFileBytes || DEFAULT_MAX_FILE_BYTES
  }

  async read(storageUri: string): Promise<SafeMaterialReadResult> {
    const uri = String(storageUri || '').trim()
    if (!uri) throw readerError('material_storage_uri_missing')
    if (path.isAbsolute(uri) || uri.includes('\\') || uri.includes('\0') || /^[a-z][a-z0-9+.-]*:/i.test(uri)) {
      throw readerError('material_storage_uri_invalid')
    }

    const parts = uri.split('/')
    if (!uri.startsWith(STORAGE_PREFIX) || parts.some((part) => !part || part === '.' || part === '..')) {
      throw readerError('material_storage_uri_outside_root')
    }
    const extension = path.extname(uri).toLowerCase()
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      throw readerError('material_file_type_unsupported')
    }

    const candidate = path.resolve(this.repositoryRoot, uri)
    if (!isInside(this.storageRoot, candidate)) throw readerError('material_storage_uri_outside_root')

    let realStorageRoot: string
    let realCandidate: string
    try {
      ;[realStorageRoot, realCandidate] = await Promise.all([
        realpath(this.storageRoot),
        realpath(candidate),
      ])
    } catch {
      throw readerError('material_file_unavailable')
    }
    if (!isInside(realStorageRoot, realCandidate)) throw readerError('material_storage_uri_outside_root')

    const fileStat = await stat(realCandidate).catch(() => null)
    if (!fileStat?.isFile()) throw readerError('material_file_unavailable')
    if (fileStat.size > this.maxFileBytes) throw readerError('material_file_too_large')

    let content: string
    if (extension === '.docx') {
      const buffer = await readFile(realCandidate).catch(() => {
        throw readerError('material_file_unavailable')
      })
      content = await mammoth.extractRawText({ buffer })
        .then((result) => result.value)
        .catch(() => {
          throw readerError('material_file_extraction_failed')
        })
    } else {
      content = await readFile(realCandidate, 'utf8').catch(() => {
        throw readerError('material_file_unavailable')
      })
    }
    if (!content.trim()) throw readerError('material_file_empty')

    return { storageUri: uri, content, contentLength: content.length }
  }
}

export default SafeMaterialReader
