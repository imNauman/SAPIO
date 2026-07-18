# SAPIO Mobile Assets

> **ACTION REQUIRED BEFORE ANY PRODUCTION BUILD**
>
> `app.json` references the following binary image assets. They are **NOT**
> included in this repository (binaries are git-ignored / out of scope for the
> code audit). You must add real PNG files at these exact paths before running
> `eas build`, or the build will fail:

| File                        | Purpose                                  | Recommended size        |
| --------------------------- | ---------------------------------------- | ----------------------- |
| `./assets/icon.png`         | App icon (all platforms)                 | 1024 × 1024 px, no alpha |
| `./assets/splash.png`       | Splash screen                            | 1242 × 2436 px (or SVG)  |
| `./assets/adaptive-icon.png`| Android adaptive foreground icon         | 1024 × 1024 px, alpha    |
| `./assets/notification-icon.png` | Android status-bar notification icon | 96 × 96 px, alpha, white |

Generate these from your brand kit (e.g. via Figma export or
`npx @expo/vector-icons` tooling). Once present, delete this README if you like
— it only exists to document the missing binaries.

This file previously contained a React component stub; that was removed because
Expo expects a real image at `./assets/splash.png`, not a `.tsx` module.

