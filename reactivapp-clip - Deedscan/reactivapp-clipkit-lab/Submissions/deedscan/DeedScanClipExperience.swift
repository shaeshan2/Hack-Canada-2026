//  DeedScanClipExperience.swift
//  ReactivChallengeKit
//
//  DeedScan App Clip: No-commission Canadian real estate marketplace.
//  Scan QR on for-sale sign → instant property view → message seller or view full listing.

import SwiftUI
import UIKit

// MARK: - API Models

private struct ListingResponse: Codable {
    let id: String
    let title: String
    let description: String?
    let address: String
    let price: Int
    let imageUrl: String?
    let sqft: Int?
    let bedrooms: Int?
    let bathrooms: Int?
    let confidenceScore: Int?
    let latitude: Double?
    let longitude: Double?
    let photos: [PhotoResponse]?
    let seller: SellerResponse?
}

private struct PhotoResponse: Codable {
    let id: String
    let url: String
    let order: Int
}

private struct SellerResponse: Codable {
    let id: String
    let name: String?
}

private struct NearbyListingsResponse: Codable {
    let listings: [ListingResponse]?
}

// MARK: - Helpers

private func formatPrice(_ cents: Int) -> String? {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = "CAD"
    formatter.maximumFractionDigits = 0
    return formatter.string(from: NSNumber(value: cents))
}

// MARK: - DeedScan Clip Experience

struct DeedScanClipExperience: ClipExperience {
    /// Matches deedscan.app/clip/:id — tap the card or type deedscan.app/clip/demo_listing_001
    static let urlPattern = "deedscan.app/clip/:id"
    static let clipName = "DeedScan Property View"
    static let clipDescription = "Scan a for-sale sign QR to view the property and message the seller instantly."
    static let teamName = "DeedScan"
    static let touchpoint: JourneyTouchpoint = .onSite
    static let invocationSource: InvocationSource = .qrCode

    let context: ClipContext

    @State private var listing: ListingResponse?
    @State private var nearbyListings: [ListingResponse] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var photoIndex = 0

    private var listingId: String {
        context.pathParameters["id"] ?? context.queryParameters["id"] ?? ""
    }

    /// URL path/query gives the listing id. Backend expects demo IDs (e.g. demo_listing_001).
    /// The lab's default sample URL uses id "42"; we map that to demo_listing_001 so the clip works
    /// when opened from the On-Site card without requiring changes outside this submission.
    private var apiListingId: String {
        let id = listingId
        return id.isEmpty ? "" : (id == "42" ? "demo_listing_001" : id)
    }

    /// Local dev: backend + Auth0 are configured for http://localhost:3000 on your Mac.
    /// The simulator can talk to your Mac via localhost, so we use that host for both API calls
    /// and deep links (message seller, view full listing).
    private var apiBaseURL: String { "http://localhost:3000" }
    private var webBaseURL: String { "http://localhost:3000" }

    var body: some View {
        ZStack {
            ClipBackground()

            ScrollView {
                VStack(spacing: 16) {
                    if isLoading {
                        loadingView
                    } else if let error = errorMessage {
                        errorView(message: error)
                    } else if let listing = listing {
                        propertyDetailView(listing: listing)
                        if !nearbyListings.isEmpty {
                            findSimilarSection
                        }
                    }
                }
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
            .task {
                await loadListing()
            }
        }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 20) {
            Spacer(minLength: 60)
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading property…")
                .font(.system(size: 15))
                .foregroundStyle(.secondary)
            Spacer(minLength: 60)
        }
        .frame(maxWidth: .infinity)
    }

