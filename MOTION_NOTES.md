# MOTION NOTES & AUDIT REPORT

## 1. Fonts Used
- **Google Fonts** (`index.html`): `Inter` (weights 400, 500, 600), `Geist` (weight 600), and `Material Symbols Outlined`.
- **Tailwind Config** (`tailwind.config.js`): Maps design system fonts like `telemetry-metric`, `label-lg`, `body-md` back to standard font families (`Inter`, `system-ui`, etc.).

## 2. Theme Colours
- **Defined In**: `tailwind.config.js` under `theme.extend.colors`.
- **Key Names**: `primary` (`#002210`), `primary-container` (`#143823`), `secondary` (`#006d38`), `tertiary` (`#001654`), `background` (`#faf8ff`), etc.
- **Motion Constraint**: The rule specifically requires overriding with `#143823` (dark green), `#1F8A4D` (green), `#1D4ED8` (blue), and `#0F172A` (navy).

## 3. Page Inventory Selectors
*(All rendered within `src/pages/DashboardRaw.jsx`)*
- **Top banner, nav**: `header` / `header nav`
- **Console button**: `a[href="#console"]`
- **Field dropdown**: `#farm-selector`
- **Hero with Watch demo**: `main > section.pt-8`
- **Live satellite map & HUD**: `div:has(> .leaflet-container)` or the `#val-moisture` HUD cards.
- **Field boundaries and survey**: `h2#features` section.
- **Zone cards**: Section containing `zones.map`.
- **Soil and water**: Section with text "Live HUD telemetry and soil data".
- **More insights cards**: Section with text "More insights".
- **Micro-weather**: `section #weather` / "Advanced micro-weather".
- **Yield prediction**: Section containing the Recharts `<ResponsiveContainer>`.
- **Seven-day action plan**: Section with text "Field Action Plan".
- **4 Steps**: `section#how-it-works` containing "4 Steps to Precision Agriculture".
- **Cross-field table**: `section#insights` table.
- **Final call to action**: `section#console`.
- **Footer**: `footer`.

## 4. Specific Elements & Files
- **Header logo asset**: `terra-orbit-logo.png` (`<img>` tag in `App.jsx` or `DashboardRaw.jsx` header).
- **Hero headline**: `h1` in the top section of `DashboardRaw.jsx`.
- **Hero description**: `p` tag below the `h1`.
- **Hero buttons**: `button` containing "Watch demo".
- **Hero visual (Map)**: `<MapContainer>` inside the hero layout.
- **Watch demo modal**: Conditionally rendered `div.fixed.z-50` triggered by `showTour` state.
- **Weather day strip**: `<div className="flex items-stretch gap-3 min-w-[980px]">`.
- **Weather detail panel**: The `div` beneath the weather strip.
- **Yield chart container**: `<ResponsiveContainer>` rendering a Recharts `<ComposedChart>`.
- **Seven-day plan rows**: Mapped `<AccordionRow>` or conditional `div` blocks based on `expandedDay`.
- **Cross-field table**: `table` in the `#insights` section.

## 5. React Re-Render Behavior (Field Selection)
When `#farm-selector` changes, the `selectedFieldId` in `FieldContext` updates.
- The `useFieldEndpoint` hooks trigger API fetches.
- **Data Updates**: React updates the text nodes and numeric values in-place (no unmounting).
- **Map**: The `<MapController>` component uses `useEffect` to call `map.fitBounds()`, animating the camera pan without destroying the map instance.
- **Charts/Components**: Recharts and the weather strips animate their internal transitions in-place.

## 6. Installed Animation Tools
- **Framer Motion**: `import { motion, AnimatePresence } from 'framer-motion'` is already installed and in use.
- **CSS Transitions**: Heavy use of `transition-all`, `hover:`, and `group-hover:`.
- **Recharts & Leaflet**: Both have built-in SVG and WebGL animations.

## 7. Reduced Motion Check
- Modern browsers and OS expose `@media (prefers-reduced-motion: reduce)`. In JS, this is readable via `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. Since this is a browser setting, our motion tokens (`src/motion/tokens.js`) must respect this flag if we write custom Web Animations API scripts.

## 8. Attachment Point for New Motion
- **Entry File**: `src/pages/DashboardRaw.jsx`.
- **Attachment Point**: We should create a new component `src/motion/MotionController.jsx` that simply mounts a `useEffect` to bind vanilla DOM animations. We can import and mount `<MotionController />` inside the root `<main>` of `DashboardRaw.jsx`, which keeps the attachment minimal (one line).

## Git Checkpoint
*(Note: `git` is not installed on this Windows environment, so a standard git commit cannot be made. I have taken note of the pristine, fully-functioning state of the application as the "checkpoint" before proceeding with Stage 1).*
