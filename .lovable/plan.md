## Goal

Replace the two CDN-proxied Chalio images (`/__l5e/assets-v1/...`) with real binary files committed under `public/`, so the repo works when cloned locally. Update every reference (splash / login / home header via `BrandLockup`, plus favicon).

## Current state (verified)

- CDN pointers exist at:
  - `src/assets/chalio-icon.png.asset.json`
  - `src/assets/chalio-wordmark.png.asset.json`
- Only one component reads them: `src/components/chalio/BrandLockup.tsx` (imports both `.asset.json` files and uses `.url`). Splash (`src/routes/index.tsx`), Login, and Home header all render through `BrandLockup`, so a single component edit covers all three screens.
- Favicon: `src/routes/__root.tsx` currently points to `/favicon.ico` (default Lovable icon in `public/favicon.ico`). Not yet branded.

## Steps

1. **Download the two binaries from the CDN into `public/`** using `curl` against the current preview origin, saving as:
   - `public/chalio-icon.png`
   - `public/chalio-wordmark.png`

   These files will be committed to git as real bytes (not pointers), so `git clone` works standalone.

2. **Rewrite `src/components/chalio/BrandLockup.tsx`** to drop the `.asset.json` imports and reference the public paths directly:
   ```tsx
   <img src="/chalio-icon.png" ... />
   <img src="/chalio-wordmark.png" ... />
   ```

3. **Brand the favicon.** Replace the default `public/favicon.ico` reference in `src/routes/__root.tsx` with `/chalio-icon.png` (PNG favicon), and delete `public/favicon.ico` so no stale Lovable icon is served.

4. **Delete the now-unused CDN pointer files** so the repo doesn't carry dead references:
   - `src/assets/chalio-icon.png.asset.json`
   - `src/assets/chalio-wordmark.png.asset.json`

   (The CDN objects themselves are left alone — deleting them would break previously published deploys. They just stop being referenced.)

5. **Verify:** confirm the build succeeds and visually check splash/login/home still show the icon + wordmark, and the browser tab shows the Chalio favicon.

## Notes / trade-offs

- This intentionally goes against Lovable's default (CDN-externalized binaries keep the repo lightweight). You're accepting slightly larger repo size in exchange for portability outside Lovable — which is exactly what you asked for.
- Only the two logo files are un-externalized. Any future images you add will still default to the CDN unless you ask for the same treatment.
- No backend, DB, or auth changes.
