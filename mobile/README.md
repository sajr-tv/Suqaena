# SUQAENA mobile app

React Native / Expo app for Android and iOS. Uses the approved SUQAENA palette and locally bundled, resized storefront artwork. This is an initial collection-browsing app, not a production commerce release.

## Included

- Discover screen, searchable collections and designer-inspired looks
- Collection detail screens and saved favourites persisted on device
- Six GCC browsing regions, remembered on device (no delivery promise)
- Shopping bag empty state explaining that ordering is unavailable
- Accessible labels, safe areas, Android back navigation and branded app icon
- EAS preview APK and production build profiles

## Run

Requires Node 22.13 or newer and npm.

```sh
cd mobile
npm ci
npm start
```

Use a compatible Expo Go client or development build on a phone, Android emulator or iOS simulator. Web preview: `npm run web`. Checks: `npm run typecheck` and `npm run export`.

## Build and release

Authenticate to the project owner's Expo account, link this app with `eas init`, then run `eas build --platform android --profile preview` to produce an internal APK. Production Android/iOS builds use the production profile. The EAS CLI must be installed or invoked through npx eas-cli. Signing credentials, Apple/Google developer access and physical-device validation are still required. No store submission has been made.

## Remaining commerce work

The current website is a static storefront and has no product, account, order or inventory API. Do not treat collection artwork as purchasable SKUs. Build and connect a shared server-backed catalogue with confirmed SKU images, sizes, prices, stock and availability; then customer authentication, carts, orders, payments and shipping. Add account deletion and privacy disclosures with customer accounts. Activate COD per country only after courier collection/remittance agreements are confirmed. Region selection currently changes a local preference only.

Favourites contain collection IDs, not personal account data, and are local to the device. No credentials or payment data are collected. Uninstalling the app removes these preferences. All assets are bundled so the collection preview does not depend on a live network request.