    private func errorView(message: String) -> some View {
        VStack(spacing: 20) {
            Spacer(minLength: 40)
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.orange)
            Text(message)
                .font(.system(size: 15))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
            if !listingId.isEmpty {
                ClipActionButton(title: "Retry", icon: "arrow.clockwise") {
                    Task { await loadListing() }
                }
                .padding(.horizontal, 24)
            }
            Spacer(minLength: 40)
        }
    }

    // MARK: - Property Detail

    private func propertyDetailView(listing: ListingResponse) -> some View {
        VStack(spacing: 16) {
            photoGallery(listing: listing)
            propertyInfo(listing: listing)
            ctaButtons(listing: listing)
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    private func photoGallery(listing: ListingResponse) -> some View {
        let photoURLs = (listing.photos?.sorted { $0.order < $1.order }.map { $0.url } ?? [])
            + (listing.imageUrl.map { [$0] } ?? [])
        let urls = photoURLs.isEmpty ? [] : photoURLs

        return Group {
            if urls.isEmpty {
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(.tertiarySystemFill))
                        .aspectRatio(4/3, contentMode: .fit)
                    Image(systemName: "house.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.tertiary)
                }
            } else {
                TabView(selection: $photoIndex) {
                    ForEach(Array(urls.enumerated()), id: \.offset) { index, urlString in
                        if let url = URL(string: urlString) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFill()
                                case .failure:
                                    Image(systemName: "photo")
                                        .font(.largeTitle)
                                        .foregroundStyle(.tertiary)
                                default:
                                    ProgressView()
                                }
                            }
                            .frame(height: 220)
                            .clipped()
                            .tag(index)
                        }
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: urls.count > 1 ? .automatic : .never))
                .frame(height: 220)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
    }

    private func propertyInfo(listing: ListingResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(listing.title)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.primary)
                    if !listing.address.isEmpty {
                        Label(listing.address, systemImage: "mappin.circle.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                confidenceBadge(score: listing.confidenceScore)
            }

            HStack(spacing: 16) {
                if let price = formatPrice(listing.price) {
                    Label(price, systemImage: "dollarsign.circle.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(.primary)
                }
                if let beds = listing.bedrooms {
                    Label("\(beds) bed", systemImage: "bed.double.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                }
                Label("\(listing.bathrooms ?? 3) bath", systemImage: "shower.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary)
                if let sqft = listing.sqft {
                    Label("\(sqft) sqft", systemImage: "square.dashed")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                }
            }

            if let desc = listing.description, !desc.isEmpty {
                Text(desc)
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }
        }
        .padding(16)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 16))
    }

    private func confidenceBadge(score: Int?) -> some View {
        let (label, color) = confidenceLabelAndColor(score: score)
        return Text(label)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(color, in: RoundedRectangle(cornerRadius: 8))
    }

    private func confidenceLabelAndColor(score: Int?) -> (String, Color) {
        guard let s = score else { return ("Pending", .orange) }
        if s >= 85 { return ("Verified", .green) }
        if s >= 60 { return ("Pending", .orange) }
        return ("Low", .red)
    }

    // MARK: - CTAs

    private func ctaButtons(listing: ListingResponse) -> some View {
        VStack(spacing: 10) {
            ClipActionButton(
                title: "Message Seller",
                icon: "message.fill"
            ) {
                openURL("\(webBaseURL)/messages?listingId=\(listing.id)&otherUserId=\(listing.seller?.id ?? "")")
            }

            ClipActionButton(
                title: "View Full Listing",
                icon: "safari",
                style: .secondary
            ) {
                openURL("\(webBaseURL)/listings/\(listing.id)")
            }
        }
    }

    private func openURL(_ urlString: String) {
        guard let url = URL(string: urlString) else { return }
        #if canImport(UIKit)
        UIApplication.shared.open(url)
        #endif
    }

    // MARK: - Find Similar

    private var findSimilarSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("More nearby")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(.primary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(nearbyListings.prefix(5), id: \.id) { item in
                        PropertyCardView(listing: item) {
                            listing = item
                            if let lat = item.latitude, let lng = item.longitude {
                                Task { await loadNearby(lat: lat, lng: lng, excludeId: item.id) }
                            }
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - API

    private func loadListing() async {
        let id = apiListingId
        guard !id.isEmpty else {
            errorMessage = "No listing ID. Tap the card or type deedscan.app/clip/demo_listing_001"
            isLoading = false
            return
        }

        isLoading = true
        errorMessage = nil

        guard let url = URL(string: "\(apiBaseURL)/api/listings/\(id)") else {
            errorMessage = "Invalid API URL"
            isLoading = false
            return
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 15

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                errorMessage = "Invalid response"
                isLoading = false
                return
            }
            guard http.statusCode == 200 else {
                errorMessage = "Property not found (HTTP \(http.statusCode))"
                isLoading = false
                return
            }
            let decoded = try JSONDecoder().decode(ListingResponse.self, from: data)
            let lat = decoded.latitude
            let lng = decoded.longitude
            let excludeId = decoded.id
            await MainActor.run {
                listing = decoded
                isLoading = false
            }
            if let lat = lat, let lng = lng {
                await loadNearby(lat: lat, lng: lng, excludeId: excludeId)
            }
        } catch {
            await MainActor.run {
                #if DEBUG
                errorMessage = "Could not load property: \(error.localizedDescription)"
                #else
                errorMessage = "Could not load property. Is the backend running?"
                #endif
                isLoading = false
            }
        }
    }

    private func loadNearby(lat: Double, lng: Double, excludeId: String) async {
        guard var components = URLComponents(string: "\(apiBaseURL)/api/listings/nearby") else { return }
        components.queryItems = [
            URLQueryItem(name: "lat", value: String(lat)),
            URLQueryItem(name: "lng", value: String(lng)),
            URLQueryItem(name: "radius_km", value: "5")
        ]
        guard let url = components.url else { return }

        var request = URLRequest(url: url)
        request.timeoutInterval = 15

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            var items: [ListingResponse] = []
            if let arr = try? JSONDecoder().decode([ListingResponse].self, from: data) {
                items = arr
            } else if let decoded = try? JSONDecoder().decode(NearbyListingsResponse.self, from: data) {
                items = decoded.listings ?? []
            }
            await MainActor.run {
                nearbyListings = items.filter { $0.id != excludeId }
            }
        } catch {
            await MainActor.run { nearbyListings = [] }
        }
    }
}

// MARK: - Property Card

private struct PropertyCardView: View {
    let listing: ListingResponse
    let onTap: () -> Void

    private var imageURL: String? {
        listing.photos?.sorted { $0.order < $1.order }.first?.url ?? listing.imageUrl
    }

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                Group {
                    if let urlString = imageURL, let url = URL(string: urlString) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let img): img.resizable().scaledToFill()
                            default: Color(.tertiarySystemFill)
                            }
                        }
                    } else {
                        Color(.tertiarySystemFill)
                    }
                }
                .frame(width: 140, height: 100)
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: 12))

                Text(listing.title)
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(2)
                    .foregroundStyle(.primary)
                if let price = formatPrice(listing.price) {
                    Text(price)
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 140)
            .padding(10)
            .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
    }
}
