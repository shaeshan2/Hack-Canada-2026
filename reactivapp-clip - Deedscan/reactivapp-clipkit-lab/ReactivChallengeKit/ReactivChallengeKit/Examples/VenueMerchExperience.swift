//  VenueMerchExperience.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

struct VenueMerchExperience: ClipExperience {
    static let urlPattern = "example.com/venue/:venueId/merch"
    static let clipName = "Example: Venue Merch"
    static let clipDescription = "Open from a venue trigger to browse and buy merch fast."
    static let touchpoint: JourneyTouchpoint = .showDay
    static let invocationSource: InvocationSource = .qrCode

    private enum CheckoutStep {
        case browse
        case checkout
        case success
    }

    let context: ClipContext
    @State private var cart: [Product] = []
    @State private var checkoutStep: CheckoutStep = .browse

    private var artist: Artist {
        ChallengeMockData.artists[0]
    }

    private var venueName: String {
        let venueId = context.pathParameters["venueId"] ?? ""
        return ChallengeMockData.venues.first { $0.name.lowercased().contains(venueId.lowercased()) }?.name
            ?? ChallengeMockData.venues[0].name
    }

    var body: some View {
        ZStack {
            switch checkoutStep {
            case .browse:
                browseView
                    .transition(.move(edge: .leading).combined(with: .opacity))
            case .checkout:
                checkoutView
                    .transition(.move(edge: .trailing).combined(with: .opacity))
            case .success:
                successView
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.35), value: checkoutStep)
    }

    private var browseView: some View {
        ScrollView {
            VStack(spacing: 12) {
                ArtistBanner(artist: artist, venue: venueName)
                    .padding(.top, 8)

                MerchGrid(products: ChallengeMockData.featuredProducts) { product in
                    cart.append(product)
                }

                if !cart.isEmpty {
                    CartSummary(items: cart) {
                        withAnimation(.spring(duration: 0.4)) {
                            checkoutStep = .checkout
                        }
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .padding(.bottom, 16)
        }
        .scrollIndicators(.hidden)
        .animation(.spring(duration: 0.3), value: cart.count)
    }

    private var checkoutView: some View {
        VStack(spacing: 18) {
            Spacer()

            ClipHeader(
                title: "Mock Checkout",
                subtitle: "Transition demo: review, confirm, complete.",
                systemImage: "creditcard.fill"
            )
            .padding(.horizontal, 24)

            GlassEffectContainer {
                VStack(spacing: 8) {
                    checkoutRow(label: "Items", value: "\(cart.count)")
                    checkoutRow(label: "Subtotal", value: totalPrice)
                    checkoutRow(label: "Pickup", value: "Booth #3")
                    checkoutRow(label: "Payment", value: "Apple Pay (Mock)")
                }
            }
            .padding(.horizontal, 20)

            HStack(spacing: 10) {
                ClipActionButton(title: "Back", icon: "chevron.left") {
                    withAnimation(.spring(duration: 0.35)) {
                        checkoutStep = .browse
                    }
                }

                ClipActionButton(title: "Pay Now", icon: "checkmark.circle.fill") {
                    withAnimation(.spring(duration: 0.35)) {
                        checkoutStep = .success
                    }
                }
            }
            .padding(.horizontal, 20)

            Spacer()
        }
        .padding(.bottom, 16)
    }

    private var successView: some View {
        VStack(spacing: 20) {
            Spacer()
            ClipSuccessOverlay(
                message: "Order confirmed!\nPick up at \(ChallengeMockData.venues[0].boothLocations[0])."
            )
            Spacer()
        }
    }

    private var totalPrice: String {
        let total = cart.reduce(0) { $0 + $1.price }
        return String(format: "$%.2f", total)
    }

    @ViewBuilder
    private func checkoutRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.primary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 12))
    }
}
