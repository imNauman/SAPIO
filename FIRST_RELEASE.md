# SAPIO — First Release Runbook

This is the exact sequence to ship SAPIO's **first** Android release. It assumes
the backend and Supabase are already live (see `DEPLOYMENT.md` and
`SUPABASE.md`) and the production checklist (`PRODUCTION_CHECKLIST.md`) is
mostly done.

---

## 1. What YOU must do (developer)

- Create the Expo, Google Play, and Firebase accounts.
- Fill in real environment values (Supabase keys, API URL, Firebase creds).
- Add the four PNG assets to `mobile/assets/`.
- Run the build and submit commands below.
- Create the Google Play listing (text, screenshots, privacy policy).

## 2. What Copilot / automation CANNOT do

- 🔴 Create your Expo / Google / Firebase accounts (needs a human + payment).
- 🔴 Generate the binary PNG icon/splash assets (brand decisions).
- 🔴 Click "Publish" in the Google Play Console (requires human acceptance of
  the Developer Program Policies).
- 🔴 Sign legal documents or set up the merchant account for payments.
- Everything else (config, docs, build commands, deploy scripts) is prepared
  for you in this repo.

## 3. Generate the Android APK (internal testing)

```bash
cd mobile
eas build --platform android --profile preview
```

Download the `.apk` from the build URL and install it on test phones (see
`ANDROID_RELEASE.md` §9). Use this to dogfood the app before store submission.

## 4. Generate the Android AAB (Google Play)

```bash
cd mobile
eas build --platform android --profile production
```

This produces the `.aab` Google Play requires.

## 5. Install the APK on a phone

See `ANDROID_RELEASE.md` §9 — transfer the APK, allow unknown sources, install.
Great for quick QA without waiting on Play review.

## 6. Publish to Google Play Internal Testing

```bash
eas submit --platform android --profile production
```

- Requires `android-service-account.json` in the repo root (from Play Console →
  API access). See `ANDROID_RELEASE.md` §10.
- Uploads the AAB to the **internal** track.
- In Play Console → **Internal testing**, add tester email addresses, then share
  the testing link. Testers install from the Play Store (internal track).

## 7. Move from Internal Testing → Production

1. **Internal testing** — small team, fast iterations.
2. **Closed testing** (optional) — larger invite-only group, required before
   production for some categories.
3. **Open testing** (optional) — public beta via Play Store.
4. **Production** — in Play Console, promote the release from the testing track
   to **Production**. Fill in the store listing (description, graphics, privacy
   policy, content rating) and submit for review.
5. Google reviews (typically hours–days). On approval, the app is live.

> After the first production release, future updates just repeat steps 3–4 and
> promote the new AAB. Bump `version` in `mobile/app.json` and `versionCode`
> (increment by 1) for each release so Play accepts the upload.

---

## Release command cheat-sheet

```bash
# 1. Build & ship
cd mobile
eas build -p android --profile preview     # APK for testers
eas build -p android --profile production  # AAB for Play
eas submit -p android --profile production # upload AAB to internal track

# 2. Backend (if changed)
cd /var/www/sapio
git pull && npm install && npm run build:backend && pm2 restart sapio-backend
```

## Post-launch

- Watch `/health/ready` and PM2 logs for the first 24h.
- Monitor Supabase usage (connections, storage) against plan limits.
- Keep `PRODUCTION_CHECKLIST.md` updated as new features land.
