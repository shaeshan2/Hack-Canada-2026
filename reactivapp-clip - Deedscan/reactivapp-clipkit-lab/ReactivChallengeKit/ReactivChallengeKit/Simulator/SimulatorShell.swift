//  SimulatorShell.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI
internal import Combine

struct SimulatorShell: View {
    @Bindable var router: ClipRouter
    @State private var invocationStart: Date?

    var body: some View {
        ZStack {
            if let match = router.currentMatch {
                ClipHostView(
                    match: match,
                    invocationStart: $invocationStart,
                    router: router
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))
            } else {
                LandingView(router: router)
                    .transition(.opacity)
            }
        }
        .animation(.spring(duration: 0.4), value: router.currentMatch?.id)
        .onChange(of: router.currentMatch?.id) { _, newValue in
            if newValue != nil {
                invocationStart = Date()
            }
        }
    }
}

struct ClipHostView: View {
    let match: ClipRouter.MatchResult
    @Binding var invocationStart: Date?
    @Bindable var router: ClipRouter
    @State private var showNotificationPanel = false

    var body: some View {
        match.makeView()
            .safeAreaInset(edge: .top, spacing: 0) {
                VStack(spacing: 0) {
                    topBar

                    if showNotificationPanel {
                        notificationPanel
                            .transition(.move(edge: .top).combined(with: .opacity))
                            .padding(.top, 8)
                    }
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                ConstraintBanner()
                    .padding(.top, 8)
                    .padding(.bottom, 4)
            }
    }

    // MARK: - Top Bar

    private var topBar: some View {
        GlassEffectContainer {
            HStack(spacing: 8) {
                HStack(spacing: 4) {
                    Image(systemName: match.experienceType.touchpoint.icon)
                        .font(.system(size: 10, weight: .semibold))
                    Text(match.experienceType.touchpoint.title)
                        .font(.system(size: 11, weight: .semibold))
                }
                .foregroundStyle(.primary)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .glassEffect(.regular.interactive(), in: .capsule)

                Spacer()

                if let start = invocationStart {
                    NotificationWindowPill(startDate: start) {
                        withAnimation(.spring(duration: 0.3)) {
                            showNotificationPanel.toggle()
                        }
                    }
                }

                if let start = invocationStart {
                    MomentTimer(startDate: start)
                }

                Button {
                    showNotificationPanel = false
                    router.dismiss()
                    invocationStart = nil
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.primary)
                        .frame(width: 36, height: 36)
                        .glassEffect(.regular.interactive(), in: .circle)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
        .padding(.bottom, 4)
    }

    // MARK: - Notification Panel

    private var notificationPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "bell.badge.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.orange)
                Text("8-HOUR PUSH WINDOW")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(1)
                    .foregroundStyle(.secondary)
                Spacer()
                if let start = invocationStart {
                    let remaining = max(0, 8 * 3600 - Date().timeIntervalSince(start))
                    let hours = Int(remaining) / 3600
                    let minutes = (Int(remaining) % 3600) / 60
                    Text("\(hours)h \(minutes)m remaining")
                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                        .foregroundStyle(.orange)
                }
            }

            ForEach(Array(ChallengeMockData.notificationTemplates.prefix(3))) { template in
                HStack(alignment: .top, spacing: 8) {
                    Circle()
                        .fill(.orange)
                        .frame(width: 6, height: 6)
                        .padding(.top, 5)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(template.title)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.primary)
                        Text(template.triggerDescription)
                            .font(.system(size: 10))
                            .foregroundStyle(.tertiary)
                    }
                }
            }

            Text("Fans receive these without granting permission.")
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Color(.tertiaryLabel))
        }
        .padding(14)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal, 16)
    }
}

// MARK: - Notification Window Pill

struct NotificationWindowPill: View {
    let startDate: Date
    let onTap: () -> Void
    @State private var remaining: TimeInterval = 8 * 3600

    private let timer = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 4) {
                Image(systemName: "bell.fill")
                    .font(.system(size: 9, weight: .semibold))
                Text("8h")
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
            }
            .foregroundStyle(.orange)
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .glassEffect(.regular.interactive(), in: .capsule)
        }
        .onReceive(timer) { _ in
            remaining = max(0, 8 * 3600 - Date().timeIntervalSince(startDate))
        }
    }
}
