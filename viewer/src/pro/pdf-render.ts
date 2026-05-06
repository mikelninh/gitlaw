/**
 * Client-side PDF rendering for scan-PDF OCR.
 *
 * Vercel serverless functions cannot run pdftoppm or Tesseract natively.
 * pdfjs-dist runs in the browser (WASM/JS), renders pages to canvas,
 * exports JPEG images, and feeds the existing /api/ocr Vision pipeline.
 *
 * Design constraints:
 * - 150 DPI → good OCR quality, < 500KB per page
 * - Max 10 pages per PDF (cost + latency cap)
 * - JPEG quality 0.8 for size control
 * - Each rendered page uploaded as a separate image doc, then OCR'd via Vision
 */

import * as pdfjsLib from 'pdfjs-dist'

// Vite-compatible worker path (pdfjs-dist v4 ships prebuilt assets in build/)
// In dev, the import resolves directly. In production, the bundled worker
// is served from the build output. We point to the same-origin worker.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export interface PdfPageImage {
  pageNumber: number
  dataUrl: string   // data:image/jpeg;base64,...
  width: number
  height: number
}

export interface RenderPdfResult {
  pages: PdfPageImage[]
  totalPages: number
  truncated: boolean // true if > maxPages and we only rendered the cap
}

const MAX_PAGES = 10
const SCALE = 2.0 // ~150 DPI at A4 (72 * 2 = 144, good for OCR)
const JPEG_QUALITY = 0.8

/**
 * Render a PDF ArrayBuffer into JPEG page images.
 */
export async function renderPdfBufferToImages(arrayBuffer: ArrayBuffer): Promise<RenderPdfResult> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const totalPages = pdf.numPages
  const pageCount = Math.min(totalPages, MAX_PAGES)
  const pages: PdfPageImage[] = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: SCALE })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')

    await page.render({ canvasContext: ctx, viewport }).promise

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    pages.push({
      pageNumber: i,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
    })

    page.cleanup()
  }

  return {
    pages,
    totalPages,
    truncated: totalPages > MAX_PAGES,
  }
}

/**
 * Convert a data URL to a File with a synthetic name.
 */
export function dataUrlToFile(dataUrl: string, name: string, mimeType: string): File {
  const arr = dataUrl.split(',')
  const bstr = atob(arr[arr.length - 1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], name, { type: mimeType })
}

/**
 * Run OCR on a scan PDF by rendering pages client-side then sending
 * each page image to the server-side Vision pipeline.
 *
 * Returns concatenated OCR text across all pages.
 */
export async function ocrScanPdf(
  pdfBuffer: ArrayBuffer,
  uploadFn: (f: File, caseId?: string) => Promise<{ ok: true; documentId: string; storageMode: 'server_vault'; storageProvider: string; checksumSha256: string }>,
  ocrFn: (input: {
    caseId: string
    attachmentInternalName: string
    mode: 'ocr'
    serverDocumentId: string
  }) => Promise<{ ok: boolean; status: string; provider?: string; ocrText?: string; message?: string }>,
  caseId: string,
  baseInternalName: string,
  onProgress?: (page: number, total: number, stage: 'render' | 'upload' | 'ocr') => void,
): Promise<{ ok: true; ocrText: string; provider: string; pageCount: number; truncated: boolean } | { ok: false; message: string }> {
  try {
    onProgress?.(0, 0, 'render')
    const rendered = await renderPdfBufferToImages(pdfBuffer)

    const ocrTexts: string[] = []
    for (let i = 0; i < rendered.pages.length; i++) {
      const page = rendered.pages[i]
      onProgress?.(i + 1, rendered.pages.length, 'upload')

      const pageFile = dataUrlToFile(
        page.dataUrl,
        `${baseInternalName}_seite_${page.pageNumber}.jpg`,
        'image/jpeg',
      )
      const uploaded = await uploadFn(pageFile, caseId)

      onProgress?.(i + 1, rendered.pages.length, 'ocr')
      const ocrResult = await ocrFn({
        caseId,
        attachmentInternalName: pageFile.name,
        mode: 'ocr',
        serverDocumentId: uploaded.documentId,
      })

      if (!ocrResult.ok || !ocrResult.ocrText) {
        ocrTexts.push(`[Seite ${page.pageNumber}: OCR fehlgeschlagen — ${ocrResult.message || 'kein Text erkannt'}]`)
      } else {
        ocrTexts.push(`\n--- Seite ${page.pageNumber} ---\n${ocrResult.ocrText}`)
      }
    }

    return {
      ok: true,
      ocrText: ocrTexts.join('\n').trim(),
      provider: 'openai-vision-rendered-pdf',
      pageCount: rendered.pages.length,
      truncated: rendered.truncated,
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Scan-PDF OCR fehlgeschlagen',
    }
  }
}
