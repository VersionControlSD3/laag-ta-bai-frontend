import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderPage } from '@/test/render'
import ScanPage from './ScanPage'

function createMockStream() {
  const stop = vi.fn()
  const stream = {
    getTracks: () => [{ stop }],
  } as unknown as MediaStream
  return { stream, stop }
}

function stubMediaDevices(getUserMedia: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('navigator', {
    ...navigator,
    mediaDevices: { getUserMedia },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ScanPage', () => {
  it('starts the rear live camera, switches cameras, and stops tracks on unmount', async () => {
    const rear = createMockStream()
    const front = createMockStream()
    const getUserMedia = vi.fn().mockResolvedValueOnce(rear.stream).mockResolvedValueOnce(front.stream)
    stubMediaDevices(getUserMedia)
    mockFetch(() => ({ data: [] }))

    const { unmount } = renderPage(<ScanPage />, '/scan')

    expect(await screen.findByText('Live Camera')).toBeInTheDocument()
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Switch camera' }))
    await waitFor(() =>
      expect(getUserMedia).toHaveBeenNthCalledWith(2, {
        video: { facingMode: { ideal: 'user' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      }),
    )
    expect(rear.stop).toHaveBeenCalledTimes(1)

    unmount()
    expect(front.stop).toHaveBeenCalledTimes(1)
  })

  it('falls back to generic video constraints if ideal constraints fail', async () => {
    const fallback = createMockStream()
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new Error('OverconstrainedError'))
      .mockResolvedValueOnce(fallback.stream)
    stubMediaDevices(getUserMedia)
    mockFetch(() => ({ data: [] }))

    renderPage(<ScanPage />, '/scan')

    expect(await screen.findByText('Live Camera')).toBeInTheDocument()
    expect(getUserMedia).toHaveBeenNthCalledWith(2, { video: true, audio: false })
  })

  it('degrades cleanly when camera permission is denied and allows native capture/upload', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    stubMediaDevices(getUserMedia)
    mockFetch(() => ({ data: [] }))

    renderPage(<ScanPage />, '/scan')

    expect(
      await screen.findByText('Built-in camera unavailable — upload a photo or pick a Cebu spot below.'),
    ).toBeInTheDocument()

    const cameraInput = screen.getByTestId('camera-input') as HTMLInputElement
    const clickSpy = vi.spyOn(cameraInput, 'click')
    await userEvent.click(screen.getByRole('button', { name: 'Take photo' }))
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('captures a live video frame on Take photo and returns to Live camera in one tap', async () => {
    const first = createMockStream()
    const second = createMockStream()
    const getUserMedia = vi.fn().mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream)
    stubMediaDevices(getUserMedia)
    mockFetch((url) => {
      if (url.pathname.includes('/scan')) {
        return { data: { status: 'unrecognized', confidence: 0.1, landmark: null, candidates: [] } }
      }
      return { data: [] }
    })

    // Mock createImageBitmap (valid 1280x720) and URL object methods
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1280, height: 720, close: vi.fn() }))
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-capture')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    // Mock canvas 2d context & toBlob
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => {
      cb(new Blob(['jpeg-bytes'], { type: 'image/jpeg' }))
    })

    renderPage(<ScanPage />, '/scan')
    expect(await screen.findByText('Live Camera')).toBeInTheDocument()

    const video = screen.getByLabelText('Live camera viewfinder')
    Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true })
    Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true })

    fireEvent.click(screen.getByRole('button', { name: 'Take photo' }))

    expect(await screen.findByAltText('Your photo')).toBeInTheDocument()
    expect(drawImage).toHaveBeenCalledTimes(1)
    expect(first.stop).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/couldn't recognize this landmark/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Return to live camera' }))
    expect(await screen.findByText('Live Camera')).toBeInTheDocument()
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })
})
