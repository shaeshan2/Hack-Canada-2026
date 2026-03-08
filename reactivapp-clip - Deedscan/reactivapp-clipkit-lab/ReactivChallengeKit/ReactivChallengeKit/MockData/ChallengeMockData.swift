//  ChallengeMockData.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import Foundation
import SwiftUI

// MARK: - Models

struct Artist: Identifiable, Hashable {
    let id: UUID
    let name: String
    let tourName: String
    let genre: String
    let systemImage: String
}

struct Product: Identifiable, Hashable {
    let id: UUID
    let name: String
    let price: Double
    let category: ProductCategory
    let systemImage: String
    let sizes: [String]?

    enum ProductCategory: String, CaseIterable {
        case apparel = "Apparel"
        case music = "Music"
        case accessories = "Accessories"
        case collectibles = "Collectibles"
    }

    var formattedPrice: String {
        String(format: "$%.2f", price)
    }
}

struct Venue: Identifiable, Hashable {
    let id: UUID
    let name: String
    let city: String
    let capacity: Int
    let boothLocations: [String]
}

struct Show: Identifiable {
    let id: UUID
    let artist: Artist
    let venue: Venue
    let date: Date
    let doorsOpen: Date
}

struct NotificationTemplate: Identifiable {
    let id = UUID()
    let title: String
    let body: String
    let journeyStage: String
    let triggerDescription: String
    let delayFromInvocation: TimeInterval?
}

// MARK: - Mock Data

enum ChallengeMockData {

    // MARK: Artists

    static let artists: [Artist] = [
        Artist(
            id: UUID(),
            name: "Jelly Roll",
            tourName: "Beautifully Broken Tour",
            genre: "Country / Hip-Hop",
            systemImage: "music.mic"
        ),
        Artist(
            id: UUID(),
            name: "The Midnight Foxes",
            tourName: "Neon Horizons World Tour",
            genre: "Indie Rock",
            systemImage: "guitars.fill"
        ),
        Artist(
            id: UUID(),
            name: "Nova Chen",
            tourName: "Frequency Live",
            genre: "Electronic / Pop",
            systemImage: "waveform"
        ),
    ]

    // MARK: Products

    static let products: [Product] = [
        Product(
            id: UUID(),
            name: "Tour T-Shirt",
            price: 40.00,
            category: .apparel,
            systemImage: "tshirt.fill",
            sizes: ["S", "M", "L", "XL", "XXL"]
        ),
        Product(
            id: UUID(),
            name: "Pullover Hoodie",
            price: 75.00,
            category: .apparel,
            systemImage: "tshirt.fill",
            sizes: ["S", "M", "L", "XL"]
        ),
        Product(
            id: UUID(),
            name: "Limited Edition Vinyl",
            price: 35.00,
            category: .music,
            systemImage: "opticaldisc.fill",
            sizes: nil
        ),
        Product(
            id: UUID(),
            name: "Live Album CD",
            price: 18.00,
            category: .music,
            systemImage: "opticaldisc",
            sizes: nil
        ),
        Product(
            id: UUID(),
            name: "Tour Poster",
            price: 15.00,
            category: .collectibles,
            systemImage: "photo.artframe",
            sizes: nil
        ),
        Product(
            id: UUID(),
            name: "Snapback Hat",
            price: 30.00,
            category: .accessories,
            systemImage: "hat.widebrim.fill",
            sizes: nil
        ),
        Product(
            id: UUID(),
            name: "Enamel Pin Set",
            price: 12.00,
            category: .collectibles,
            systemImage: "seal.fill",
            sizes: nil
        ),
        Product(
            id: UUID(),
            name: "Tote Bag",
            price: 25.00,
            category: .accessories,
            systemImage: "bag.fill",
            sizes: nil
        ),
    ]

    // MARK: Venues

    static let venues: [Venue] = [
        Venue(
            id: UUID(),
            name: "Rogers Centre",
            city: "Toronto, ON",
            capacity: 49_000,
            boothLocations: ["Gate A - Main Concourse", "Section 118 - Lower Bowl", "Gate E - Upper Level"]
        ),
        Venue(
            id: UUID(),
            name: "Pacific Coliseum",
            city: "Vancouver, BC",
            capacity: 16_281,
            boothLocations: ["Main Entrance", "Section 12 - East Side"]
        ),
        Venue(
            id: UUID(),
            name: "Canadian Tire Centre",
            city: "Ottawa, ON",
            capacity: 18_652,
            boothLocations: ["North Atrium", "Section 200 - Club Level", "South Gate"]
        ),
    ]

    // MARK: Shows

    static var shows: [Show] {
        let calendar = Calendar.current
        let today = Date()
        return [
            Show(
                id: UUID(),
                artist: artists[0],
                venue: venues[0],
                date: calendar.date(byAdding: .hour, value: 3, to: today) ?? today,
                doorsOpen: calendar.date(byAdding: .hour, value: 1, to: today) ?? today
            ),
            Show(
                id: UUID(),
                artist: artists[1],
                venue: venues[1],
                date: calendar.date(byAdding: .day, value: 7, to: today) ?? today,
                doorsOpen: calendar.date(byAdding: .day, value: 7, to: calendar.date(byAdding: .hour, value: -2, to: today)!) ?? today
            ),
        ]
    }

    // MARK: Notification Templates

    static let notificationTemplates: [NotificationTemplate] = [
        NotificationTemplate(
            title: "Show day is here",
            body: "Doors open at 6 PM. Skip the merch line and pre-order now.",
            journeyStage: "The Wait",
            triggerDescription: "Sent morning of show day",
            delayFromInvocation: 0
        ),
        NotificationTemplate(
            title: "Limited drop just went live",
            body: "Venue-exclusive hoodie. Grab yours before they are gone.",
            journeyStage: "Show Day",
            triggerDescription: "Sent when doors open",
            delayFromInvocation: 60 * 30
        ),
        NotificationTemplate(
            title: "Skip the line",
            body: "Order from your seat and pick up at Booth #3.",
            journeyStage: "Show Day",
            triggerDescription: "Sent during the show",
            delayFromInvocation: 60 * 90
        ),
        NotificationTemplate(
            title: "Thanks for an incredible night",
            body: "Missed the merch booth? Everything is online now. Free shipping until midnight.",
            journeyStage: "Post-Show Afterglow",
            triggerDescription: "Sent 30 min after show ends",
            delayFromInvocation: 60 * 60 * 4
        ),
        NotificationTemplate(
            title: "Last chance: tour-exclusive vinyl",
            body: "Only a few left from last night. Ships this week.",
            journeyStage: "Post-Show Afterglow",
            triggerDescription: "Sent next morning (within 8h window)",
            delayFromInvocation: 60 * 60 * 7
        ),
    ]

    // MARK: Helpers

    static func products(for category: Product.ProductCategory) -> [Product] {
        products.filter { $0.category == category }
    }

    static var featuredProducts: [Product] {
        Array(products.prefix(4))
    }
}
