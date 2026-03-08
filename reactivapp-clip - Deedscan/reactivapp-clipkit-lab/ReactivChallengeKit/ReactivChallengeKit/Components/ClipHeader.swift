//  ClipHeader.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

/// Title + subtitle + SF Symbol header for clip experiences.
struct ClipHeader: View {
    let title: String
    var subtitle: String? = nil
    var systemImage: String? = nil

    var body: some View {
        VStack(spacing: 12) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 48, weight: .thin))
                    .foregroundStyle(.primary)
            }

            Text(title)
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(.primary)
                .multilineTextAlignment(.center)

            if let subtitle {
                Text(subtitle)
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }
}
