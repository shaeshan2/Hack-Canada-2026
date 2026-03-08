//  ConstraintBanner.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

/// Non-dismissible banner replicating the real App Clip "Get the full app" bar.
struct ConstraintBanner: View {
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "appclip")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(.blue)

            VStack(alignment: .leading, spacing: 1) {
                Text("App Clip Preview")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.primary)
                Text("Get the full app experience")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text("GET")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.blue)
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .glassEffect(.regular.interactive(), in: .capsule)
        }
        .padding(14)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal, 16)
    }
}
