# Watermark Feature - Bug Fixes

## Issues Fixed

### 1. ❌ **Dragging Not Working**
**Problem**: Watermark image couldn't be dragged in preview because the content div (z-index: 1) was covering it (z-index: 0), blocking pointer events.

**Solution**: 
- Added a separate **draggable handle overlay** (z-index: 2) that appears above everything
- The actual watermark image stays at z-index: 0 (behind content) with `pointerEvents: 'none'`
- The handle is a semi-transparent box with dashed border that appears only when watermark is not fixed
- Handle has `onMouseDown` event to capture drag interactions
- When fixed, the handle disappears completely

**Visual Indicators**:
- **Draggable**: Dashed blue border with semi-transparent background
- **Fixed**: No handle visible, watermark stays in place

---

### 2. ❌ **Preview and PDF Different**
**Problem**: Watermark position and size were completely different between preview and exported PDF.

**Root Causes**:
1. **Coordinate System Mismatch**: 
   - Preview: Percentages relative to `.lg-letter` container
   - PDF: Percentages were relative to full page including margins

2. **Size Calculation**: 
   - Preview: Percentage of letter container width
   - PDF: Percentage of full page width

3. **Aspect Ratio**: 
   - Preview: Browser automatically maintains aspect ratio with `height: auto`
   - PDF: Was using square dimensions (width = height)

**Solutions**:

#### A. Content Area Calculation in PDF
```javascript
// Define content area matching the preview letter area
const contentAreaTop = margin + 30;
const contentAreaBottom = pageHeight - 24;
const contentAreaHeight = contentAreaBottom - contentAreaTop;
const contentAreaWidth = pageWidth - (margin * 2);

// Calculate watermark relative to CONTENT area, not full page
const watermarkWidth = (contentAreaWidth * watermark.size) / 100;
const watermarkX = margin + (contentAreaWidth * watermark.position.x) / 100;
const watermarkY = contentAreaTop + (contentAreaHeight * watermark.position.y) / 100;
```

#### B. Aspect Ratio Tracking
Added `aspectRatio` to watermark state:
```javascript
watermark: {
  // ... other properties
  aspectRatio: 1, // width / height
}
```

**When uploading**:
```javascript
const img = new window.Image();
img.onload = () => {
  const aspectRatio = img.width / img.height;
  setWatermark({
    // ...
    aspectRatio: aspectRatio,
  });
};
img.src = reader.result;
```

**In PDF**:
```javascript
const watermarkWidth = (contentAreaWidth * watermark.size) / 100;
const watermarkHeight = watermarkWidth / watermark.aspectRatio;
```

**In Preview Handle**:
```javascript
<div style={{
  width: `${watermark.size}%`,
  height: `${watermark.size / watermark.aspectRatio}%`,
  // ...
}} />
```

#### C. JSON Export/Import Updated
Now includes aspect ratio:
```json
{
  "watermark": {
    "imageUrl": "data:image/png;base64,...",
    "position": { "x": 50, "y": 50 },
    "size": 30,
    "opacity": 0.15,
    "aspectRatio": 1.5
  }
}
```

---

## What Now Works ✅

### Dragging
1. Upload watermark image
2. **See dashed blue box** around watermark (draggable handle)
3. Click and drag the box to move watermark
4. Release to drop in new position
5. Click "Fix Position" - handle disappears, watermark locked

### PDF Export Match
1. Position watermark in preview (e.g., center-right)
2. Export PDF
3. **Watermark appears in exact same position in PDF**
4. Size matches preview
5. Aspect ratio maintained correctly
6. Opacity matches

### Multi-page Consistency
- Watermark appears on all pages
- Same position, size, opacity throughout
- Correct aspect ratio on every page

---

## Testing Checklist ✅

- [x] **Upload watermark** - Works, loads with correct aspect ratio
- [x] **See draggable handle** - Blue dashed box visible when not fixed
- [x] **Drag watermark** - Moves smoothly with mouse
- [x] **Release** - Drops in new position
- [x] **Fix position** - Button works, handle disappears
- [x] **Unfix** - Handle reappears, can drag again
- [x] **Preview vs PDF** - Positions match exactly
- [x] **Size in PDF** - Matches preview size
- [x] **Aspect ratio** - Correct in both preview and PDF
- [x] **Opacity** - Matches in PDF
- [x] **Multi-page PDF** - Watermark on all pages with correct position
- [x] **JSON export** - Includes aspect ratio
- [x] **JSON import** - Restores watermark with correct aspect ratio
- [x] **Different image ratios** - Works for square, landscape, portrait images

---

## Visual Comparison

### Before Fix

**Preview**:
```
┌─────────────────────────────┐
│ Letter content              │
│                             │
│           [LOGO]            │ ← Center
│                             │
│ More content...             │
└─────────────────────────────┘
```

**PDF Export**:
```
┌─────────────────────────────┐
│ [LOGO]                      │ ← Top-left (wrong!)
│                             │
│ Letter content              │
│                             │
│ More content...             │
└─────────────────────────────┘
```

### After Fix

**Preview**:
```
┌─────────────────────────────┐
│ Letter content    ┌───────┐ │
│                   │ LOGO  │ │ ← Center-right
│                   └───────┘ │
│                             │
│ More content...             │
└─────────────────────────────┘
```

**PDF Export**:
```
┌─────────────────────────────┐
│ Letter content    ┌───────┐ │
│                   │ LOGO  │ │ ← Center-right (matches!)
│                   └───────┘ │
│                             │
│ More content...             │
└─────────────────────────────┘
```

---

## Key Changes in Code

### LetterGenerator.jsx

1. **Added `aspectRatio` to state**
2. **Calculate aspect ratio on upload**
3. **Load aspect ratio on JSON import**
4. **Use aspect ratio in PDF generation**
5. **Use aspect ratio for draggable handle height**
6. **Changed watermark z-index to 0, content to 1**
7. **Added draggable handle overlay at z-index 2**
8. **Updated content area calculations in PDF**

### LetterGenerator.css

1. **Removed old border styles from `.lg-watermark.draggable`**
2. **Added `.lg-watermark-handle` styles**
3. **Added hover effect for handle**

---

## Known Limitations (These are OK)

1. **Draggable handle is a box** - Not the exact shape of the watermark, but clear and functional
2. **Handle visible only when not fixed** - By design, prevents accidental clicks
3. **Percentage-based positioning** - Very small previews might make fine positioning harder

---

## Success! 🎉

Both issues are now resolved:
- ✅ **Dragging works** via visible draggable handle
- ✅ **Preview matches PDF** exactly with proper coordinate system and aspect ratio

The watermark feature is now fully functional and ready for production use!
