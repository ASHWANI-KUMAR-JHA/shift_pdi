# Watermark Feature for Letter Generator

## Overview
A comprehensive watermark feature has been added to the Letter Generator that allows users to add, position, resize, and adjust the transparency of company watermarks on letters.

## Features Implemented

### 1. **Upload Watermark Image**
- Users can upload any image file (PNG, JPG, etc.) as a watermark
- Support for transparent PNG images for professional watermarks
- File is stored as base64 in the letter's JSON export

### 2. **Drag & Drop Positioning**
- **Click and drag** the watermark in the live preview to position it anywhere on the page
- Real-time visual feedback while dragging
- Position is stored as percentage coordinates (responsive to different page sizes)
- Visual indicator (border) shows when watermark is draggable

### 3. **Resizable Watermark**
- Slider control to adjust watermark size (10% - 80% of page width)
- Real-time size adjustment in preview
- Current size percentage displayed next to slider

### 4. **Opacity/Transparency Control**
- Slider to adjust opacity from 0% (invisible) to 100% (fully opaque)
- Recommended: 10-20% for subtle watermarks that don't interfere with text readability
- Real-time opacity adjustment in preview
- Current opacity percentage displayed next to slider

### 5. **Fix Position Feature**
- **"Fix Position"** button locks the watermark in place
- Once fixed:
  - Watermark cannot be dragged accidentally
  - Visual indicator (border) is removed
  - Button changes to show "Position Fixed" with checkmark
- Can be unfixed by clicking the button again to adjust position

### 6. **Z-Index Management**
- Watermark is positioned **behind all text content** (z-index: 0)
- Letter content is above watermark (z-index: 1)
- Ensures text is always readable over the watermark

### 7. **PDF Export Integration**
- Watermark is included in exported PDF files
- Position, size, and opacity are preserved in PDF
- Watermark appears on **all pages** of multi-page letters
- Uses PDF transparency (GState) for proper opacity rendering

### 8. **Save/Load with JSON Export**
- Watermark settings are saved when exporting letter as JSON
- Includes:
  - Image data (base64)
  - Position coordinates
  - Size percentage
  - Opacity value
  - Fixed state
- Loading a saved JSON restores the watermark exactly as configured

## User Interface

### Watermark Control Panel
Located in the left column after the "Fill Variables" panel:

```
┌─────────────────────────────────────┐
│ 🖼️ Watermark              [Remove] │
├─────────────────────────────────────┤
│ company-logo.png                    │
│                                     │
│ Size (30% of page width)            │
│ [========|=================]        │
│                                     │
│ Opacity (15%)                       │
│ [==|========================]       │
│                                     │
│ [📌 Fix Position]                   │
│ 💡 Drag in preview to position      │
│                                     │
│ [Upload] Change Image               │
└─────────────────────────────────────┘
```

### Preview Window
- Watermark appears behind letter content
- Can be dragged when not fixed (cursor shows "move")
- Visual border indicates draggable state
- Real-time updates as you adjust controls

## Usage Workflow

1. **Add Watermark**
   - Click "Upload Watermark Image" button
   - Select your company logo or watermark image
   - Image appears in preview at default position (center)

2. **Position Watermark**
   - Click and drag the watermark in the preview
   - Move it to desired location
   - Release mouse to drop

3. **Adjust Size**
   - Use the "Size" slider to make it larger/smaller
   - Preview updates in real-time

4. **Adjust Transparency**
   - Use the "Opacity" slider to adjust transparency
   - Recommended: 10-20% for subtle watermarks
   - 100% for fully opaque (not recommended for watermarks)

5. **Lock Position**
   - Click "Fix Position" when satisfied
   - Watermark is now locked and can't be moved accidentally
   - Border indicator disappears

6. **Export**
   - Click "Export PDF" - watermark is included
   - Click "Export" (JSON) - watermark settings are saved

## Technical Details

### State Management
```javascript
watermark: {
  enabled: boolean,      // Is watermark active?
  imageUrl: string,      // Base64 data URL of image
  imageName: string,     // Original filename
  position: {            // Position as percentages
    x: number,           // 0-100 (left to right)
    y: number            // 0-100 (top to bottom)
  },
  size: number,          // 10-80 (% of page width)
  opacity: number,       // 0-1 (0% to 100%)
  fixed: boolean         // Is position locked?
}
```

### Drag & Drop Implementation
- Uses native mouse events (mousedown, mousemove, mouseup)
- Calculates position relative to preview container
- Stores offset to prevent jump when dragging starts
- Updates position as percentage for responsive behavior

### PDF Integration
- Watermark image loaded as base64 data URL
- Converted to canvas then PNG for jsPDF
- Opacity applied using PDF GState
- Drawn on every page before content
- Position calculated from percentages to mm coordinates

## Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Drag & drop uses standard mouse events
- Range sliders (HTML5) supported in all modern browsers
- Base64 image encoding widely supported

## Future Enhancements (Optional)
- Multiple watermarks
- Rotation control
- Predefined watermark positions (corners, center)
- Watermark library/templates
- Image cropping/editing before applying
- Text-based watermarks (in addition to images)

## Tips for Best Results
1. **Use PNG with transparency** for cleanest look
2. **Keep opacity low** (10-20%) so text remains readable
3. **Test PDF export** to ensure watermark appears correctly
4. **Fix position** before sharing template to prevent accidental changes
5. **Size appropriately** - too large overwhelms the letter, too small is hard to see
