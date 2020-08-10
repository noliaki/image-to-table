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
      context.fillStyle = '#f00'
      context.fillRect(0, 0, $canvas.current.width, $canvas.current.height)
      context.drawImage(img, 0, 0)

      const tree = createTableTree(
        context.getImageData(
          0,
          0,
          $canvas.current.width,
          $canvas.current.height
        )
      )

      console.log(tree)

      tree.forEach((item) => {
        context.fillStyle = item.type === 'space' ? '#f009' : '#0af9'
        context.fillRect(0, item.index, $canvas.current.width, item.height)
      })
    },
    [$canvas]
  )

  reader.addEventListener('load', onLoad)

  return (
    <div className="container">
      <input
        type="file"
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
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

const ImageMode = {
  Space: 'space',
  Image: 'image',
} as const

type ImageMode = typeof ImageMode[keyof typeof ImageMode]

type Cell = {
  x: number
  y: number
  width: number
  height: number
  type: ImageMode
}

function createTableTree(imageData: ImageData): any[] {
  console.log(imageData)
  const data: Uint8ClampedArray = imageData.data

  const len: number = data.length / 4 / imageData.width

  let startIndex = 0

  const tree = []

  for (let i = 0; i < len; i++) {
    const start: number = i * imageData.width * 4
    const rows: Uint8ClampedArray = data.slice(
      start,
      start + imageData.width * 4
    )

    const isEmptyRow: boolean = isEmpty(rows)

    if (i === 0) {
      tree.push({
        type: isEmptyRow ? ImageMode.Space : ImageMode.Image,
        width: imageData.width,
        index: i,
      })

      continue
    }

    const prevItem = tree[tree.length - 1]

    if (i === len - 1) {
      if (isEmptyRow && prevItem.type === ImageMode.Space) {
        prevItem.height = i - startIndex
      } else {
        tree.push({
          type: ImageMode.Image,
          width: imageData.width,
          height: i - startIndex,
          index: i,
        })
      }

      continue
    }

    if (isEmptyRow) {
      if (prevItem.type === ImageMode.Space) {
        continue
      }

      tree.push({
        type: ImageMode.Space,
        width: imageData.width,
        index: i,
      })
    } else {
      if (prevItem.type === ImageMode.Image) {
        continue
      }

      tree.push({
        type: ImageMode.Image,
        width: imageData.width,
        index: i,
      })
    }

    prevItem.height = i - startIndex
    startIndex = i
  }

  return tree
}

function isEmpty(rows: Uint8ClampedArray): boolean {
  for (let j = 0; j < rows.length; j += 4) {
    if (
      rows[j + 0] !== 255 ||
      rows[j + 1] !== 255 ||
      rows[j + 2] !== 255 ||
      rows[j + 3] !== 255
    ) {
      return false
    }
  }

  return true
}
