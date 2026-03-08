import SwiftUI

// 1. Rename this file and struct to match your idea (e.g., PreShowMerchExperience.swift)
// 2. Update urlPattern, clipName, clipDescription, teamName
// 3. Build your UI in body using the building block components
// 4. Copy this folder as Submissions/YourTeamName/ and start building
// 5. If Xcode shows this file without Target Membership, that's expected here.
//    Submissions are compiled through GeneratedSubmissions.swift after build/script.
//
// DESIGN NOTES:
// - Use system colors (.primary, .secondary, .tertiary) — they adapt to Liquid Glass
// - Use .glassEffect(.regular.interactive(), in: ...) for card surfaces
// - ConstraintBanner is added automatically by the simulator — don't add it yourself
// - Wrap content in ScrollView to avoid overlapping with the top bar

struct MyClipExperience: ClipExperience {
    static let urlPattern = "example.com/your-path/:param"
    static let clipName = "Your Clip Name"
    static let clipDescription = "One line: what does the fan get in under 30 seconds?"
    static let teamName = "Your Team Name"

    // Pick your touchpoint: .discovery, .purchase, .onSite, .reengagement, .utility
    // or define your own JourneyTouchpoint(id:title:icon:context:notificationHint:sortOrder:)
    static let touchpoint: JourneyTouchpoint = .onSite

    // Pick how fans invoke this: .qrCode, .nfcTag, .iMessage, .smartBanner, .appleMaps, .siri
    static let invocationSource: InvocationSource = .qrCode

    let context: ClipContext

    // Add your @State properties here

    var body: some View {
        ZStack {
            ClipBackground()

            ScrollView {
                VStack(spacing: 20) {
                    // Use ArtistBanner for artist branding:
                    // ArtistBanner(artist: ChallengeMockData.artists[0], venue: "Rogers Centre")

                    ClipHeader(
                        title: "Your Experience",
                        subtitle: "Build something amazing",
                        systemImage: "music.note"
                    )
                    .padding(.top, 16)

                    // Use MerchGrid for product browsing:
                    // MerchGrid(products: ChallengeMockData.products) { product in
                    //     cart.append(product)
                    // }

                    // Use CartSummary for checkout:
                    // CartSummary(items: cart) { purchased = true }

                    // Use ClipActionButton for a CTA:
                    // ClipActionButton(title: "Pre-Order Now", icon: "bag.fill") { }

                    // Use ClipSuccessOverlay for confirmation:
                    // ClipSuccessOverlay(message: "You're all set!")

                    // Use NotificationPreview to show your notification strategy:
                    // NotificationPreview(template: ChallengeMockData.notificationTemplates[0])
                }
                .padding(.bottom, 16)
            }
            .scrollIndicators(.hidden)
        }
    }
}
