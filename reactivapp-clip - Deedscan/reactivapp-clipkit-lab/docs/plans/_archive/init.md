# ClipKitLab - App Clip Hackathon Starter Project

## Context

We're building a hackathon starter template for students to explore Apple App Clips. The project ("ClipKitLab") provides a unified SwiftUI App Clip with a URL-based router that dispatches to 7 challenge areas (Location, QR, NFC, Calendar, Live Events, Retail, AI). Students clone the repo, run a setup script, and immediately have a working App Clip they can customize and extend. Target audience is beginner iOS developers, so everything is heavily commented with working examples and mock data.

---

## File Tree

```
reactivapp-clipkit-hackathon/
├── project.yml                              # XcodeGen project spec (source of truth)
├── setup.sh                                 # One-command setup: installs XcodeGen, generates .xcodeproj, opens Xcode
├── .gitignore
├── README.md                                # Comprehensive getting-started guide
├── SUBMISSION.md                            # PR template + screencast instructions
│
├── ClipKitLab/                              # Host App target
│   ├── ClipKitLabApp.swift                  # @main - handles universal links, embeds clip
│   ├── ContentView.swift                    # Full app root (wraps shared views)
│   ├── Info.plist
│   ├── Assets.xcassets/                     # App icons, colors
│   └── Entitlements/
│       └── ClipKitLab.entitlements          # Associated Domains
│
├── ClipKitLabClip/                          # App Clip target
│   ├── ClipKitLabClipApp.swift              # @main - onContinueUserActivity -> router
│   ├── Info.plist                           # NSAppClip + ephemeral notifications + usage descriptions
│   ├── Assets.xcassets/
│   └── Entitlements/
│       └── ClipKitLabClip.entitlements      # Parent app ID, Associated Domains, App Clip capability
│
├── Shared/                                  # Shared between both targets
│   ├── Router/
│   │   ├── Experience.swift                 # Enum: .location, .qrCode, .nfc, .calendar, .liveEvent, .retail, .ai
│   │   └── InvocationRouter.swift           # URL -> Experience routing engine
│   │
│   ├── Services/
│   │   ├── NotificationManager.swift        # Local push scheduling (ephemeral, no server needed)
│   │   ├── LocationService.swift            # CLLocationManager + geofencing wrapper
│   │   ├── NFCService.swift                 # CoreNFC NDEF tag reading
│   │   ├── QRScannerService.swift           # AVFoundation camera QR scanning + simulator mock
│   │   ├── CalendarService.swift            # EventKit integration
│   │   ├── PaymentService.swift             # Apple Pay stub
│   │   ├── AIService.swift                  # Cloud AI client (Claude + OpenAI stubs with mock fallback)
│   │   ├── CoreMLService.swift              # On-device ML (Vision framework + CoreML model stub)
│   │   └── LiveActivityService.swift        # ActivityKit Live Activity manager
│   │
│   ├── Models/
│   │   ├── ClipInvocation.swift             # Parsed URL: experience + parameters
│   │   ├── LocationPin.swift                # Location data model
│   │   ├── Product.swift                    # Retail product model
│   │   ├── SportEvent.swift                 # Live event model
│   │   ├── CalendarEvent.swift              # Calendar event model
│   │   ├── AIRequest.swift                  # AI request/response models
│   │   └── MockData.swift                   # All mock data centralized
│   │
│   ├── Views/
│   │   ├── ExperienceContainerView.swift    # Common wrapper: header, back button, notification banner
│   │   ├── ExperiencePickerView.swift       # Grid of experience cards (default when no URL)
│   │   │
│   │   ├── Experiences/
│   │   │   ├── LocationExperienceView.swift     # Map + nearby pins + check-in + geofence demo
│   │   │   ├── QRCodeExperienceView.swift       # Camera scanner + parsed URL display + mock mode
│   │   │   ├── NFCExperienceView.swift          # Scan button + NDEF display + tag history + mock mode
│   │   │   ├── CalendarExperienceView.swift     # Event form + add-to-calendar + upcoming events
│   │   │   ├── LiveEventExperienceView.swift    # Score card + Live Activity + timer-driven updates
│   │   │   ├── RetailExperienceView.swift       # Product grid + cart + Apple Pay button
│   │   │   └── AIExperienceView.swift           # Cloud/On-Device toggle + prompt + response
│   │   │
│   │   └── Components/
│   │       ├── ExperienceCard.swift             # Card UI for picker grid
│   │       └── NotificationBanner.swift         # In-app notification toast
│   │
│   ├── ViewModels/
│   │   ├── LocationViewModel.swift
│   │   ├── QRCodeViewModel.swift
│   │   ├── NFCViewModel.swift
│   │   ├── CalendarViewModel.swift
│   │   ├── LiveEventViewModel.swift
│   │   ├── RetailViewModel.swift
│   │   └── AIViewModel.swift
│   │
│   └── Extensions/
│       ├── URL+QueryParameters.swift            # URL parsing helpers
│       └── Color+Theme.swift                    # Experience theme colors
│
├── ClipKitLabClipWidget/                    # Widget Extension for Live Activities
│   ├── ClipKitLabClipWidgetBundle.swift
│   ├── LiveActivityWidget.swift             # Lock Screen + Dynamic Island UI
│   ├── LiveActivityAttributes.swift         # ActivityAttributes definition
│   └── Info.plist
│
└── Tests/
    └── ClipKitLabTests/
        ├── InvocationRouterTests.swift
        └── NotificationManagerTests.swift
```

