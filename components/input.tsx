import React, { useCallback, useRef, useState } from 'react'
import ReactDOMServer from 'react-dom/server'
import { html } from 'js-beautify'

const beautifyOptions: HTMLBeautifyOptions = {
  indent_size: 2,
  end_with_newline: true,
  preserve_newlines: false,
  max_preserve_newlines: 0,
  wrap_line_length: 0,
  wrap_attributes_indent_size: 0,
  unformatted: ['b', 'em'],
}

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
        if (item.type === ImageType.Space) {
          context.fillStyle = '#0af9'
          context.fillRect(0, item.y, item.width, item.height)
        } else {
          item.rows?.forEach((colCell) => {
            context.fillStyle =
              colCell.type === ImageType.Space ? '#0af9' : '#fa09'
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
          <tbody>{createRows(tree, img)}</tbody>
        </table>
      )
    },
    [$canvas]
  )

  reader.addEventListener('load', onLoad)

  const code: string = html(
    ReactDOMServer.renderToStaticMarkup(tableEl),
    beautifyOptions
  )

  return (
    <div className="container">
      <input type="file" onChange={onChange} />
      <canvas ref={$canvas}></canvas>
      {tableEl}
      <pre>
        <code>{code}</code>
      </pre>
      <div>
        <textarea value={code} readOnly></textarea>
      </div>
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

function createRows(rows: Cell[], img: HTMLImageElement): JSX.Element[] {
  return rows.map(
    (cell: Cell, index: number): JSX.Element => {
      const key = `row-${index}`

      if (cell.type === ImageType.Space) {
        return (
          <tr key={key}>
            <td width={cell.width} height={cell.height} style={tdStyle}>
              <img
                src={spacerGifSrc}
                alt=""
                style={Object.assign({}, imgStyle, {
                  width: cell.width,
                  height: cell.height,
                })}
              />
            </td>
          </tr>
        )
      }

      return (
        <tr key={key}>
          <td>
            <table>
              <tbody>
                <tr>{createCols(cell.rows, img, index)}</tr>
              </tbody>
            </table>
          </td>
        </tr>
      )
    }
  )
}

function createCols(
  cols: Cell[],
  img: HTMLImageElement,
  rowIndex: number
): JSX.Element[] {
  return cols.map(
    (cell: Cell, index: number): JSX.Element => {
      const key = `row-${rowIndex}:col-${index}`

      if (cell.type === ImageType.Space) {
        return (
          <td
            key={key}
            width={cell.width}
            height={cell.height}
            style={Object.assign({}, tdStyle, {
              width: cell.width,
              height: cell.height,
            })}
          >
            <img
              src={spacerGifSrc}
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
          key={key}
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
  )
}
