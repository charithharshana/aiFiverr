# Convert SVG Icons to PNG

The extension needs PNG files for Chrome. Here are the easiest ways to convert the SVG files:

## Method 1: Online Converter (Recommended)
1. Go to https://convertio.co/svg-png/
2. Upload `icon16.svg`, `icon48.svg`, `icon128.svg`
3. Download the converted PNG files
4. Rename them to `icon16.png`, `icon48.png`, `icon128.png`

## Method 2: Using Figma (Free)
1. Open https://figma.com
2. Create new file
3. Import each SVG file
4. Export as PNG at the correct size (16px, 48px, 128px)

## Method 3: Command Line (If you have tools installed)
```bash
# Using ImageMagick
convert icon16.svg icon16.png
convert icon48.svg icon48.png
convert icon128.svg icon128.png

# Using Inkscape
inkscape --export-png=icon16.png icon16.svg
inkscape --export-png=icon48.png icon48.svg
inkscape --export-png=icon128.png icon128.svg
```

## Temporary Workaround
If you need to test the extension immediately, you can:
1. Create simple colored squares in any image editor
2. Save as PNG files with the correct names
3. Use Fiverr green color: #1dbf73

The SVG files contain the proper design and should be converted when you have time.
