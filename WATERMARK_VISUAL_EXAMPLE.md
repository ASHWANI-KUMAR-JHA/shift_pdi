# 🎨 Watermark Feature - Visual Example

## Before and After

### Without Watermark
```
┌─────────────────────────────────────────────────┐
│  [SUNFEED LOGO]      Corporate Office Details  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Date: 08 October 2026                          │
│                                                 │
│  To,                                            │
│  The Manager                                    │
│  ABC Company Ltd.                               │
│                                                 │
│  Plot 123, Industrial Area                      │
│  Gurugram, Haryana - 122001                     │
│                                                 │
│  Subject: Warranty Confirmation Letter          │
│                                                 │
│  Dear Sir/Madam,                                │
│                                                 │
│  This is to confirm that your solar panel       │
│  system installed at the above mentioned        │
│  address is covered under our comprehensive     │
│  warranty program...                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### With Watermark (15% Opacity, Center Position)
```
┌─────────────────────────────────────────────────┐
│  [SUNFEED LOGO]      Corporate Office Details  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Date: 08 October 2026            ╭─────────╮  │
│                                   │         │  │
│  To,                              │ COMPANY │  │
│  The Manager                      │  LOGO   │  │
│  ABC Company Ltd.                 │ (faded) │  │
│                                   │         │  │
│  Plot 123, Industrial Area         ╰─────────╯  │
│  Gurugram, Haryana - 122001                     │
│                                                 │
│  Subject: Warranty Confirmation Letter          │
│                                                 │
│  Dear Sir/Madam,                                │
│                                                 │
│  This is to confirm that your solar panel       │
│  system installed at the above mentioned        │
│  address is covered under our comprehensive     │
│  warranty program...                            │
│                                                 │
└─────────────────────────────────────────────────┘
```
*Note: Watermark is semi-transparent (15%) so text remains fully readable*

---

## UI Layout

### Full Application View
```
┌───────────────────────────────────────────────────────────────────┐
│ ← Back    🌟 Letter Generator                          Logout →  │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────────────────────┐  ┌──────────────────────────────┐   │
│ │ LEFT COLUMN             │  │ RIGHT COLUMN                 │   │
│ │ (Editor & Controls)     │  │ (Live Preview)               │   │
│ │                         │  │                              │   │
│ │ ┌─────────────────────┐ │  │ ┌──────────────────────────┐ │   │
│ │ │ 📄 Template         │ │  │ │ 📄 Preview  [Export PDF] │ │   │
│ │ ├─────────────────────┤ │  │ ├──────────────────────────┤ │   │
│ │ │ - Load Template     │ │  │ │                          │ │   │
│ │ │ - Template Name     │ │  │ │  [HEADER]                │ │   │
│ │ │ - Subject           │ │  │ │                          │ │   │
│ │ │ - Body              │ │  │ │     [WATERMARK]          │ │   │
│ │ └─────────────────────┘ │  │ │                          │ │   │
│ │                         │  │ │  Date: ...               │ │   │
│ │ ┌─────────────────────┐ │  │ │  To: ...                 │ │   │
│ │ │ 📋 Letter Details   │ │  │ │  Subject: ...            │ │   │
│ │ ├─────────────────────┤ │  │ │  Body: ...               │ │   │
│ │ │ - Date              │ │  │ │                          │ │   │
│ │ │ - To                │ │  │ │                          │ │   │
│ │ │ - Address           │ │  │ └──────────────────────────┘ │   │
│ │ └─────────────────────┘ │  │                              │   │
│ │                         │  └──────────────────────────────┘   │
│ │ ┌─────────────────────┐ │                                    │
│ │ │ 📝 Fill Variables   │ │                                    │
│ │ ├─────────────────────┤ │                                    │
│ │ │ - Variable 1        │ │                                    │
│ │ │ - Variable 2        │ │                                    │
│ │ └─────────────────────┘ │                                    │
│ │                         │                                    │
│ │ ┌─────────────────────┐ │  ← NEW WATERMARK PANEL            │
│ │ │ 🖼️ Watermark  [✖]   │ │                                    │
│ │ ├─────────────────────┤ │                                    │
│ │ │ logo.png            │ │                                    │
│ │ │                     │ │                                    │
│ │ │ Size (30%)          │ │                                    │
│ │ │ [======|==========] │ │                                    │
│ │ │                     │ │                                    │
│ │ │ Opacity (15%)       │ │                                    │
│ │ │ [==|=============] │ │                                    │
│ │ │                     │ │                                    │
│ │ │ [📌 Fix Position]   │ │                                    │
│ │ │                     │ │                                    │
│ │ │ 💡 Drag in preview  │ │                                    │
│ │ │                     │ │                                    │
│ │ │ [📤 Change Image]   │ │                                    │
│ │ └─────────────────────┘ │                                    │
│ └─────────────────────────┘                                    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Watermark State Indicator

