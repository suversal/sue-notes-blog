import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Writing backend', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('legacy admin entry opens the writing backend', async () => {
    await page.goto('http://127.0.0.1:3100/admin')
    await expect(page).toHaveURL('http://127.0.0.1:3100/articles')
    await expect(page.getByRole('navigation', { name: '后台导航' })).toBeVisible()
  })

  test('legacy nested admin links do not expose Payload UI', async () => {
    await page.goto('http://127.0.0.1:3100/admin/collections/users')
    await expect(page).toHaveURL('http://127.0.0.1:3100/articles')
    await expect(page.getByRole('navigation', { name: '后台导航' })).toBeVisible()
  })

  test('can open the writing backend', async () => {
    await page.goto('http://127.0.0.1:3100/articles')
    await expect(page).toHaveURL('http://127.0.0.1:3100/articles')
    await expect(page.getByRole('navigation', { name: '后台导航' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '文章', exact: true })).toBeVisible()
  })

  test('editor toolbar exposes only usable actions with readable labels', async () => {
    const pageErrors: string[] = []
    const recordPageError = (error: Error) => pageErrors.push(error.message)
    page.on('pageerror', recordPageError)
    await page.goto('http://127.0.0.1:3100/articles/new')

    await expect(page.locator('.fixed-toolbar__group-add')).toBeHidden()
    await expect(page.locator('.inline-toolbar-popup')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '段落、标题与列表' })).toBeVisible()
    await expect(page.getByRole('button', { name: '文字对齐' })).toBeVisible()
    await expect(page.getByRole('button', { name: '粗体' })).toHaveAttribute('title', '粗体')
    await expect(page.getByRole('button', { name: '引用' })).toHaveAttribute('title', '引用')
    await expect(page.getByRole('button', { name: '代码块' })).toHaveAttribute('title', '代码块')
    await expect(page.getByRole('button', { name: '插入表格' })).toHaveAttribute('title', '插入表格')
    await expect(page.getByRole('button', { name: '分隔线' })).toHaveAttribute('title', '分隔线')
    await expect(page.getByRole('button', { name: '插入或编辑链接' })).toHaveAttribute('title', '插入或编辑链接')

    await page.getByRole('button', { name: '段落、标题与列表' }).click()
    const dropdown = page.locator('.fixed-toolbar__dropdown-items')
    await expect(dropdown).toBeVisible()
    await expect(dropdown.getByRole('button', { name: '正常文本' })).toBeVisible()
    const background = await dropdown.evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(background).not.toBe('rgba(0, 0, 0, 0)')
    expect(background).not.toBe('transparent')

    await page.keyboard.press('Escape')
    const editor = page.locator('.ContentEditable__root')
    await editor.fill('引用和链接测试')
    await page.getByRole('button', { name: '引用' }).click()
    await expect(editor.locator('blockquote')).toContainText('引用和链接测试')
    await page.getByRole('button', { name: '引用' }).click()
    await expect(editor.locator('blockquote')).toHaveCount(0)

    await editor.evaluate((element) => {
      const text = element.querySelector('p')?.firstChild
      if (!text) throw new Error('缺少可选择的正文')
      const range = document.createRange()
      range.selectNodeContents(text)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      element.dispatchEvent(new Event('selectionchange', { bubbles: true }))
      document.dispatchEvent(new Event('selectionchange'))
    })
    const linkButton = page.getByRole('button', { name: '插入或编辑链接' })
    await expect(linkButton).toBeEnabled()
    await linkButton.click()
    const linkDialog = page.getByRole('dialog', { name: '链接设置' })
    await expect(linkDialog).toBeVisible()
    await linkDialog.getByLabel('链接地址').fill('example.com')
    await linkDialog.getByRole('button', { name: '应用链接' }).click()
    const insertedLink = editor.locator('a[href="https://example.com/"]')
    await expect(insertedLink).toContainText('引用和链接测试')
    const linkAppearance = await insertedLink.evaluate((element) => {
      const linkStyle = getComputedStyle(element)
      const paragraphStyle = getComputedStyle(element.closest('p') ?? element.parentElement!)
      return {
        color: linkStyle.color,
        paragraphColor: paragraphStyle.color,
        textDecorationLine: linkStyle.textDecorationLine,
      }
    })
    expect(linkAppearance.color).not.toBe(linkAppearance.paragraphColor)
    expect(linkAppearance.textDecorationLine).toContain('underline')
    await insertedLink.evaluate((element) => {
      const range = document.createRange()
      range.selectNodeContents(element)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      document.dispatchEvent(new Event('selectionchange'))
    })
    const editLinkButton = page.getByRole('button', { name: '插入或编辑链接' })
    await expect(editLinkButton).toBeVisible()
    await editLinkButton.click()
    await page.getByRole('dialog', { name: '链接设置' }).getByRole('button', { name: '移除链接' }).click()
    await expect(editor.locator('a')).toHaveCount(0)
    expect(pageErrors).toEqual([])
    page.off('pageerror', recordPageError)
  })

  test('editor inserts a fenced-code content block', async () => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto('http://127.0.0.1:3100/articles/new')

    await page.locator('.ContentEditable__root').click()
    await page.getByRole('button', { name: '代码块' }).click()
    const codeBlock = page.locator('.ContentEditable__root .LexicalEditorTheme__code')
    await expect(codeBlock).toBeVisible()
    await page.keyboard.type('const answer = 42;')
    await expect(codeBlock).toContainText('const answer = 42;')
    await page.getByRole('button', { name: '代码块' }).click()
    await expect(codeBlock).toHaveCount(0)
    await expect(page.locator('.ContentEditable__root p')).toContainText('const answer = 42;')
    expect(pageErrors).toEqual([])
  })

  test('editor inserts a link without requiring selected text', async () => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto('http://127.0.0.1:3100/articles/new')

    await page.locator('.ContentEditable__root').click()
    await page.getByRole('button', { name: '插入或编辑链接' }).click()
    const dialog = page.getByRole('dialog', { name: '链接设置' })
    await dialog.getByLabel('链接文字').fill('查看原文')
    await dialog.getByLabel('链接地址').fill('example.com/article')
    await dialog.getByRole('button', { name: '应用链接' }).click()
    await expect(page.locator('.ContentEditable__root a[href="https://example.com/article"]')).toHaveText('查看原文')
    expect(pageErrors).toEqual([])
  })

  test('editor image exposes only clear supported actions', async () => {
    const pageErrors: string[] = []
    const imageURL = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#eeece5"/></svg>')}`
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.route('**/api/editor/images', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ alt: '测试图片', id: 'test-media-id', url: imageURL }),
      })
    })
    await page.route('**/api/media/test-media-id**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          alt: '测试图片',
          filename: 'test-image.png',
          filesize: 68,
          height: 600,
          id: 'test-media-id',
          mimeType: 'image/png',
          thumbnailURL: null,
          url: imageURL,
          width: 800,
        }),
      })
    })
    await page.goto('http://127.0.0.1:3100/articles/new')

    const editor = page.locator('.ContentEditable__root')
    await editor.click()
    await editor.evaluate((element) => {
      const clipboard = new DataTransfer()
      clipboard.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'test-image.png', { type: 'image/png' }))
      element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }))
    })

    const upload = page.locator('.LexicalEditorTheme__upload')
    await expect(upload).toBeVisible()
    const filename = upload.locator('.LexicalEditorTheme__upload__doc-drawer-toggler')
    await expect(filename).toContainText('test-image.png')
    await expect(filename).toHaveAttribute('aria-disabled', 'true')
    await expect(filename).toHaveAttribute('tabindex', '-1')
    await upload.hover()
    const resizeButton = upload.getByRole('button', { name: '调整图片尺寸' })
    await expect(resizeButton).toHaveAttribute('title', '调整图片尺寸')
    await resizeButton.click()
    const layoutDialog = page.getByRole('dialog', { name: '图片尺寸与对齐' })
    await expect(layoutDialog).toBeVisible()
    await layoutDialog.getByRole('button', { name: '50%' }).click()
    await layoutDialog.getByRole('button', { name: '靠右' }).click()
    await expect(layoutDialog.getByRole('button', { name: '50%' })).toHaveAttribute('aria-pressed', 'true')
    await expect(layoutDialog.getByRole('button', { name: '靠右' })).toHaveAttribute('aria-pressed', 'true')
    await expect(layoutDialog.getByLabel('宽度（px）')).toBeDisabled()
    await expect(layoutDialog.getByLabel('高度（px）')).toBeDisabled()
    await layoutDialog.getByRole('button', { name: '应用尺寸' }).click()
    await expect.poll(() => upload.evaluate((element) => (element as HTMLElement).style.width)).toBe('50%')
    await expect.poll(() => upload.evaluate((element) => (element as HTMLElement).style.marginLeft)).toBe('auto')
    await expect.poll(() => upload.evaluate((element) => (element as HTMLElement).style.marginRight)).toBe('0px')
    await expect(upload).toHaveAttribute('data-image-layout', '')
    await expect(upload).not.toHaveAttribute('data-image-crop', '')
    await expect.poll(async () => {
      const savedContent = JSON.parse(await page.locator('input[name="content"]').inputValue()) as {
        root: { children: Array<{ children?: unknown[]; fields?: Record<string, unknown>; type?: string }> }
      }
      const findUpload = (nodes: typeof savedContent.root.children): Record<string, unknown> | undefined => {
        for (const node of nodes) {
          if (node.type === 'upload') return node.fields
          const nested = findUpload((node.children ?? []).filter((child): child is (typeof nodes)[number] => Boolean(child) && typeof child === 'object'))
          if (nested) return nested
        }
      }
      return findUpload(savedContent.root.children)
    }).toMatchObject({
      displayAlignment: 'right',
      displayScale: 50,
    })
    const removeButton = upload.getByRole('button', { name: '移除图片' })
    await expect(removeButton).toHaveAttribute('title', '移除图片')
    await removeButton.click()
    await expect(upload).toHaveCount(0)
    expect(pageErrors).toEqual([])
    await page.unroute('**/api/editor/images')
    await page.unroute('**/api/media/test-media-id**')
  })

  test('editor inserts and edits a responsive table', async () => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto('http://127.0.0.1:3100/articles/new')

    await page.locator('.ContentEditable__root').click()
    await page.getByRole('button', { name: '插入表格' }).click()
    const dialog = page.getByRole('dialog', { name: '表格设置' })
    await dialog.getByLabel('行数').fill('2')
    await dialog.getByLabel('列数').fill('3')
    await dialog.getByRole('button', { name: '插入', exact: true }).click()

    const table = page.locator('.ContentEditable__root table')
    await expect(table).toBeVisible()
    await expect(table.locator('tr')).toHaveCount(2)
    await expect(table.locator('tr').first().locator('td, th')).toHaveCount(3)
    await table.locator('td, th').first().click()
    await page.keyboard.type('第一格')
    await expect(table.locator('td, th').first()).toContainText('第一格')
    expect(pageErrors).toEqual([])
  })

  test('editor wraps long unbroken content without horizontal overflow', async () => {
    await page.setViewportSize({ height: 812, width: 375 })
    await page.goto('http://127.0.0.1:3100/articles/new')

    const editor = page.locator('.ContentEditable__root')
    await editor.fill('dadasdadasdadadkas;dkas;lkdl;askdl;kasld;ka;lskd;lkas;ldk;alskd;lsakd;lka;lskd;laskd;lkas;dkal;sdk;laskd;lkd;lka;ldka;lkdl;askda')

    const measurements = await editor.evaluate((element) => {
      const paragraph = element.querySelector('p')
      if (!paragraph) throw new Error('缺少正文段落')
      return {
        editorClientWidth: element.clientWidth,
        editorScrollWidth: element.scrollWidth,
        paragraphClientWidth: paragraph.clientWidth,
        paragraphScrollWidth: paragraph.scrollWidth,
        wrap: getComputedStyle(paragraph).overflowWrap,
      }
    })

    expect(measurements.wrap).toBe('anywhere')
    expect(measurements.editorScrollWidth).toBeLessThanOrEqual(measurements.editorClientWidth + 1)
    expect(measurements.paragraphScrollWidth).toBeLessThanOrEqual(measurements.paragraphClientWidth + 1)
    await page.setViewportSize({ height: 720, width: 1280 })
  })

  test('editor keeps its gutter line continuous and inserts a divider', async () => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto('http://127.0.0.1:3100/articles/new')

    const editor = page.locator('.ContentEditable__root')
    await editor.click()
    await page.keyboard.type('第一段')
    await page.keyboard.press('Enter')
    await page.keyboard.type('当前段落')
    await editor.locator('p').last().hover()
    await expect(page.locator('.draggable-block-menu')).toBeVisible()

    const gutter = await editor.evaluate((element) => {
      const line = getComputedStyle(element, '::before')
      const handle = element.parentElement?.querySelector<HTMLElement>('.draggable-block-menu')
      if (!handle) throw new Error('缺少段落拖动手柄')
      return {
        borderStyle: line.borderLeftStyle,
        handleBackground: getComputedStyle(handle).backgroundColor,
      }
    })
    expect(gutter.borderStyle).toBe('solid')
    expect(gutter.handleBackground).toBe('rgba(0, 0, 0, 0)')

    await page.getByRole('button', { name: '分隔线' }).click()
    await expect(editor.locator('hr')).toBeVisible()
    expect(pageErrors).toEqual([])
  })
})
