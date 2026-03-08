//  NotificationPreview.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

/// A mock iOS notification bubble for demonstrating push notification strategies.
struct NotificationPreview: View {
    let template: NotificationTemplate

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "app.badge.fill")
                .font(.system(size: 22))
                .foregroundStyle(.blue)
                .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("ONE LIVE")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(.tertiaryLabel))
                    Spacer()
                    Text(template.journeyStage)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color(.quaternaryLabel))
                }

                Text(template.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.primary)

                Text(template.body)
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }

            Spacer(minLength: 0)
        }
        .padding(14)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal, 16)
    }
}

/// Displays a timeline of notification previews.
struct NotificationTimeline: View {
    let templates: [NotificationTemplate]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("NOTIFICATION STRATEGY")
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.2)
                .foregroundStyle(Color(.tertiaryLabel))
                .padding(.horizontal, 20)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(templates) { template in
                        NotificationPreview(template: template)
                            .frame(width: 300)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }
}