### Draggable State (Not Fixed)
```
┌─────────────────────┐
│  ╔═════════════╗    │  ← Blue border indicates draggable
│  ║             ║    │
│  ║   COMPANY   ║    │
│  ║    LOGO     ║    │  Cursor: ↔ (move cursor)
│  ║   (faded)   ║    │
│  ║             ║    │
│  ╚═════════════╝    │
└─────────────────────┘
```

### Fixed State
```
┌─────────────────────┐
│    ╭─────────╮      │  ← No border, cannot drag
│    │         │      │
│    │ COMPANY │      │
│    │  LOGO   │      │  Cursor: → (default cursor)
│    │ (faded) │      │
│    │         │      │
│    ╰─────────╯      │
└─────────────────────┘
```

---

## Watermark Panel States

### State 1: No Watermark
```
┌─────────────────────────────┐
│ 🖼️ Watermark                │
├─────────────────────────────┤
│                             │
│ No watermark added yet.     │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📤 Upload Watermark     │ │
│ │    Image                │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

### State 2: Watermark Added (Unfixed)
```
┌─────────────────────────────┐
│ 🖼️ Watermark         [✖]   │
├─────────────────────────────┤
│                             │
│ company-logo.png            │
│                             │
│ Size (30% of page width)    │
│ [==========|==============] │
│                             │
│ Opacity (15%)               │
│ [===|====================] │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📌 Fix Position         │ │
│ │ (drag in preview first) │ │
│ └─────────────────────────┘ │
│                             │
│ 💡 Drag watermark in the    │
│    preview to position it   │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📤 Change Image         │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

### State 3: Watermark Fixed
```
┌─────────────────────────────┐
│ 🖼️ Watermark         [✖]   │
├─────────────────────────────┤
│                             │
│ company-logo.png            │
│                             │
│ Size (30% of page width)    │
│ [==========|==============] │
│                             │
│ Opacity (15%)               │
│ [===|====================] │
│                             │
│ ┌─────────────────────────┐ │
│ │ ✓ Position Fixed        │ │  ← Changed!
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📤 Change Image         │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

---

## Opacity Comparison

### 5% Opacity (Very Subtle)
```
┌────────────────────────────────┐
│ Subject: Important Notice      │
│                                │
│ Dear Customer,          ░░     │  ← Barely visible
│                         ░░     │
│ This letter confirms... ░░     │
│                         ░░     │
└────────────────────────────────┘
```

### 15% Opacity (Recommended)
```
┌────────────────────────────────┐
│ Subject: Important Notice      │
│                                │
│ Dear Customer,         ▒▒▒     │  ← Visible but text clear
│                        ▒▒▒     │
│ This letter confirms...▒▒▒     │
│                        ▒▒▒     │
└────────────────────────────────┘
```

### 50% Opacity (Too Dark)
```
┌────────────────────────────────┐
│ Subject: Important Notice      │
│                                │
│ Dear Customer,        ████     │  ← Text hard to read!
│                       ████     │
│ This letter confirms..████     │
│                       ████     │
└────────────────────────────────┘
```

---

## Size Comparison

### 15% Size (Small)
```
┌────────────────────────────────┐
│                                │
│ Dear Customer,                 │
│                         ▒      │  ← Small logo
│ This letter confirms...        │
│                                │
└────────────────────────────────┘
```

### 30% Size (Recommended)
```
┌────────────────────────────────┐
│                                │
│ Dear Customer,          ▒▒▒    │
│                         ▒▒▒    │  ← Good balance
│ This letter confirms... ▒▒▒    │
│                                │
└────────────────────────────────┘
```

### 60% Size (Large)
```
┌────────────────────────────────┐
│                    ▒▒▒▒▒▒▒▒    │
│ Dear Customer,     ▒▒▒▒▒▒▒▒    │  ← Dominates page
│                    ▒▒▒▒▒▒▒▒    │
│ This letter ...    ▒▒▒▒▒▒▒▒    │
│                                │
└────────────────────────────────┘
```

---

## Common Positioning Examples

### Center (Default)
```
┌────────────────────────────────┐
│ [HEADER]                       │
│                                │
│ Date: ...                      │
│ To: ...          ▒▒▒           │  ← Center
│ Subject: ...     ▒▒▒           │
│                  ▒▒▒           │
│ Body text...                   │
│                                │
│ [FOOTER]                       │
└────────────────────────────────┘
```

### Top Right
```
┌────────────────────────────────┐
│ [HEADER]              ▒▒▒      │  ← Top right
│                       ▒▒▒      │
│ Date: ...                      │
│ To: ...                        │
│ Subject: ...                   │
│                                │
│ Body text...                   │
│                                │
│ [FOOTER]                       │
└────────────────────────────────┘
```

### Bottom Center
```
┌────────────────────────────────┐
│ [HEADER]                       │
│                                │
│ Date: ...                      │
│ To: ...                        │
│ Subject: ...                   │
│                                │
│ Body text...                   │
│                  ▒▒▒           │  ← Bottom center
│ [FOOTER]                       │
└────────────────────────────────┘
```

### Diagonal (Future: needs rotation)
```
┌────────────────────────────────┐
│ [HEADER]     ▒                 │
│            ▒                   │
│ Date: ... ▒                    │
│ To: ...  ▒                     │  ← Diagonal
│ Subject:▒                      │  (Not yet implemented)
│        ▒                       │
│ Body  ▒xt...                   │
│     ▒                          │
│ [FOOTER]                       │
└────────────────────────────────┘
```

---

## PDF Output Example

### Page 1 with Watermark
```
╔═════════════════════════════════════════╗
║ SUNFEED LOGO           Corporate Office ║
║                                         ║
║ Date: 08 October 2026     ╭──────╮     ║
║                           │      │     ║
║ To,                       │WATER │     ║
║ The Manager               │MARK  │     ║
║ ABC Company Ltd.          │      │     ║
║                            ╰──────╯     ║
║ Subject: Warranty Confirmation          ║
║                                         ║
║ Dear Sir/Madam,                         ║
║                                         ║
║ Body text continues...                  ║
║                                         ║
║ ─────────────────────────────────────── ║
║ web: www.sunfeedindia.com | Contact ... ║
╚═════════════════════════════════════════╝
```

### Page 2 with Same Watermark
```
╔═════════════════════════════════════════╗
║ SUNFEED LOGO           Corporate Office ║
║                                         ║
║                           ╭──────╮     ║
║                           │      │     ║
║ ...continued from page 1  │WATER │     ║
║                           │MARK  │     ║
║ More body text here...    │      │     ║
║                            ╰──────╯     ║
║                                         ║
║ Best regards,                           ║
║ Sunfeed Team                            ║
║                                         ║
║                                         ║
║ ─────────────────────────────────────── ║
║ web: www.sunfeedindia.com | Contact ... ║
╚═════════════════════════════════════════╝
```

---

## Slider Controls Visual

### Size Slider
```
Size (30% of page width)
│
▼
10%                    50%                   80%
├──────────┬─────────────────────────────────┤
│          ●                                 │
└──────────────────────────────────────────-┘
           ▲
       Current: 30%