---

## Implementation Steps

### Step 1: Root config files
Create `project.yml` (XcodeGen), `setup.sh`, `.gitignore`

**project.yml** defines 4 targets:
- `ClipKitLab` (application) - sources: `ClipKitLab/` + `Shared/`, embeds clip target
- `ClipKitLabClip` (application.on-demand-install-capable) - sources: `ClipKitLabClip/` + `Shared/`, embeds widget
- `ClipKitLabClipWidget` (app-extension) - sources: `ClipKitLabClipWidget/` + select shared models
- `ClipKitLabTests` (bundle.unit-test) - sources: `Tests/` + `Shared/`

Key settings: iOS 16.0 deployment target, Swift 5.9, automatic signing, `_XCAppClipURL` env var for testing

**setup.sh**: Checks Xcode, installs Homebrew if needed, installs XcodeGen, runs `xcodegen generate`, opens project

### Step 2: Entitlements & Info.plist files
- `ClipKitLab.entitlements`: Associated Domains (`appclips:clipkitlab.example.com`)
- `ClipKitLabClip.entitlements`: Parent Application Identifiers, Associated Domains, App Clip capability
- `ClipKitLabClip/Info.plist`: NSAppClip dictionary with `NSAppClipRequestEphemeralUserNotification: true`, `NSAppClipRequestLocationConfirmation: true`, plus usage descriptions for Camera, Location, NFC, Calendars
- Asset catalogs with Contents.json for both targets

### Step 3: Router (Shared/Router/)
- `Experience.swift`: Enum with 7 cases, computed properties for title, SF Symbol icon, description, theme color
- `InvocationRouter.swift`: ObservableObject that parses `https://clipkitlab.example.com/experience/{type}?params` URLs from NSUserActivity, publishes `currentExperience` and `currentInvocation`
- `ClipInvocation.swift` model: experience + parameters dictionary + raw URL

### Step 4: Services (Shared/Services/)
- **NotificationManager**: Singleton wrapping UNUserNotificationCenter. `scheduleLocal(title:body:delay:)` and `scheduleLocal(title:body:date:)`. Ephemeral permission is auto-granted for App Clips - no prompt needed. Heavy comments explaining the 8-hour window.
- **LocationService**: CLLocationManager delegate wrapper. `requestLocation()`, `startMonitoringRegion()`, publishes `currentLocation` and `authorizationStatus`
- **NFCService**: CoreNFC `NFCNDEFReaderSession` wrapper. `startScanning()`, publishes `lastMessage`. Includes simulator check (NFC not available on sim) with mock data fallback
- **QRScannerService**: AVFoundation `AVCaptureSession` for QR scanning via `UIViewRepresentable`. Simulator mock mode that returns sample QR data
- **CalendarService**: EventKit `EKEventStore` wrapper. `requestAccess()`, `createEvent(title:startDate:endDate:)`, `fetchUpcomingEvents()`
- **PaymentService**: PKPaymentAuthorizationController stub. `canMakePayments()`, `startPayment(amount:description:)` with mock success flow
- **AIService**: Actor with `.claude` and `.openAI` providers. Real HTTP calls when API key provided, mock response when no key. Claude uses `/v1/messages`, OpenAI uses `/v1/chat/completions`
- **CoreMLService**: Vision framework text recognition + image classification (no model file needed!). Commented-out section for bundled CoreML model. Stub for on-demand model download
- **LiveActivityService**: ActivityKit wrapper for starting/updating/ending Live Activities

### Step 5: Models (Shared/Models/)
- `LocationPin`: id, name, coordinate, description, category
- `Product`: id, name, price, imageName, description
- `SportEvent`: id, homeTeam, awayTeam, homeScore, awayScore, period, timeRemaining
- `CalendarEvent`: id, title, startDate, endDate, location, notes
- `AIRequest`: prompt, provider, response model
- `MockData.swift`: Static arrays of sample data for all models, ready to use immediately

