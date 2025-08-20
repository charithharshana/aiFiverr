# Icons

This directory contains the extension icons in both SVG and PNG formats:

- `icon16.svg` / `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.svg` / `icon48.png` - 48x48 pixels (extension management page)
- `icon128.svg` / `icon128.png` - 128x128 pixels (Chrome Web Store)

## Current Design

The icons feature a modern chat bubble design with:
- **Colors**: Fiverr brand gradient (#1dbf73 to #19a463)
- **Symbol**: Chat bubble with three dots (indicating AI conversation)
- **AI Indicator**: Orange dot in the top-right corner
- **Style**: Clean, modern, professional

## Converting SVG to PNG

To convert the SVG files to PNG format:

1. **Online Tools**: Use online converters like:
   - https://convertio.co/svg-png/
   - https://cloudconvert.com/svg-to-png
   - https://www.freeconvert.com/svg-to-png

2. **Design Tools**: Open SVG files in:
   - Adobe Illustrator/Photoshop
   - Figma
   - Canva
   - GIMP (free)

3. **Command Line**: Use tools like:
   - ImageMagick: `convert icon16.svg icon16.png`
   - Inkscape: `inkscape --export-png=icon16.png icon16.svg`

## Design Guidelines

- **Style**: Modern chat-based design
- **Colors**: Fiverr brand gradient (#1dbf73 to #19a463)
- **Symbol**: Chat bubble with AI conversation dots
- **Background**: Transparent with subtle shadow
- **Contrast**: High contrast for visibility at all sizes

## Usage

The PNG files are referenced in `manifest.json` and should be created from the SVG sources when needed.
