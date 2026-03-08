//  DeedScanListingExperience.swift
//  ReactivChallengeKit
//
//  DeedScan — View Property. Scan the yard sign QR to instantly view listing details.
//  No download, no account needed.

import SwiftUI
import UIKit
import UserNotifications

struct DeedScanListingExperience: ClipExperience {
    static let urlPattern = "deedscan.app/clip"
    static let clipName = "DeedScan — View Property"
    static let clipDescription = "Scan the yard sign QR to instantly view listing details, price, and neighbourhood info — no download, no account needed"
    static let teamName = "DeedScan"
    static let touchpoint: JourneyTouchpoint = JourneyTouchpoint(
        id: "yard-sign",
        title: "Yard Sign",
        icon: "mappin.and.ellipse",
        context: "Physical QR code on for-sale yard sign",
        notificationHint: "Use time-sensitive nudges while context is fresh.",
        sortOrder: 30
    )
    static let invocationSource: InvocationSource = .qrCode

    let context: ClipContext

    // Hardcoded demo listing (matches live DB seed)
    private static let title = "Detached Family Home in North York"
    private static let address = "1250 Sheppard Ave W, Toronto, ON"
    private static let priceFormatted = "$1,499,000 CAD"
    private static let agentSavings = "~$74,950"
    private static let savingsLabel = "💰 Saves \(agentSavings) vs. agent commission"
    private static let bedrooms = 4
    private static let bathrooms = 3
    private static let sqft = 2400
    private static let aiScore = 91
    private static let aiLabel = "🛡️ \(aiScore)/100 Verified — No fraud signals"
    private static let sellerName = "Amelia Chen"
    private static let photo1 = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80"
    private static let photo2 = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80"
    private static let neighbourhoodSummary = "8 min to Sheppard-Yonge · Loblaws 5 min walk · Earl Haig SS 0.6km"

    /// Price drop: $5,000 off → $1,494,000
    private static let newPriceFormatted = "$1,494,000 CAD"

    /// Only schedule the price-drop notification once per app session.
    private static var hasScheduledPriceDrop = false
    /// When we scheduled it; used to show reduced price only after user returns 3+ s later (notification fired).
    private static var priceDropScheduledAt: Date?

    @State private var showNeighbourhoodSheet = false
    @State private var priceDropApplied = false

    var body: some View {
        ZStack {
            ClipBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // 1. Photo carousel
                    photoCarousel

                    // 2. Title + address
                    VStack(alignment: .leading, spacing: 6) {
                        Text(Self.title)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundStyle(.primary)
                        Text("📍 " + Self.address)
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)

                    // 3. Price block (strikethrough + new price when price drop applied, once only)
                    VStack(alignment: .leading, spacing: 10) {
                        if priceDropApplied {
                            HStack(alignment: .firstTextBaseline, spacing: 10) {
                                Text(Self.priceFormatted)
                                    .font(.system(size: 22, weight: .semibold))
                                    .foregroundStyle(.secondary)
                                    .strikethrough(true, color: .secondary)
                                Text(Self.newPriceFormatted)
                                    .font(.system(size: 26, weight: .bold))
                                    .foregroundStyle(.primary)
                            }
                            Text("Price reduced by $5,000")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(Color.blue, in: Capsule())
                        } else {
                            Text(Self.priceFormatted)
                                .font(.system(size: 26, weight: .bold))
                                .foregroundStyle(.primary)
                            Text(Self.savingsLabel)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(Color.green, in: Capsule())
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)

                    // 4. Specs row (scrollable so all chips visible on narrow screens)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            specChip("🛏 \(Self.bedrooms) beds")
                            specChip("🚿 \(Self.bathrooms) baths")
                            specChip("📐 \(Self.sqft) sq ft")
                            specChip("0% Commission")
                        }
                    }
                    .padding(.horizontal, 16)

                    // 5. AI Fraud Score badge
                    Text(Self.aiLabel)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.green, in: RoundedRectangle(cornerRadius: 12))
                        .padding(.horizontal, 16)

