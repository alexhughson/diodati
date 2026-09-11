import AppKit

if CommandLine.arguments.count < 3 {
  fputs("usage: punch-black-bg.swift <source> <dest.png>\n", stderr)
  exit(1)
}

let sourcePath = CommandLine.arguments[1]
let destPath = CommandLine.arguments[2]
guard let source = NSImage(contentsOfFile: sourcePath) else {
  fputs("failed to load \(sourcePath)\n", stderr)
  exit(1)
}

let width = Int(source.size.width)
let height = Int(source.size.height)
guard let rep = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: width,
  pixelsHigh: height,
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: width * 4,
  bitsPerPixel: 32
) else {
  fputs("failed to create bitmap\n", stderr)
  exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
source.draw(in: NSRect(x: 0, y: 0, width: width, height: height))
NSGraphicsContext.restoreGraphicsState()

guard let data = rep.bitmapData else {
  fputs("bitmap has no data\n", stderr)
  exit(1)
}

func pixel(_ x: Int, _ y: Int) -> (Int, Int, Int, Int) {
  let i = (y * width + x) * 4
  return (Int(data[i]), Int(data[i + 1]), Int(data[i + 2]), Int(data[i + 3]))
}

func setClear(_ x: Int, _ y: Int) {
  let i = (y * width + x) * 4
  data[i] = 0
  data[i + 1] = 0
  data[i + 2] = 0
  data[i + 3] = 0
}

let seed = pixel(0, 0)
func isBackground(_ x: Int, _ y: Int) -> Bool {
  let p = pixel(x, y)
  if p.3 == 0 {
    return false
  }
  let dr = p.0 - seed.0
  let dg = p.1 - seed.1
  let db = p.2 - seed.2
  return dr * dr + dg * dg + db * db <= 22 * 22
}

var seen = [Bool](repeating: false, count: width * height)
var queue: [(Int, Int)] = []
func enqueue(_ x: Int, _ y: Int) {
  if x < 0 || y < 0 || x >= width || y >= height {
    return
  }
  let idx = y * width + x
  if seen[idx] {
    return
  }
  if !isBackground(x, y) {
    return
  }
  seen[idx] = true
  queue.append((x, y))
}

for x in 0 ..< width {
  enqueue(x, 0)
  enqueue(x, height - 1)
}
for y in 0 ..< height {
  enqueue(0, y)
  enqueue(width - 1, y)
}

var head = 0
while head < queue.count {
  let (x, y) = queue[head]
  head += 1
  setClear(x, y)
  enqueue(x + 1, y)
  enqueue(x - 1, y)
  enqueue(x, y + 1)
  enqueue(x, y - 1)
}

guard let png = rep.representation(using: .png, properties: [:]) else {
  fputs("failed to encode png\n", stderr)
  exit(1)
}
try png.write(to: URL(fileURLWithPath: destPath))
