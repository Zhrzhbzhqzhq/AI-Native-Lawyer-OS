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
        // mock fetch
        ; (global as any).fetch = vi.fn()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })


    it('disables button, calls API and redirects to documents on success', async () => {
        // reset push mock for this test
        pushMock = vi.fn()

            ; (global as any).fetch.mockResolvedValueOnce({ status: 201, json: async () => ({ matter_id: 'm-test', created: true, document_pipeline: { draftDocumentId: 'doc-1' } }) })

        render(<IntakePage />)
        const btn = screen.getByRole('button', { name: /开始整理案件|AI 正在分析……/ })
        fireEvent.click(btn)

        await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/matters/m-test/documents'))
    })
})
