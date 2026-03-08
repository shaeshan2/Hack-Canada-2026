//  ClipActionButton.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

/// A large, styled call-to-action button for clip experiences.
struct ClipActionButton: View {
    let title: String
    let icon: String
    let style: ActionStyle
    let action: () -> Void

    enum ActionStyle {
        case primary
        case secondary
        case destructive
    }

    init(
        title: String,
        icon: String = "arrow.right.circle.fill",
        style: ActionStyle = .primary,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.style = style
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                Text(title)
                    .font(.system(size: 17, weight: .semibold))
            }
            .foregroundStyle(foregroundColor)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(backgroundColor, in: RoundedRectangle(cornerRadius: 16))
        }
        .padding(.horizontal, 24)
    }

    private var foregroundColor: Color {
        switch style {
        case .primary: return .white
        case .secondary: return .primary
        case .destructive: return .white
        }
    }

    private var backgroundColor: Color {
        switch style {
        case .primary: return .blue
        case .secondary: return Color(.tertiarySystemFill)
        case .destructive: return .red
        }
    }
}
