import AppKit

if CommandLine.arguments.count < 3 {
  fputs("usage: mask-mac-icon.swift <source.png> <dest.png>\n", stderr)
  exit(1)
}

let sourcePath = CommandLine.arguments[1]
let destPath = CommandLine.arguments[2]
guard let source = NSImage(contentsOfFile: sourcePath) else {
  fputs("failed to load \(sourcePath)\n", stderr)
  exit(1)
}

let size = CGFloat(1024)
let rect = NSRect(x: 0, y: 0, width: size, height: size)
let view = NSView(frame: rect)
view.wantsLayer = true
view.layer?.contents = source.cgImage(forProposedRect: nil, context: nil, hints: nil)
view.layer?.contentsGravity = .resize
view.layer?.cornerRadius = size * 0.2237
view.layer?.cornerCurve = .continuous
view.layer?.masksToBounds = true
view.layer?.backgroundColor = NSColor.clear.cgColor

guard let rep = view.bitmapImageRepForCachingDisplay(in: rect) else {
  fputs("failed to create bitmap\n", stderr)
  exit(1)
}
view.cacheDisplay(in: rect, to: rep)
guard let png = rep.representation(using: .png, properties: [:]) else {
  fputs("failed to encode png\n", stderr)
  exit(1)
}
try png.write(to: URL(fileURLWithPath: destPath))
