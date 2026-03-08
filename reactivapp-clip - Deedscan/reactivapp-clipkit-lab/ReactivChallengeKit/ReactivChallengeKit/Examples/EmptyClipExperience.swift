//  EmptyClipExperience.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

// TODO: Rename this struct to match your clip idea (e.g., PreShowMerchExperience)
// TODO: Update urlPattern, clipName, clipDescription, teamName
// TODO: Pick a touchpoint category (or define your own custom JourneyTouchpoint)
// TODO: Build your UI using the building block components (see Components/)

struct EmptyClipExperience: ClipExperience {
    // TODO: Set your URL pattern. Use :paramName for path parameters.
    // Examples:
    //   "example.com/show/:showId/merch"        — Show Day merch
    //   "example.com/artist/:artistId/preorder" — Pre-show pre-order
    //   "example.com/venue/:venueId/booth/:id"  — Specific booth
    //   "example.com/aftershow/:showId"         — Post-show engagement
    static let urlPattern = "example.com/your-path/:param"

    static let clipName = "Your Clip Name"
    static let clipDescription = "One line: what does the fan get in under 30 seconds?"
    static let teamName = "Your Team Name"

    // TODO: Set your touchpoint: .discovery, .purchase, .onSite, .reengagement, .utility
    //       or define your own JourneyTouchpoint(id:title:icon:context:notificationHint:sortOrder:)
    static let touchpoint: JourneyTouchpoint = .onSite

    // TODO: Set how your clip is invoked: .qrCode, .nfcTag, .iMessage, .smartBanner, .appleMaps, .siri
    static let invocationSource: InvocationSource = .qrCode

    let context: ClipContext

    // TODO: Add @State properties for your clip's state (cart, form data, etc.)

    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: 20) {
                    // TODO: Replace with ArtistBanner, ClipHeader, or your own header
                    ClipHeader(
                        title: "Your Experience",
                        subtitle: "Which journey touchpoint are you targeting?",
                        systemImage: "music.note"
                    )
                    .padding(.top, 16)

                    // TODO: Build your experience here. Consider using:
                    //   ArtistBanner(artist:venue:)     — artist branding
                    //   MerchGrid(products:onAddToCart:) — product browsing
                    //   CartSummary(items:onCheckout:)   — cart + checkout
                    //   ClipActionButton(title:icon:)    — call-to-action
                    //   ClipSuccessOverlay(message:)     — confirmation
                    //   NotificationPreview(template:)   — show notification strategy
                    //
                    // Available mock data:
                    //   ChallengeMockData.artists              — artist profiles
                    //   ChallengeMockData.products             — merch catalog
                    //   ChallengeMockData.venues               — venue info
                    //   ChallengeMockData.notificationTemplates — push notification examples

                    GlassEffectContainer {
                        VStack(spacing: 8) {
                            HStack {
                                Text("URL")
                                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                                    .foregroundStyle(.secondary)
                                    .frame(width: 50, alignment: .trailing)
                                Text(context.invocationURL.absoluteString)
                                    .font(.system(size: 13, design: .monospaced))
                                    .foregroundStyle(.primary)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                                Spacer()
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 12))

                            HStack {
                                Text("param")
                                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                                    .foregroundStyle(.secondary)
                                    .frame(width: 50, alignment: .trailing)
                                Text(context.pathParameters["param"] ?? "—")
                                    .font(.system(size: 13, design: .monospaced))
                                    .foregroundStyle(.primary)
                                Spacer()
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.bottom, 16)
            }
            .scrollIndicators(.hidden)
        }
    }
}