### Step 6: Views & ViewModels (Shared/Views/, Shared/ViewModels/)

**ExperiencePickerView**: 2-column grid of ExperienceCards. Tapping navigates via router. This is the default screen when no invocation URL.

**ExperienceContainerView**: Wraps each experience view with consistent header (title, icon, back button), notification banner area, and environment objects.

Each experience view + view model pair follows the same pattern:
- View observes ViewModel via `@StateObject`
- ViewModel calls Service methods, publishes state
- View shows working UI with mock data
- Heavy `// TODO: Students -` comments marking customization points
- Each has a "Send Test Notification" button demonstrating NotificationManager

**Key experience stubs:**
- **Location**: SwiftUI `Map` with annotation pins, location permission request, geofence registration demo
- **QR Code**: Camera preview (UIViewRepresentable), mock mode toggle for simulator, parsed URL display
- **NFC**: Big scan button, NDEF message display, history list, mock mode for simulator
- **Calendar**: DatePicker form, "Add to Calendar" button, upcoming events list
- **Live Event**: Score card with teams/scores, "Start Live Activity" button, timer-based mock score updates
- **Retail**: Product grid, detail sheet, cart counter badge, Apple Pay button
- **AI**: Segmented control (Cloud/On-Device), text input, response display, provider picker

### Step 7: Widget Extension (ClipKitLabClipWidget/)
- `LiveActivityAttributes.swift`: Defines `homeTeam`, `awayTeam` as static attrs; `homeScore`, `awayScore`, `period` as dynamic content state
- `LiveActivityWidget.swift`: Lock Screen expanded view (scores + period) and Dynamic Island compact/minimal/expanded views
- `ClipKitLabClipWidgetBundle.swift`: Widget bundle entry point

### Step 8: Tests (Tests/)
- `InvocationRouterTests.swift`: Tests URL parsing for all 7 experience types, invalid URLs, parameter extraction
- `NotificationManagerTests.swift`: Tests scheduling, cancellation

### Step 9: Documentation
- **README.md**: Prerequisites, Quick Start (3 commands), "What is an App Clip?" explainer, Architecture diagram (ASCII), all 7 challenge areas with goals/starter files/APIs/project ideas, Router explanation, Testing guide (simulator + device + URL table), Notifications guide, AI integration guide, Size budget tips, link to SUBMISSION.md, Apple documentation links
- **SUBMISSION.md**: Fork/branch instructions, PR template (What/Why/How/Screencast/Team), screencast recording instructions (Simulator > File > Record Screen), judging criteria table

### Step 10: Host App (ClipKitLab/)
- `ClipKitLabApp.swift`: Same router setup as clip but with navigation wrapper. Handles universal links for users who upgrade from clip to full app
- `ContentView.swift`: Simple wrapper around ExperiencePickerView with "This is the full app" banner

---

## Key Architecture Decisions

1. **XcodeGen over committed .xcodeproj**: The `.xcodeproj` is generated from `project.yml` and gitignored. Avoids merge conflicts, keeps repo clean, human-readable config
2. **Unified router**: Single URL pattern `https://clipkitlab.example.com/experience/{type}?params` dispatches to all experiences. Students extend by adding enum cases
3. **Local-only notifications**: `UNUserNotificationCenter.add()` for scheduling - no APNS server needed. Ephemeral permission is auto-granted for 8 hours
4. **Mock-first services**: Every service works with mock data by default. Students can progressively replace mocks with real implementations
5. **Simulator-safe**: QR and NFC services detect simulator and fall back to mock data
6. **Vision framework for AI**: Uses built-in Vision (text recognition, image classification) by default - no model file needed, zero impact on 15MB size budget

---

## Verification Plan

1. Run `./setup.sh` - should install XcodeGen and generate `ClipKitLab.xcodeproj` without errors
2. Open project in Xcode, select `ClipKitLabClip` scheme, build for iPhone 16 simulator - should compile cleanly
3. Run the clip - ExperiencePickerView should appear with 7 cards
4. Tap each card - each experience view should load with mock data and working UI
5. Test notification: tap "Send Test Notification" in any experience - notification should appear after delay
6. Test router: Set `_XCAppClipURL` env var to `https://clipkitlab.example.com/experience/retail?id=coffee` in scheme, re-run - should launch directly into RetailExperienceView
7. Run tests: `Cmd+U` - router and notification tests should pass
8. Check App Clip size: Product > Archive > Distribute (Ad Hoc) > verify thinned size < 15MB
