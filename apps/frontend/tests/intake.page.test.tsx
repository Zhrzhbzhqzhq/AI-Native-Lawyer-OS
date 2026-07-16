import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import IntakePage from '../src/app/intake/page'

// mock next/navigation useRouter
let pushMock = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: (...args: any[]) => pushMock(...args) })
}))

describe('IntakePage start analysis', () => {
    beforeEach(() => {
        pushMock = vi.fn()
        sessionStorage.clear()
        ; (global as any).fetch = vi.fn()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })


    it('keeps analysis disabled until a valid persisted upload is available', async () => {
        render(<IntakePage />)
        const btn = screen.getByRole('button', { name: '开始 AI 分析' })
        expect(btn.hasAttribute('disabled')).toBe(true)
        fireEvent.click(btn)
        expect(pushMock).not.toHaveBeenCalled()
        expect((global as any).fetch).not.toHaveBeenCalled()
        expect(sessionStorage.getItem('lawdesk_intake_uploaded_files')).toBeNull()
    })

    it('stores only a valid upload response and then enters analysis', async () => {
        const uploaded = {
            original_name: 'consultation.txt', stored_name: `${'a'.repeat(64)}.txt`, mime_type: 'text/plain', size: 12,
            uploaded_at: '2026-07-16T00:00:00.000Z', storage_uri: `storage/intake-uploads/${'a'.repeat(64)}.txt`, checksum: 'a'.repeat(64), duplicate: false,
            name: 'consultation.txt', type: 'text/plain', upload_time: '2026-07-16T00:00:00.000Z', uploaded_path: `storage/intake-uploads/${'a'.repeat(64)}.txt`, content: 'consultation', text_content: 'consultation',
        }
        ;(global as any).fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, files: [uploaded] }) })
        const { container } = render(<IntakePage />)
        const input = container.querySelector('input[type="file"]') as HTMLInputElement
        fireEvent.change(input, { target: { files: [new File(['consultation'], 'consultation.txt', { type: 'text/plain' })] } })
        fireEvent.click(await screen.findByRole('button', { name: '上传' }))
        await waitFor(() => expect(screen.getByText('已成功接收 1 个文件')).toBeTruthy())
        const start = screen.getAllByRole('button', { name: '开始 AI 分析' })[0]
        expect(start.hasAttribute('disabled')).toBe(false)
        fireEvent.click(start)
        expect(pushMock).toHaveBeenCalledWith('/intake/analyzing')
        expect(JSON.parse(sessionStorage.getItem('lawdesk_intake_uploaded_files') || '[]')).toHaveLength(1)
    })

    it('rejects an invalid upload response without writing session storage', async () => {
        ;(global as any).fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, files: [{}] }) })
        const { container } = render(<IntakePage />)
        const input = container.querySelector('input[type="file"]') as HTMLInputElement
        fireEvent.change(input, { target: { files: [new File(['x'], 'consultation.txt', { type: 'text/plain' })] } })
        fireEvent.click(await screen.findByRole('button', { name: '上传' }))
        await waitFor(() => expect(screen.getByText('上传返回数据暂不可用')).toBeTruthy())
        expect(sessionStorage.getItem('lawdesk_intake_uploaded_files')).toBeNull()
        expect(screen.getByRole('button', { name: '开始 AI 分析' }).hasAttribute('disabled')).toBe(true)
    })
})
