---
name: android-setup
description: One-time Android dev environment setup for Ferrico (SDK, NDK pin, env vars, Rust targets, emulator). Use when setting up or debugging an Android toolchain, NDK/cc cross-compile failures, or an emulator that renders the app blank.
---

# Android setup (one-time)

**macOS** (Android Studio → SDK Manager → install **Android SDK**, and under SDK Tools
the **NDK (Side by side)**), then add to `~/.zshrc`:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls $ANDROID_HOME/ndk | tail -1)"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
```

**Linux** — same Android Studio SDK Manager install, different default path
(`$HOME/Android/Sdk` instead of `~/Library/Android/sdk`). Steps:

1. Android Studio → SDK Manager → install **Android SDK Platform**, **Android SDK
   Command-line Tools**, **Android SDK Platform-Tools**, and under **SDK Tools** the
   **NDK (Side by side)** — pin a stable r26+ release (e.g. `27.3.13750724`); avoid the
   newest rc/beta line unless you've verified it against `rusqlite`'s bundled-SQLite `cc`
   cross-compile, the classic Android toolchain failure mode. Command-line equivalent:
   ```bash
   sdkmanager --install "ndk;27.3.13750724" "platforms;android-35" \
     "system-images;android-35;google_apis;x86_64" "emulator"
   ```
2. Add to `~/.bashrc` (adjust the NDK version to whatever you installed):
   ```bash
   export ANDROID_HOME="$HOME/Android/Sdk"
   export NDK_HOME="$ANDROID_HOME/ndk/27.3.13750724"
   export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"   # any JDK 17+ works
   export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
   ```
   Open a new shell (or `source ~/.bashrc`) and confirm: `echo $ANDROID_HOME $NDK_HOME`
   resolve to real paths, and `sdkmanager`/`adb`/`emulator` are on `PATH`.
3. `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`
4. Create an emulator with a **recent API level** — a stale Android System WebView can't
   render Tailwind 4's modern CSS (`oklch`, `@property`; needs Chromium ≥ ~111). API 35
   `google_apis x86_64` is a safe pick; `pixel_5` is the newest built-in device profile in
   the command-line tools (no `pixel_6`+ profile shipped there as of this writing):
   ```bash
   avdmanager create avd -n ferrico_dev -k "system-images;android-35;google_apis;x86_64" -d pixel_5
   emulator -avd ferrico_dev -no-window -no-audio -no-boot-anim &   # headless boot
   adb devices   # wait for "device" (not "offline") — first boot takes a minute or two
   ```
   A real device with USB debugging enabled works just as well — `adb devices` should
   list it once plugged in and authorized.
5. Run `bun run android:init` once, then `bun run android:dev`.