```

### Opacity Slider
```
Opacity (15%)
│
▼
0%                     50%                  100%
├─────┬──────────────────────────────────────┤
│     ●                                      │
└────────────────────────────────────────────┘
      ▲
  Current: 15%
  (Recommended range: 10-20%)
```

---

## Interactive States

### Hover on Draggable Watermark
```
Before hover:              After hover:
┌──────────┐              ┌──────────┐
│  LOGO    │              │  LOGO    │
│  (thin   │      →       │  (thick  │  ← Border highlights
│  border) │              │  border) │
└──────────┘              └──────────┘
```

### Dragging Watermark
```
1. MouseDown           2. Dragging              3. MouseUp
┌──────────┐          ┌──────────┐             ┌──────────┐
│  LOGO    │          │  LOGO    │  ↗          │  LOGO    │
│  (grab   │    →     │  (move   │      →      │  (new    │
│  cursor) │          │  cursor) │             │  pos)    │
└──────────┘          └──────────┘             └──────────┘
  Click                 Drag                    Release
```

---

## Button States

### Fix Position Button

**State 1: Unfixed**
```
┌──────────────────────────┐
│ 📌 Fix Position          │  ← Blue/Primary button
│ (drag in preview first)  │
└──────────────────────────┘
```

**State 2: Fixed**
```
┌──────────────────────────┐
│ ✓ Position Fixed         │  ← Gray/Default button
└──────────────────────────┘
```

### Upload/Change Button

**When no watermark:**
```
┌──────────────────────────┐
│ 📤 Upload Watermark      │  ← Blue/Primary button
│    Image                 │
└──────────────────────────┘
```

**When watermark exists:**
```
┌──────────────────────────┐
│ 📤 Change Image          │  ← Gray/Default button
└──────────────────────────┘
```

---

## 🎓 Visual Learning Summary

1. **Upload** → Watermark appears in preview
2. **Drag** → Position it where you want
3. **Sliders** → Adjust size and opacity
4. **Fix** → Lock it in place
5. **Export** → PDF includes watermark on all pages
6. **Save** → JSON export preserves everything

**Result**: Professional branded letters with customizable watermarks! 🎉
