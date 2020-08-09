import React, { useCallback, useRef, useState } from 'react'

export default function Input(): JSX.Element {
  const reader: FileReader = new window.FileReader()

  const $canvas: React.MutableRefObject<HTMLCanvasElement> = useRef<
    HTMLCanvasElement
  >()

  const getContext: () => CanvasRenderingContext2D = useCallback(
    () => $canvas.current.getContext('2d'),
    [$canvas]
  )

  const onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      reader.readAsDataURL(
        (event.nativeEvent?.target as HTMLInputElement)?.files?.[0]
      )
    },
    [$canvas]
  )

  const onLoad = useCallback(
    async (event): Promise<void> => {
      const imgSrc: string = event.target.result
      const img: HTMLImageElement = await loadImg(imgSrc)
      const context: CanvasRenderingContext2D = getContext()
      $canvas.current.width = img.naturalWidth
      $canvas.current.height = img.naturalHeight
      context.drawImage(img, 0, 0)

      console.log(
        context.getImageData(
          0,
          0,
          $canvas.current.width,
          $canvas.current.height
        )
      )
    },
    [$canvas]
  )

  reader.addEventListener('load', onLoad)

  return (
    <div className="container">
      <input
        type="file"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChange(event)
        }
      />
      <canvas ref={$canvas}></canvas>
    </div>
  )
}

function loadImg(imgSrc: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject): void => {
    const img: HTMLImageElement = new window.Image()

    img.addEventListener('load', (): void => resolve(img), {
      once: true,
    })

    img.addEventListener('error', (event: ErrorEvent): void => reject(event))

    img.src = imgSrc
  })
}
