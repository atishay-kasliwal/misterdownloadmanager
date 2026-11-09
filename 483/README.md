# PR 483: video button focus

These images show the actual content script on a local player, with a generated video.
The browser extension API is stubbed only to allow the panel and supply its existing
German/Arabic messages. Focus, pointer input and fullscreen use real Chromium behavior.
Each image is taken after 3.1 seconds without pointer movement. No personal pages or app data.

Main: 1e4ae5881bddd1c96e39e14b8f4eb28703fcd732
Fix: 430b4593ae82b0e72159178242709d51f3b464ce

The local adapter calls the exported videoFocus() case from tools/extension/e2e.mjs.
To reproduce, install Playwright outside the repository and its Chromium browser, then
run from the PR checkout (port 8101 must be free):

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright STAGE=fixed node /path/to/browser-test.cjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright SOURCE_REF=origin/main STAGE=baseline node /path/to/browser-test.cjs
```

The baseline exits 1 at the mouse-idle assertion. The fixed run exits 0. Set BROWSER=chrome
to use installed Google Chrome on macOS. Firefox was attempted but failed to launch its
profile before any test ran. The full native-message/app harness was not run locally.

The real harness case is `node tools/extension/e2e.mjs chrome --only=videoFocus` after its
normal app, host, lab-server build and extension-pack setup.
