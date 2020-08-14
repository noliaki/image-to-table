import React, { useCallback, useRef, useState } from 'react'
import ReactDOMServer from 'react-dom/server'

const defaultStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  border: 'none',
}

const tableStyle: React.CSSProperties = Object.assign({}, defaultStyle, {
  borderSpacing: 0,
  borderCollapse: 'collapse',
})

const tdStyle: React.CSSProperties = Object.assign({}, defaultStyle)

const imgStyle: React.CSSProperties = Object.assign({}, defaultStyle, {
  lineHeight: 0,
  display: 'block',
})

const spacerGifSrc =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export default function Input(): JSX.Element {
  const [tableEl, setTableEl] = useState(null)
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

      tree.forEach((item: Cell): void => {
        // context.fillStyle = item.type === ImageType.Space ? '#0af9' : '#fa09'
        // context.fillRect(0, item.y, item.width, item.height)

        if (item.type === ImageType.Space) {
          context.fillStyle = '#0af9'
          context.fillRect(0, item.y, item.width, item.height)
        } else {
          item.rows?.forEach((colCell) => {
            context.fillStyle =
              colCell.type === ImageType.Space ? '#0ff9' : '#fa09'
            context.fillRect(
              colCell.x,
              colCell.y,
              colCell.width,
              colCell.height
            )
          })
        }
      })

      setTableEl(createTable(tree, img))
    },
    [$canvas]
  )

  const createTable = useCallback(
    (tree: Cell[], img: HTMLImageElement): JSX.Element => {
      return (
        <table
          style={Object.assign({}, tableStyle, {
            width: img.naturalWidth,
            height: img.naturalHeight,
          })}
        >
          <tbody>
            {tree.map((item: Cell, index: number) => {
              if (item.type === ImageType.Space) {
                return (
                  <tr key={'image-' + index}>
                    <td width={item.width} height={item.height} style={tdStyle}>
                      <img
                        src={spacerGifSrc}
                        alt=""
                        style={Object.assign({}, imgStyle, {
                          width: item.width,
                          height: item.height,
                        })}
                      />
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={'image-' + index}>
                  <td style={tdStyle}>
                    <table
                      style={Object.assign({}, tableStyle, {
                        width: item.width,
                        height: item.height,
                      })}
                    >
                      <tbody>
                        <tr>
                          {item.rows?.map(
                            (cell: Cell, colIndex: number): JSX.Element => {
                              const canvas = document.createElement('canvas')
                              const context = canvas.getContext('2d')

                              canvas.width = cell.width
                              canvas.height = cell.height

                              context.drawImage(
                                img,
                                cell.x,
                                cell.y,
                                cell.width,
                                cell.height,
                                0,
                                0,
                                cell.width,
                                cell.height
                              )

                              return (
                                <td
                                  key={
                                    'image-' + index + 'col-image-' + colIndex
                                  }
                                  width={cell.width}
                                  height={cell.height}
                                  style={Object.assign({}, tdStyle, {
                                    width: cell.width,
                                    height: cell.height,
                                  })}
                                >
                                  <img
                                    src={canvas.toDataURL()}
                                    width={cell.width}
                                    height={cell.height}
                                    style={Object.assign({}, imgStyle, {
                                      width: cell.width,
                                      height: cell.height,
                                    })}
                                    alt=""
                                  />
                                </td>
                              )
                            }
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )
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
      {tableEl}
      <pre>
        <code>{ReactDOMServer.renderToStaticMarkup(tableEl)}</code>
      </pre>
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

const ImageType = {
  Space: 'space',
  Image: 'image',
} as const

type ImageType = typeof ImageType[keyof typeof ImageType]

type Cell = {
  x: number
  y: number
  width: number
  height: number
  type: ImageType
  rows?: Cell[]
}

function createTableTree(imageData: ImageData): any[] {
  console.log(imageData)
  const data: Uint8ClampedArray = imageData.data

  const len: number = data.length / 4 / imageData.width

  let startIndex = 0

  const tree: Cell[] = []

  for (let i = 0; i < len; i++) {
    const start: number = i * imageData.width * 4
    const rows: Uint8ClampedArray = data.slice(
      start,
      start + imageData.width * 4
    )

    const isEmptyRow: boolean = isEmpty(rows)

    if (i === 0) {
      tree.push({
        type: isEmptyRow ? ImageType.Space : ImageType.Image,
        width: imageData.width,
        height: 0,
        x: 0,
        y: i,
      })

      continue
    }

    const prevItem = tree[tree.length - 1]

    if (i === len - 1) {
      if (isEmptyRow && prevItem.type === ImageType.Space) {
        prevItem.height = i - startIndex
        prevItem.rows = createRow(prevItem, imageData)
      } else {
        tree.push({
          type: ImageType.Image,
          width: imageData.width,
          height: i - startIndex,
          x: 0,
          y: i,
        })
      }

      continue
    }

    if (isEmptyRow) {
      if (prevItem.type === ImageType.Space) {
        continue
      }

      tree.push({
        type: ImageType.Space,
        width: imageData.width,
        height: 0,
        x: 0,
        y: i,
      })
    } else {
      if (prevItem.type === ImageType.Image) {
        continue
      }

      tree.push({
        type: ImageType.Image,
        width: imageData.width,
        height: 0,
        x: 0,
        y: i,
      })
    }

    prevItem.height = i - startIndex
    prevItem.rows = createRow(prevItem, imageData)
    startIndex = i
  }

  return tree
}

function isEmpty(rows: Uint8ClampedArray | number[]): boolean {
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

function createRow(item: Cell, imageData: ImageData): Cell[] {
  const start = item.y * 4 * imageData.width
  const end = start + item.height * 4 * imageData.width
  const blockData: Uint8ClampedArray = imageData.data.slice(start, end)

  const rowData: Cell[] = []
  let startIndex = 0

  for (let i = 0; i < imageData.width; i++) {
    const cols = []

    for (let j = 0; j < item.height; j++) {
      const sIndex = imageData.width * 4 * j + i * 4
      cols.push(blockData[sIndex + 0])
      cols.push(blockData[sIndex + 1])
      cols.push(blockData[sIndex + 2])
      cols.push(blockData[sIndex + 3])
    }

    const isEmptyRow: boolean = isEmpty(cols)

    if (i === 0) {
      rowData.push({
        type: isEmptyRow ? ImageType.Space : ImageType.Image,
        width: 0,
        height: item.height,
        x: i,
        y: item.y,
      })

      continue
    }

    const prevItem = rowData[rowData.length - 1]

    if (i === imageData.width - 1) {
      if (isEmptyRow) {
        if (prevItem.type === ImageType.Space) {
          prevItem.width = i - startIndex + 1
        } else {
          rowData.push({
            type: ImageType.Space,
            width: i - startIndex + 1,
            height: item.height,
            x: i,
            y: item.y,
          })
        }
      } else {
        if (prevItem.type === ImageType.Image) {
          prevItem.width = i - startIndex + 1
        } else {
          rowData.push({
            type: ImageType.Image,
            width: i - startIndex + 1,
            height: item.height,
            x: i,
            y: item.y,
          })
        }
      }

      continue
    }

    if (isEmptyRow) {
      if (prevItem.type === ImageType.Space) {
        continue
      }

      rowData.push({
        type: ImageType.Space,
        width: 0,
        height: item.height,
        x: i,
        y: item.y,
      })
    } else {
      if (prevItem.type === ImageType.Image) {
        continue
      }

      rowData.push({
        type: ImageType.Image,
        width: 0,
        height: item.height,
        x: i,
        y: item.y,
      })
    }

    prevItem.width = i - startIndex
    startIndex = i
  }

  return rowData
}
