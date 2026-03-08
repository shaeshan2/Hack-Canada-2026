//  ClipExperience.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

// MARK: - Journey Metadata

struct JourneyTouchpoint: Hashable, Identifiable {
    let id: String
    let title: String
    let icon: String
    let context: String
    let notificationHint: String
    let sortOrder: Int

    init(
        id: String,
        title: String,
        icon: String,
        context: String,
        notificationHint: String,
        sortOrder: Int = 100
    ) {
        self.id = id
        self.title = title
        self.icon = icon
        self.context = context
        self.notificationHint = notificationHint
        self.sortOrder = sortOrder
    }
}

extension JourneyTouchpoint {
    // Generic defaults for broad ClipKit Lab use-cases.
    static let discovery = JourneyTouchpoint(
        id: "discovery",
        title: "Discovery",
        icon: "eye.fill",
        context: "User discovers the experience for the first time.",
        notificationHint: "Use the 8h window to re-engage with a clear next step.",
        sortOrder: 10
    )
    static let purchase = JourneyTouchpoint(
        id: "purchase",
        title: "Purchase",
        icon: "cart.fill",
        context: "User is actively evaluating or buying.",
        notificationHint: "Reinforce intent and reduce drop-off in the 8h window.",
        sortOrder: 20
    )
    static let onSite = JourneyTouchpoint(
        id: "on-site",
        title: "On-Site",
        icon: "mappin.and.ellipse",
        context: "User is physically at a location and needs fast action.",
        notificationHint: "Use time-sensitive nudges while context is fresh.",
        sortOrder: 30
    )
    static let reengagement = JourneyTouchpoint(
        id: "reengagement",
        title: "Re-engage",
        icon: "bell.badge.fill",
        context: "User left the flow but can still be reactivated.",
        notificationHint: "Use targeted reminders within the 8h notification window.",
        sortOrder: 40
    )
    static let utility = JourneyTouchpoint(
        id: "utility",
        title: "Utility",
        icon: "wand.and.stars",
        context: "Single-purpose task that delivers immediate practical value.",
        notificationHint: "If push is used, keep it minimal and utility-first.",
        sortOrder: 50
    )

    // Legacy aliases to keep older examples/templates working.
    static let ticketPurchase = JourneyTouchpoint(
        id: "ticket-purchase",
        title: "Ticket Purchase",
        icon: "ticket.fill",
        context: "User just committed and is in spending mode.",
        notificationHint: "Push timely upsell or completion prompts in the 8h window.",
        sortOrder: 21
    )
    static let theWait = JourneyTouchpoint(
        id: "the-wait",
        title: "The Wait",
        icon: "clock.fill",
        context: "User is waiting between decision and event.",
        notificationHint: "Use sparse reminders and clear value moments.",
        sortOrder: 25
    )
    static let showDay = JourneyTouchpoint(
        id: "show-day",
        title: "Show Day",
        icon: "music.mic",
        context: "User is on-site with high intent and low patience.",
        notificationHint: "Drive immediate conversion while urgency is high.",
        sortOrder: 31
    )
    static let postShow = JourneyTouchpoint(
        id: "post-show",
        title: "Post-Show",
        icon: "moon.stars.fill",
        context: "User is post-event and emotionally engaged.",
        notificationHint: "Use short-lifetime offers to capture afterglow intent.",
        sortOrder: 41
    )
}

enum InvocationSource: String, CaseIterable, Identifiable {
    case qrCode = "QR Code"
    case nfcTag = "NFC Tag"
    case iMessage = "iMessage Link"
    case smartBanner = "Smart Banner"
    case appleMaps = "Apple Maps"
    case siri = "Siri Suggestion"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .qrCode: return "qrcode.viewfinder"
        case .nfcTag: return "wave.3.right"
        case .iMessage: return "message.fill"
        case .smartBanner: return "safari.fill"
        case .appleMaps: return "map.fill"
        case .siri: return "wand.and.stars"
        }
    }

    var triggerLabel: String {
        switch self {
        case .qrCode: return "Open Clip"
        case .nfcTag: return "Open Clip"
        case .iMessage: return "Open Clip"
        case .smartBanner: return "Open Clip"
        case .appleMaps: return "Open Clip"
        case .siri: return "Open Clip"
        }
    }
}

// MARK: - Protocol

/// Conform to this protocol to create your App Clip experience.
protocol ClipExperience: View {
    /// URL pattern this clip responds to. Use `:paramName` for path parameters.
    static var urlPattern: String { get }

    /// Human-readable name for this clip.
    static var clipName: String { get }

    /// One-line description of what this clip does.
    static var clipDescription: String { get }

    /// Your team name (for the submission gallery).
    static var teamName: String { get }

    /// Which user journey touchpoint does this clip target?
    static var touchpoint: JourneyTouchpoint { get }

    /// How would this clip be invoked in the real world?
    static var invocationSource: InvocationSource { get }

    /// Initialize with the parsed invocation context.
    init(context: ClipContext)
}

extension ClipExperience {
    static var teamName: String { "Reactiv" }
    static var touchpoint: JourneyTouchpoint { .utility }
    static var invocationSource: InvocationSource { .qrCode }
}
