import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MinimalContextBuilder from '../../src/services/context_engine/minimal_context_builder'
import SafeMaterialReader from '../../src/services/context_engine/safe_material_reader'

const temporaryRoots: string[] = []
const validChineseDocx = Buffer.from('UEsDBAoAAAAIAChU91x5bjPX6AAAAK0BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU7DMBD9FWuuKHHggBCK0wPLETiUDxjZk8SqN3nc0v49Tlt6QIXjzFv1+tXeO7GjzDYGBbdtB4KCjsaGScHn+rV5AMEFg0EXAyk4EMNq6NeHRCyqNrCCuZT0KCXrmTxyGxOFiowxeyz1zJNMqDc4kbzrunupYygUSlMWDxj6Zxpx64p42df3qUcmxyCeTsQlSwGm5KzGUnG5C+ZXSnNOaKvyyOHZJr6pBJBXExbk74Cz7r0Ok60h8YG5vKGvLPkVs5Em6q2vyvZ/mys94zhaTRf94pZy1MRcF/euvSAebfjpL49zD99QSwMECgAAAAAAKFT3XAAAAAAAAAAAAAAAAAYAAABfcmVscy9QSwMECgAAAAgAKFT3XJv9N+qtAAAAKQEAAAsAAABfcmVscy8ucmVsc43POw7CMAwG4KtE3mlaBoRQ0y4IqSsqB7ASN61oHkrCo7cnAwNFDIy2f3+W6/ZpZnanECdnBVRFCYysdGqyWsClP232wGJCq3B2lgQsFKFt6jPNmPJKHCcfWTZsFDCm5A+cRzmSwVg4TzZPBhcMplwGzT3KK2ri27Lc8fBpwNpknRIQOlUB6xdP/9huGCZJRydvhmz6ceIrkWUMmpKAhwuKq3e7yCzwpuarF5sXUEsDBAoAAAAAAChU91wAAAAAAAAAAAAAAAAFAAAAd29yZC9QSwMECgAAAAgAKFT3XNh+QM8rAQAAfwEAABEAAAB3b3JkL2RvY3VtZW50LnhtbHWQy07CQBSGX6WZvQy6MKahsHPtQh+gtiOQ0JlmZhTZEQ0WDAFcYDQhxogLNVIavBENfRk9dPoWtrDQmLj5T87t+3NOrnDoVLQDwkWZUQOtZrJII9RidpkWDbSzvbmygTQhTWqbFUaJgWpEoEI+V9VtZu07hEotAVChVw1UktLVMRZWiTimyDCX0KS3x7hjyiTlRVxl3HY5s4gQCd+p4LVsdh07ZpmiFLnL7Foa3VR4KjIfnV3BU6C8Bzi9g/a58kO49eaDVnzZg8YjdKdf08785V6FYTQJYXwCzde4fv17IBqFyr9ZLsaep55H0GtCr/1ZP8rh1CJVvlD3rzv4LTVsqOBYjfvKD2DWV7PZ/KKzpMHbJProQjOAwft/NEEsucXxorC8D//8Lv8NUEsBAhQACgAAAAgAKFT3XHluM9foAAAArQEAABMAAAAAAAAAAAAAAAAAAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAKAAAAAAAoVPdcAAAAAAAAAAAAAAAABgAAAAAAAAAAABAAAAAZAQAAX3JlbHMvUEsBAhQACgAAAAgAKFT3XJv9N+qtAAAAKQEAAAsAAAAAAAAAAAAAAAAAPQEAAF9yZWxzLy5yZWxzUEsBAhQACgAAAAAAKFT3XAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAQAAAAEwIAAHdvcmQvUEsBAhQACgAAAAgAKFT3XNh+QM8rAQAAfwEAABEAAAAAAAAAAAAAAAAANgIAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAAFAAUAIAEAAJADAAAAAA==', 'base64')
const emptyDocx = Buffer.from('UEsDBAoAAAAIAChU91x5bjPX6AAAAK0BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU7DMBD9FWuuKHHggBCK0wPLETiUDxjZk8SqN3nc0v49Tlt6QIXjzFv1+tXeO7GjzDYGBbdtB4KCjsaGScHn+rV5AMEFg0EXAyk4EMNq6NeHRCyqNrCCuZT0KCXrmTxyGxOFiowxeyz1zJNMqDc4kbzrunupYygUSlMWDxj6Zxpx64p42df3qUcmxyCeTsQlSwGm5KzGUnG5C+ZXSnNOaKvyyOHZJr6pBJBXExbk74Cz7r0Ok60h8YG5vKGvLPkVs5Em6q2vyvZ/mys94zhaTRf94pZy1MRcF/euvSAebfjpL49zD99QSwMECgAAAAAAKFT3XAAAAAAAAAAAAAAAAAYAAABfcmVscy9QSwMECgAAAAgAKFT3XJv9N+qtAAAAKQEAAAsAAABfcmVscy8ucmVsc43POw7CMAwG4KtE3mlaBoRQ0y4IqSsqB7ASN61oHkrCo7cnAwNFDIy2f3+W6/ZpZnanECdnBVRFCYysdGqyWsClP232wGJCq3B2lgQsFKFt6jPNmPJKHCcfWTZsFDCm5A+cRzmSwVg4TzZPBhcMplwGzT3KK2ri27Lc8fBpwNpknRIQOlUB6xdP/9huGCZJRydvhmz6ceIrkWUMmpKAhwuKq3e7yCzwpuarF5sXUEsDBAoAAAAAAChU91wAAAAAAAAAAAAAAAAFAAAAd29yZC9QSwMECgAAAAgAKFT3XOPC+XyRAAAAuQAAABEAAAB3b3JkL2RvY3VtZW50LnhtbEWNPQ7CMAyFr1J5py4MCFVN2ZgZ4AAhMW2lxo7iQOntSQfE8n70pO9150+YqzclnYQN7OsGKmInfuLBwP122Z2g0mzZ21mYDKykcO67pfXiXoE4VwXA2i4Gxpxji6hupGC1lkhctqekYHOpacBFko9JHKkWfpjx0DRHDHZi2JAP8evmETdVcvmaSsTfgv/X/gtQSwECFAAKAAAACAAoVPdceW4z1+gAAACtAQAAEwAAAAAAAAAAAAAAAAAAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUAAoAAAAAAChU91wAAAAAAAAAAAAAAAAGAAAAAAAAAAAAEAAAABkBAABfcmVscy9QSwECFAAKAAAACAAoVPdcm/036q0AAAApAQAACwAAAAAAAAAAAAAAAAA9AQAAX3JlbHMvLnJlbHNQSwECFAAKAAAAAAAoVPdcAAAAAAAAAAAAAAAABQAAAAAAAAAAABAAAAATAgAAd29yZC9QSwECFAAKAAAACAAoVPdc48L5fJEAAAC5AAAAEQAAAAAAAAAAAAAAAAA2AgAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAUABQAgAQAA9gIAAAAA', 'base64')

