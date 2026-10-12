// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ItemForm } from '../../src/app/(site)/blog/components/uses-editor'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../../src/app/(studio)/articles/actions', () => ({
  deleteUsesCategoryFromWeb: vi.fn(), deleteUsesItemFromWeb: vi.fn(), moveUsesCategoryFromWeb: vi.fn(), moveUsesItemFromWeb: vi.fn(),
  saveUsesCategoryFromWeb: vi.fn(), saveUsesItemFromWeb: vi.fn(), setUsesItemVisibleFromWeb: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('在用条目表单', () => {
  it('Logo 上传完成前不能保存，完成后提交的是新地址', async () => {
    let finishUpload: (response: Response) => void = () => {}
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finishUpload = resolve })))
    const { container } = render(<ItemForm categoryId="servers" categories={[{ id: 'servers', name: '服务器', subtitle: '', note: '', sortOrder: 10 }]} onDone={() => {}} />)
    const save = screen.getByRole('button', { name: '保存' }) as HTMLButtonElement
    expect(save.disabled).toBe(false)

    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'logo.png', { type: 'image/png' })] } })
    await waitFor(() => expect(save.disabled).toBe(true))

    finishUpload({ ok: true, json: async () => ({ url: 'https://img.example.com/new.png' }) } as Response)
    await waitFor(() => expect(save.disabled).toBe(false))
    expect((container.querySelector('input[name="logoUrl"]') as HTMLInputElement).value).toBe('https://img.example.com/new.png')
  })
})