                    // 5b. Price drop alert cue
                    HStack(spacing: 6) {
                        Image(systemName: "bell.fill")
                            .foregroundStyle(.blue)
                            .font(.caption)
                        Text("You'll get a price drop alert if this listing changes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 6)
                    .padding(.horizontal, 16)

                    // 6. Neighbourhood Snapshot
                    VStack(alignment: .leading, spacing: 10) {
                        Text("📍 Neighbourhood Snapshot")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.primary)
                        Text(Self.neighbourhoodSummary)
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                        Button {
                            showNeighbourhoodSheet = true
                        } label: {
                            HStack(spacing: 4) {
                                Text("See more")
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(.blue)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)

                    // 7. Message Seller CTA
                    Button {
                        if let url = URL(string: "http://localhost:3000/messages?listingId=demo_listing_001&sellerId=demo_seller_001") {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        HStack(spacing: 10) {
                            Text("💬")
                            Text("Message Seller")
                                .font(.system(size: 17, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.blue, in: RoundedRectangle(cornerRadius: 16))
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
            }
            .scrollIndicators(.hidden)
            .sheet(isPresented: $showNeighbourhoodSheet) {
                neighbourhoodSheet
            }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)) { _ in
                Self.schedulePriceDropNotificationIfNeeded(
                    listingId: "demo_listing_001",
                    listingTitle: Self.title
                )
            }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
                checkAndApplyPriceDrop()
            }
        }
    }

    /// When user returns 3+ seconds after we scheduled the notification, show the reduced price once (simulates tapping the notification).
    private func checkAndApplyPriceDrop() {
        guard let scheduledAt = Self.priceDropScheduledAt else { return }
        guard Date().timeIntervalSince(scheduledAt) >= 3 else { return }
        Self.priceDropScheduledAt = nil
        Task { @MainActor in
            withAnimation(.easeOut(duration: 0.35)) {
                priceDropApplied = true
            }
        }
    }

    /// Schedules a local "price drop" notification 3s after the user leaves. Only schedules once per app session.
    private static func schedulePriceDropNotificationIfNeeded(listingId: String, listingTitle: String) {
        guard !hasScheduledPriceDrop else { return }

        let center = UNUserNotificationCenter.current()

        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else { return }

            hasScheduledPriceDrop = true
            priceDropScheduledAt = Date()

            let content = UNMutableNotificationContent()
            content.title = "🏠 Price Drop Alert"
            content.body = "\(listingTitle) — Seller just reduced the price by $5,000. Tap to view."
            content.sound = .default
            content.userInfo = ["url": "https://deedscan.app/clip?id=\(listingId)"]

            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 3, repeats: false)

            let request = UNNotificationRequest(
                identifier: "deedscan-pricedrop-\(listingId)",
                content: content,
                trigger: trigger
            )

            center.add(request) { error in
                if let error = error {
                    print("DeedScan notification error: \(error)")
                }
            }
        }
    }

    private func carouselImage(urlString: String, tag: Int) -> some View {
        AsyncImage(url: URL(string: urlString)) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
            case .failure:
                Color(.tertiarySystemFill)
            default:
                ProgressView()
            }
        }
        .frame(height: 220)
        .clipped()
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .tag(tag)
    }

    private var photoCarousel: some View {
        TabView {
            carouselImage(urlString: Self.photo1, tag: 0)
            carouselImage(urlString: Self.photo2, tag: 1)
        }
        .tabViewStyle(.page)
        .frame(height: 220)
        .padding(.horizontal, 16)
    }

    private func specChip(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(.tertiarySystemFill), in: Capsule())
    }

    private var neighbourhoodSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    sectionBlock(title: "Transit") {
                        bullet("TTC Sheppard-Yonge Station — 8 min walk")
                        bullet("Bus 84 Sheppard — 2 min walk")
                    }
                    sectionBlock(title: "Groceries") {
                        bullet("Loblaws (Yonge & Sheppard) — 5 min walk")
                        bullet("Metro — 7 min walk")
                        bullet("FreshCo — 12 min drive")
                    }
                    sectionBlock(title: "Schools") {
                        bullet("Earl Haig Secondary School — 0.6 km")
                        bullet("Willowdale Middle School — 0.4 km")
                        bullet("Claude Watson School for the Arts — 1.1 km")
                    }
                }
                .padding(20)
            }
            .navigationTitle("Neighbourhood Snapshot")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        showNeighbourhoodSheet = false
                    }
                }
            }
        }
    }

    private func sectionBlock<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.primary)
            VStack(alignment: .leading, spacing: 4) {
                content()
            }
        }
    }

    private func bullet(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(.primary)
        }
    }
}
