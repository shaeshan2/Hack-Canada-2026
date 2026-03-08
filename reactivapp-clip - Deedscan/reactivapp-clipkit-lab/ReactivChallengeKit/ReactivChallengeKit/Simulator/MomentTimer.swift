//  MomentTimer.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI
internal import Combine

/// Floating pill showing seconds since clip invocation. Green < 20s, yellow < 30s, red >= 30s.
struct MomentTimer: View {
    let startDate: Date
    @State private var elapsed: TimeInterval = 0

    private let timer = Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(dotColor)
                .frame(width: 7, height: 7)
            Text("\(Int(elapsed))s")
                .font(.system(size: 12, design: .monospaced).weight(.semibold))
                .foregroundStyle(.primary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .glassEffect(.regular.interactive(), in: .capsule)
        .onReceive(timer) { _ in
            elapsed = Date().timeIntervalSince(startDate)
        }
    }

    private var dotColor: Color {
        if elapsed >= 30 { return .red }
        if elapsed >= 20 { return .yellow }
        return .green
    }
}
