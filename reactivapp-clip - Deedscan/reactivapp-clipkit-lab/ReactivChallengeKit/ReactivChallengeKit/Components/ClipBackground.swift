//  ClipBackground.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

/// System background with a subtle brand tint for stronger glass contrast.
struct ClipBackground: View {
    var body: some View {
        ZStack {
            Color(.systemBackground)

            LinearGradient(
                colors: [
                    Color(hex: "#2FE9DE").opacity(0.2),
                    Color(hex: "#0CEC93").opacity(0.2),
                    .clear,
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            RadialGradient(
                colors: [
                    Color(hex: "#2FE9DE").opacity(0.12),
                    .clear,
                ],
                center: .bottomTrailing,
                startRadius: 40,
                endRadius: 420
            )
        }
        .ignoresSafeArea()
    }
}

private extension Color {
    init(hex: String) {
        let trimmed = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: trimmed).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255.0
        let g = Double((int >> 8) & 0xFF) / 255.0
        let b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
