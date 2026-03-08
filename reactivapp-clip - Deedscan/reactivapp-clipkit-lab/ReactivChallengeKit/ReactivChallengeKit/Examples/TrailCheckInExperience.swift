//  TrailCheckInExperience.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

struct TrailCheckInExperience: ClipExperience {
    static let urlPattern = "trailkit.io/trail/:trailId/checkin"
    static let clipName = "Example: Trail Check-In"
    static let clipDescription = "Check in at the trailhead and share safety status in seconds."
    static let touchpoint: JourneyTouchpoint = .onSite
    static let invocationSource: InvocationSource = .qrCode

    let context: ClipContext
    @State private var checkedIn = false

    private var trailName: String {
        let id = context.pathParameters["trailId"] ?? "pine-loop"
        switch id {
        case "eagle-ridge": return "Eagle Ridge"
        case "canyon-run": return "Canyon Run"
        default: return "Pine Loop"
        }
    }

    var body: some View {
        ZStack {
            ClipBackground()

            VStack(spacing: 20) {
                Spacer()

                if checkedIn {
                    ClipSuccessOverlay(
                        message: "Checked in at \(trailName).\nYour emergency contact has been notified."
                    )
                } else {
                    ClipHeader(
                        title: trailName,
                        subtitle: "Share live check-in status before starting your hike.",
                        systemImage: "figure.hiking"
                    )
                    .padding(.horizontal, 24)

                    GlassEffectContainer {
                        VStack(spacing: 8) {
                            trailInfoRow(icon: "location.fill", label: "Trailhead", value: "North Gate")
                            trailInfoRow(icon: "clock.fill", label: "ETA", value: "1h 45m")
                            trailInfoRow(icon: "wifi", label: "Signal", value: "Limited")
                        }
                    }
                    .padding(.horizontal, 20)

                    ClipActionButton(
                        title: "Check In Now",
                        icon: "checkmark.seal.fill"
                    ) {
                        withAnimation(.spring(duration: 0.35)) {
                            checkedIn = true
                        }
                    }
                }

                Spacer()
            }
            .padding(.bottom, 16)
        }
    }

    @ViewBuilder
    private func trailInfoRow(icon: String, label: String, value: String) -> some View {
        HStack {
            Label(label, systemImage: icon)
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
