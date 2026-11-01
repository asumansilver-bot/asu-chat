# ASU-CHAT

A WhatsApp-style messaging app: accounts, one-to-one chats, groups, photos, emojis,
replies, read receipts (blue ticks), "typing…", online / last seen, and phone notifications.

```
asu-chat-app/
├── server/     The chat server (Node.js, no extra packages). Also serves the web version.
├── client/     The app screens (HTML/CSS/JS), shared by the web version and the Android app
├── android/    Android app project (builds the .apk)
├── render.yaml One-click hosting setup for Render.com
└── .github/workflows/build-apk.yml   Builds the .apk on GitHub for free
```

## 1. Put the server online (once)

Everyone's phone talks to one server, so it must be on the internet.

**Render.com (free):**
1. Upload this folder to a new GitHub repository.
2. On render.com: **New → Blueprint**, pick the repository. Render reads `render.yaml` and starts the server.
3. You get an address like `https://asu-chat-xxxx.onrender.com`. Open it in a browser: the web version of ASU-CHAT should appear.

> On Render's free plan the server sleeps after 15 minutes without visitors (the first message
> after that takes about 30 seconds), and saved chats are wiped whenever it restarts or redeploys.
> To keep chats for good, add a Render **Disk** (paid plan) mounted at `/data`
> and set the environment variable `DATA_DIR=/data`.

**Run it on your own computer instead (for testing):**
```
cd server
node server.js        # needs Node.js 18 or newer
```
Then open http://localhost:3000. Phones on the same Wi-Fi can use `http://<your-computer-IP>:3000`.

## 2. The Android app

Install `ASU-CHAT.apk` on the phone (allow "Install unknown apps" when Android asks).
On the sign-in screen tap **Change server** and enter your server address the first time.

To make the app open with your server already filled in, put the address in
`client/config.js`:
```js
window.ASU_DEFAULT_SERVER = "https://asu-chat-xxxx.onrender.com";
```
…then rebuild the APK.

### Rebuilding the APK

- **On GitHub (no setup):** push this folder to GitHub. The **Actions** tab runs
  "Build ASU-CHAT APK"; download the APK from the finished run's *Artifacts*.
- **On your computer:** install Android Studio, open the `android` folder, copy `client/` to
  `android/app/src/main/assets/www/`, then **Build → Build APK(s)**.

The APK is signed with Android's standard debug key so it installs directly. To publish on the
Google Play Store you need your own signing key (Android Studio: **Build → Generate Signed Bundle**).

## Good to know

- Messages are protected in transit by HTTPS when your server uses `https://`, but they are stored
  unencrypted on the server, so whoever runs the server can read them (unlike WhatsApp's
  end-to-end encryption).
- Notifications arrive while the app is open or recently in the background. Notifications when the
  app is fully closed would need Firebase Cloud Messaging (not included).
- Everyone with an account on your server can find each other by name or username.