async function temporaryRepository() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-context-engine-'))
  temporaryRoots.push(root)
  await mkdir(path.join(root, 'storage/intake-uploads'), { recursive: true })
  return root
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('SafeMaterialReader', () => {
  it('reads a supported material without changing its正文', async () => {
    const root = await temporaryRepository()
    const content = '第一行案件材料\n第二行保留原文。\n'
    await writeFile(path.join(root, 'storage/intake-uploads/material.txt'), content, 'utf8')

    const result = await new SafeMaterialReader({ repositoryRoot: root }).read(
      'storage/intake-uploads/material.txt',
    )

    expect(result.content).toBe(content)
    expect(result.contentLength).toBe(content.length)
  })

  it.each([
    ['txt', '纯文本案件材料。'],
    ['md', '# 案件材料\n\n保留 Markdown 原文。'],
    ['json', '{"title":"案件材料","confirmed":true}'],
  ])('keeps the original %s behavior', async (extension, content) => {
    const root = await temporaryRepository()
    const storageUri = `storage/intake-uploads/material.${extension}`
    await writeFile(path.join(root, storageUri), content, 'utf8')

    const result = await new SafeMaterialReader({ repositoryRoot: root }).read(storageUri)

    expect(result).toEqual({ storageUri, content, contentLength: content.length })
  })

  it('extracts Chinese正文 from DOCX', async () => {
    const root = await temporaryRepository()
    const storageUri = 'storage/intake-uploads/equipment-contract.docx'
    await writeFile(path.join(root, storageUri), validChineseDocx)

    const result = await new SafeMaterialReader({ repositoryRoot: root }).read(storageUri)

    expect(result.content).toContain('瑞峰自动化设备有限公司与浩达精密制造有限公司签订设备采购合同。')
    expect(result.content).toContain('安装调试记录载明设备已经到场。')
    expect(result.contentLength).toBe(result.content.length)
  })

  it('rejects a DOCX with no正文', async () => {
    const root = await temporaryRepository()
    const storageUri = 'storage/intake-uploads/empty.docx'
    await writeFile(path.join(root, storageUri), emptyDocx)

    await expect(new SafeMaterialReader({ repositoryRoot: root }).read(storageUri))
      .rejects.toThrow('material_file_empty')
  })

  it('rejects a damaged DOCX', async () => {
    const root = await temporaryRepository()
    const storageUri = 'storage/intake-uploads/damaged.docx'
    await writeFile(path.join(root, storageUri), 'not a valid DOCX archive', 'utf8')

    await expect(new SafeMaterialReader({ repositoryRoot: root }).read(storageUri))
      .rejects.toThrow('material_file_extraction_failed')
  })

  it('rejects an oversized DOCX before extraction', async () => {
    const root = await temporaryRepository()
    const storageUri = 'storage/intake-uploads/oversized.docx'
    await writeFile(path.join(root, storageUri), validChineseDocx)

    await expect(new SafeMaterialReader({ repositoryRoot: root, maxFileBytes: validChineseDocx.length - 1 }).read(storageUri))
      .rejects.toThrow('material_file_too_large')
  })

  it('extracts text from a PDF Buffer', async () => {
    const root = await temporaryRepository()
    const storageUri = 'storage/intake-uploads/contract.pdf'
    const fixturePath = path.join(path.dirname(require.resolve('pdf-parse/package.json')), 'test/data/01-valid.pdf')
    await writeFile(path.join(root, storageUri), await readFile(fixturePath))

    const result = await new SafeMaterialReader({ repositoryRoot: root }).read(storageUri)

    expect(result.content).toContain('Because traces are in SSA form')
    expect(result.contentLength).toBe(result.content.length)
  })

  it('extracts Chinese正文 from PDF', async () => {
    const root = await temporaryRepository()
    const storageUri = 'storage/intake-uploads/chinese-contract.pdf'
    const binaryPdf = Buffer.from('%PDF-1.4 Chinese fixture', 'utf8')
    const pdfTextExtractor = vi.fn(async () => '瑞峰自动化设备采购合同')
    await writeFile(path.join(root, storageUri), binaryPdf)

    const result = await new SafeMaterialReader({ repositoryRoot: root, pdfTextExtractor }).read(storageUri)

    expect(result.content).toContain('瑞峰自动化设备采购合同')
    expect(pdfTextExtractor).toHaveBeenCalledWith(binaryPdf)
  })

  it('rejects a PDF with no extractable正文', async () => {
    const root = await temporaryRepository()
    const storageUri = 'storage/intake-uploads/empty.pdf'
    await writeFile(path.join(root, storageUri), Buffer.from('%PDF-1.4 empty fixture', 'utf8'))

    await expect(new SafeMaterialReader({ repositoryRoot: root, pdfTextExtractor: async () => ' \n ' }).read(storageUri))
      .rejects.toThrow('material_file_empty')
  })

  it('rejects a damaged PDF', async () => {
    const root = await temporaryRepository()
    const storageUri = 'storage/intake-uploads/damaged.pdf'
    await writeFile(path.join(root, storageUri), 'not a valid PDF file', 'utf8')

    await expect(new SafeMaterialReader({ repositoryRoot: root }).read(storageUri))
      .rejects.toThrow('material_file_extraction_failed')
  })

  it('rejects traversal and symlink paths outside the upload root', async () => {
    const root = await temporaryRepository()
    const outside = path.join(root, 'outside.txt')
    await writeFile(outside, '其他案件正文', 'utf8')
    await symlink(outside, path.join(root, 'storage/intake-uploads/link.txt'))
    const reader = new SafeMaterialReader({ repositoryRoot: root })

    await expect(reader.read('../outside.txt')).rejects.toThrow('material_storage_uri_outside_root')
    await expect(reader.read('storage/intake-uploads/link.txt')).rejects.toThrow('material_storage_uri_outside_root')
  })
})

