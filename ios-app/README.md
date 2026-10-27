# YNOT private iPhone beta — preparation

This is a **Capacitor iOS shell scaffold**, not a signed or submitted iOS app. The shell loads the live `https://ynotworld.app` experience. API keys and scraping integrations must stay server-side.

## Mac setup

1. Install Xcode, Xcode Command Line Tools, Node.js, and CocoaPods if required by your Xcode/Capacitor environment.
2. From `ios-app/`, run `npm install` and `npm run ios:add` once; then `npm run ios:open`.
3. In Xcode select the Apple Developer team, confirm the bundle identifier `app.ynotworld.ios`, configure signing, icons, camera/photo permission usage descriptions, universal links and Apple Pay if used.
4. Build on a physical iPhone; test login, Shopify search, Mood, Room camera scan, product pages, checkout, deep links, offline states, and permissions.
5. Archive and upload through Xcode/App Store Connect. Create a TestFlight internal group first; external testing requires beta review. Builds expire after 90 days.

## Release architecture

- Vercel hosts web UI and APIs; Shopify, Bright Data and Gemini credentials never ship in the binary.
- Web/backend updates appear when the webview refreshes; native plugin or binary changes require a new TestFlight build.
- Before external distribution, verify Apple's rules on remotely loaded functionality and minimum app functionality. A web-only wrapper may be rejected; add native camera, sharing, saved discoveries and other genuinely integrated capabilities.
- Add invite-only server authentication and an application-specific beta signup flow before sharing invitations. A TestFlight invitation alone is not a substitute for authorization.
- Ensure privacy policy, in-app account deletion, consent and legal rights to displayed product/video content.

## Not yet done

Native Xcode project generation, Apple signing, native plugin integration, private beta enrollment, TestFlight upload, and device testing require a Mac and Apple Developer access. No App Store submission is performed by this scaffold.
