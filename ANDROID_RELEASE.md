# SAPIO — Android Release Preparation

This document is written for a developer who has **never published an Android
app before**. Follow it top-to-bottom. Nothing here changes app code — it only
packages and ships what already exists.

> Prerequisites on your machine: Node.js 18+, the SAPIO repo cloned, and the
> four PNG assets present in `mobile/assets/` (see `mobile/assets/README.md`).
> You do NOT need Android Studio installed — EAS builds in the cloud.

---

## 1. Create an Expo account

1. Go to https://expo.dev/signup and sign up (or use your GitHub account).
2. Verify your email.

## 2. Install EAS CLI

```bash
npm install -g eas-cli
eas --version   # confirm it installed
```

## 3. Log in

```bash
eas login
```

A browser window opens — approve the login. The CLI now has a token stored
locally.

## 4. Initialize EAS (link the project)

From the `mobile/` folder:

```bash
cd mobile
eas init
```

- It creates/updates `eas.json` (already present in this repo) and registers a
  project on Expo's servers.
- It writes a `projectId` into `app.json` under `extra.eas.projectId`. **Replace
  the placeholder `00000000-0000-0000-0000-000000000000` in `app.json` with the
  real ID `eas init` prints.**

## 5. Generate the Android keystore (let Expo manage it)

You do **not** need to create a keystore yourself. Expo's "EAS Managed
Credentials" generates and stores it securely:

```bash
eas credentials
```

- Choose **Android** → **Production** → **Keystore**.
- Select **"Generate a new keystore"** and let EAS keep it. Expo encrypts and
  stores it; you can download a backup later from the Expo website
  (Project → Credentials). This is the recommended, safest path for first-time
  publishers — you can't lose the key.

> ⚠️ If you ever generate your OWN keystore instead, **back it up forever**.
> Google Play will reject updates signed with a different key. Managed keys
> avoid this trap.

## 6. Build an Android AAB (for Google Play)

```bash
eas build --platform android --profile production
```

- First build compiles in the cloud (~10–20 min). Status shows in terminal and
  at https://expo.dev/.
- Output: an **AAB** (Android App Bundle) — the format Google Play requires.

## 7. Build an APK (for internal testing)

```bash
eas build --platform android --profile preview
```

- Produces a **standalone APK** you can share directly (no Play Store needed).
- Use this for sharing with testers via email / Slack / QR code.

## 8. Download build artifacts

- From the terminal: the build prints a URL when done.
- Or open https://expo.dev/ → your project → **Builds** → download the artifact.
- APKs can be installed directly; AABs must go through Google Play.

## 9. Install the APK on a phone

1. Transfer the `.apk` to the phone (email, USB, or download from the build
   URL).
2. On the phone, open the file. If prompted, allow "Install from unknown
   sources" for the app you're using (Settings → Apps → special access).
3. Tap **Install**. The SAPIO icon appears on the home screen.

## 10. Submit the AAB to Google Play Console

### One-time Play Console setup
1. Go to https://play.google.com/console and create a developer account
   (one-time $25 fee).
2. Create an **application** (give it the name "SAPIO").
3. In **Setup → API access**, create a **service account** and download the
   JSON key. Save it as `android-service-account.json` in the repo root
   (it is git-ignored).

### Submit
```bash
eas submit --platform android --profile production
```

- EAS reads `android-service-account.json` and uploads the AAB to the
  **internal** track (set in `eas.json` → `submit.production.android.track`).
- In Play Console, promote the release from **Internal testing** → **Closed
  testing** → **Production** when ready (see `FIRST_RELEASE.md`).

---

## Quick reference

| Goal                | Command                                      |
| ------------------- | -------------------------------------------- |
| Login               | `eas login`                                  |
| Link project        | `eas init`                                   |
| Build AAB (Play)    | `eas build -p android --profile production`  |
| Build APK (testers) | `eas build -p android --profile preview`     |
| Submit to Play      | `eas submit -p android --profile production` |

> Never run `eas build` with `--profile development` for release — that builds a
> debug client, not a shippable app.
