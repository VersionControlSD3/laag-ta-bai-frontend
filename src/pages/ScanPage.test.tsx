import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { writeJson } from '@/lib/storage'
import { mockFetch, renderPage } from '@/test/render'
import ScanPage, { CAMERA_RATIONALE_KEY } from './ScanPage'

function createMockStream() {
  const stop = vi.fn()
  const listeners: Record<string, () => void> = {}
  const track = {
    stop,
    addEventListener: vi.fn((event: string, cb: () => void) => {
      listeners[event] = cb
    }),
    removeEventListener: vi.fn(),
  }
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream
  return { stream, stop, listeners }
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
  it('shows the camera rationale first, then starts the rear live camera, mirrors front camera, and stops tracks on unmount', async () => {
    const rear = createMockStream()
    const front = createMockStream()
    const getUserMedia = vi.fn().mockResolvedValueOnce(rear.stream).mockResolvedValueOnce(front.stream)
    stubMediaDevices(getUserMedia)
    mockFetch(() => ({ data: [] }))

    const { unmount } = renderPage(<ScanPage />, '/scan')

    // Does not call getUserMedia before the user taps Start camera.
    expect(screen.getByText(/Allow camera access to frame Cebu landmarks/i)).toBeInTheDocument()
    expect(getUserMedia).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    expect(await screen.findByText('Live Camera')).toBeInTheDocument()
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
    const video = screen.getByLabelText('Live camera viewfinder')
    expect(video).not.toHaveClass('-scale-x-100')

    await userEvent.click(screen.getByRole('button', { name: 'Switch camera' }))
    await waitFor(() =>
      expect(getUserMedia).toHaveBeenNthCalledWith(2, {
        video: { facingMode: { ideal: 'user' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      }),
    )
    expect(video).toHaveClass('-scale-x-100')
    expect(rear.stop).toHaveBeenCalledTimes(1)

    unmount()
    expect(front.stop).toHaveBeenCalledTimes(1)
  })

  it('falls back to generic video constraints on OverconstrainedError and handles mid-session track ended', async () => {
    writeJson(CAMERA_RATIONALE_KEY, true)
    const fallback = createMockStream()
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Constraints not satisfied', 'OverconstrainedError'))
      .mockResolvedValueOnce(fallback.stream)
    stubMediaDevices(getUserMedia)
    mockFetch(() => ({ data: [] }))

    renderPage(<ScanPage />, '/scan')

    expect(await screen.findByText('Live Camera')).toBeInTheDocument()
    expect(getUserMedia).toHaveBeenNthCalledWith(2, { video: true, audio: false })

    act(() => fallback.listeners.ended?.())
    expect(
      await screen.findByText('Built-in camera unavailable — upload a photo or pick a Cebu spot below.'),
    ).toBeInTheDocument()
  })

  it('does not retry getUserMedia when camera permission is denied (NotAllowedError) and falls back to native capture', async () => {
    writeJson(CAMERA_RATIONALE_KEY, true)
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'))
    stubMediaDevices(getUserMedia)
    mockFetch(() => ({ data: [] }))

    renderPage(<ScanPage />, '/scan')

    expect(
      await screen.findByText('Built-in camera unavailable — upload a photo or pick a Cebu spot below.'),
    ).toBeInTheDocument()
    expect(getUserMedia).toHaveBeenCalledTimes(1)

    const cameraInput = screen.getByTestId('camera-input') as HTMLInputElement
    const clickSpy = vi.spyOn(cameraInput, 'click')
    await userEvent.click(screen.getByRole('button', { name: 'Take photo' }))
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('falls back to native camera input when live video resolution is below 1280x720 (e.g. 640x480)', async () => {
    writeJson(CAMERA_RATIONALE_KEY, true)
    const stream = createMockStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream.stream)
    stubMediaDevices(getUserMedia)
    mockFetch(() => ({ data: [] }))

    renderPage(<ScanPage />, '/scan')
    expect(await screen.findByText('Live Camera')).toBeInTheDocument()

    const video = screen.getByLabelText('Live camera viewfinder')
    Object.defineProperty(video, 'videoWidth', { value: 640, configurable: true })
    Object.defineProperty(video, 'videoHeight', { value: 480, configurable: true })

    const cameraInput = screen.getByTestId('camera-input') as HTMLInputElement
    const clickSpy = vi.spyOn(cameraInput, 'click')
    await userEvent.click(screen.getByRole('button', { name: 'Take photo' }))

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('captures a 1280x720+ live video frame on Take photo and returns to Live camera in one tap', async () => {
    writeJson(CAMERA_RATIONALE_KEY, true)
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