describe('MinimalContextBuilder', () => {
  it('keeps current Matter isolation and never reads a returned foreign Material', async () => {
    const read = vi.fn(async (storageUri: string) => ({
      storageUri,
      content: '当前案件正文',
      contentLength: 6,
    }))
    const prisma = {
      matter: {
        findFirst: vi.fn(async () => ({
          matter_id: 'matter-current',
          title: '当前案件',
          description: '',
          matter_type: '合同纠纷',
          status: 'active',
        })),
      },
      material: {
        findMany: vi.fn(async () => [
          {
            material_id: 'material-current',
            matter_id: 'matter-current',
            title: '当前材料',
            source: 'client',
            material_type: 'text',
            storage_uri: 'storage/intake-uploads/current.txt',
          },
          {
            material_id: 'material-foreign',
            matter_id: 'matter-other',
            title: '其他案件材料',
            source: 'opponent',
            material_type: 'text',
            storage_uri: 'storage/intake-uploads/foreign.txt',
          },
        ]),
      },
    }

    const snapshot = await new MinimalContextBuilder(prisma as any, { read }).build('matter-current')

    expect(prisma.matter.findFirst).toHaveBeenCalledWith({
      where: { matter_id: 'matter-current', status: { not: 'deleted' } },
    })
    expect(prisma.material.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { matter_id: 'matter-current' },
    }))
    expect(read).toHaveBeenCalledTimes(1)
    expect(read).toHaveBeenCalledWith('storage/intake-uploads/current.txt')
    expect(snapshot.materials.map((material) => material.materialId)).toEqual(['material-current'])
  })

  it('puts the complete正文, material identity and source into the snapshot', async () => {
    const root = await temporaryRepository()
    const content = '完整沟通记录：\n甲方主张解除合同。\n乙方对此存在异议。'
    await writeFile(path.join(root, 'storage/intake-uploads/case.md'), content, 'utf8')
    const prisma = {
      matter: {
        findFirst: async () => ({
          matter_id: 'matter-1',
          title: '测试案件',
          description: '仅为案件背景',
          matter_type: '合同纠纷',
          status: 'active',
        }),
      },
      material: {
        findMany: async () => [{
          material_id: 'material-1',
          matter_id: 'matter-1',
          title: '沟通记录',
          material_type: 'text',
          source: 'client',
          storage_uri: 'storage/intake-uploads/case.md',
          created_at: new Date('2026-01-01T00:00:00.000Z'),
        }],
      },
    }
    const reader = new SafeMaterialReader({ repositoryRoot: root })

    const snapshot = await new MinimalContextBuilder(prisma as any, reader).build('matter-1')

    expect(snapshot.materials).toEqual([expect.objectContaining({
      materialId: 'material-1',
      source: 'client',
      content,
      contentLength: content.length,
    })])
    expect(snapshot.completeness).toEqual({
      complete: true,
      totalMaterials: 1,
      readableMaterials: 1,
      unavailableMaterials: [],
    })
    expect(snapshot.sourceHash).toMatch(/^[a-f0-9]{64}$/)
  })
})
