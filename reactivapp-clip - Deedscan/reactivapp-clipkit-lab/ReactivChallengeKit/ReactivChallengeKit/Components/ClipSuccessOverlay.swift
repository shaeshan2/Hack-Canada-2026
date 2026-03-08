//  ClipSuccessOverlay.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

/// Animated checkmark + confirmation message overlay.
struct ClipSuccessOverlay: View {
    let message: String
    var icon: String = "checkmark.circle.fill"

    @State private var appeared = false

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundStyle(.green)
                .scaleEffect(appeared ? 1.0 : 0.3)
                .opacity(appeared ? 1.0 : 0.0)

            Text(message)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .animation(.spring(duration: 0.5, bounce: 0.4), value: appeared)
        .onAppear { appeared = true }
    }
}
