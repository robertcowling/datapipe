# Impact Intelligence Platform Style Guide

This document defines the visual identity, UI components, and design patterns for the Impact Intelligence Platform. Adhering to these guidelines ensures a consistent "Agentic/Professional" look and feel across the application.

---

## 🎨 Color Palette

The application uses a "Google Flat / Material" inspired palette with high-contrast functional colors.

### Core Brand Colors
| Name | Hex | Usage |
| :--- | :--- | :--- |
| **Primary (Slate)** | `#334155` | Secondary actions, headers |
| **Secondary (Deep Navy)** | `#0f172a` | Primary actions, branding, severe states |
| **Background Deep** | `#f8fafc` | Main workspace background |
| **Surface/Card** | `#ffffff` | Panels, cards, modal backgrounds |
| **Border Color** | `#e0e0e0` | Subtle separation between elements |

### Severity Scale (Blue Ramp)
Used for map overlays and severity indicators.
- **Minor:** `#dbeafe` (Light Blue)
- **Significant:** `#2563eb` (Royal Blue)
- **Severe:** `#0f172a` (Deep Navy)

### Intelligence Categories (De-saturated)
Specific colors assigned to data sources for quick recognition.
- **Roads:** `#446b82`
- **Railways:** `#5b61a1`
- **Social:** `#4e828a`
- **News:** `#8a4e6b`
- **Energy:** `#8a7d4e`
- **Water:** `#4e6b8a`
- **Proxy:** `#64748b`
- **EA Help:** `#4e8a6b`

### Agentic Accents
Used for AI-driven features and "Agentic" UI elements.
- **Gradient:** `linear-gradient(135deg, #6366f1, #d946ef)`
- **Glow:** `drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))`

---

## Typography

- **Primary Font:** `'Outfit', sans-serif`
- **Weights:**
  - `300`: Light (Sub-headings, metadata)
  - `400`: Regular (Body text)
  - `600`: Semi-Bold (Buttons, interactive elements)
  - `700`: Bold (Section headers, logos)
  - `800`: Extra-Bold (Impact numbers, alerts)

### Sizing
- **H1:** `1.25rem` (Header Title)
- **Standard UI:** `0.9rem` - `0.95rem` (Body, form inputs)
- **Labels/Metadata:** `0.6rem` - `0.8rem` (Sidebar labels, timestamps)

---

## 🍱 Component Design Patterns

### 1. Glassmorphism & Elevation
Panels and overlays should use the `.glass` style:
- **Background:** `rgba(255, 255, 255, 0.8)` or `#ffffff`
- **Blur:** `backdrop-filter: blur(12px) saturate(180%)`
- **Shadow:** `0 1px 2px 0 rgba(60,64,67,0.302), 0 1px 3px 1px rgba(60,64,67,0.149)`
- **Border:** `1px solid var(--border-color)`

### 2. Buttons
- **Action Primary:** Pill-shaped (`border-radius: 10px`), `#0f172a` background, white text.
- **Nav Items:** Ghost style with subtle borders (`1px solid #e0e0e0`), hover state slightly lifts and adds shadow.
- **Agentic Button:** Uses the purple/indigo gradient text or background to signify AI capability.

### 3. Sidebar Sections
- **Layout:** Vertical list of sections.
- **Headers:** All-caps or Bold `0.65rem` labels with `letter-spacing: 0.08em`.
- **Toggles:** Slider-style switches (`28px` width, `16px` height) using `e2e8f0` for OFF and `var(--clr-primary)` for ON.

### 4. Interactive Feed Cards
- **Border:** `1px solid var(--border-color)`
- **Hover:** Slight translateX (`4px`) and background shift to `#f8fafc`.
- **Pills:** Rounded badges for category and confidence (`high`, `medium`, `low`).

---

## 🗺️ Mapping Standards

- **Basemap:** Light, minimal theme (Greyscale or high-contrast white).
- **Controls:** Custom white buttons with 1px borders, 8px border-radius, positioned at `top right`.
- **Legend:** Minimalist glass box in the bottom right corner showing the blue severity ramp.

---

## 🎞️ Animation & Interaction
- **Transitions:** Global use of `all 0.2s ease`.
- **Modals:** Slide down/fade in animation (`@keyframes slideDown`).
- **Pulse:** Used for "Live" indicators or AI processing states (`livePulseAni`).

---

## 🛠️ Implementation Hints for Agents
- Always use CSS variables defined in `:root`.
- Prefer `SVG` for icons (Lucide-style, stroke-width `2` or `2.5`).
- Ensure all scrollable areas use a clean, thin scrollbar that matches the UI palette.
- Workspace is a `flex` layout with `overflow: hidden` to provide a "desktop application" feel.
