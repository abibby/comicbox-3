import { decode } from 'blurhash'
import { h } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

export type BlurHashProps = {
    blurHash: string
    class?: string
}

export function BlurHash({ blurHash, class: className }: BlurHashProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) {
            return
        }
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            return
        }
        const pixels = decode(blurHash, 32, 32)
        const imageData = ctx.createImageData(32, 32)
        imageData.data.set(pixels)
        ctx.putImageData(imageData, 0, 0)
    }, [blurHash])
    return <canvas ref={canvasRef} class={className} width={32} height={32} />
}
