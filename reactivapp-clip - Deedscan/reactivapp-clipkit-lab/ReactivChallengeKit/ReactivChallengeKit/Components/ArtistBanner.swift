//  ArtistBanner.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

/// Artist name, tour name, and venue — styled like a concert poster header.
struct ArtistBanner: View {
    let artist: Artist
    var venue: String? = nil
    var showDate: String? = nil

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 12) {
                Image(systemName: artist.systemImage)
                    .font(.system(size: 24))
                    .foregroundStyle(.secondary)
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    Text(artist.name)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.primary)
                    Text(artist.tourName)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }

            if venue != nil || showDate != nil {
                HStack(spacing: 16) {
                    if let venue {
                        Label(venue, systemImage: "mappin.circle.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(Color(.tertiaryLabel))
                    }
                    if let showDate {
                        Label(showDate, systemImage: "calendar")
                            .font(.system(size: 12))
                            .foregroundStyle(Color(.tertiaryLabel))
                    }
                    Spacer()
                }
            }
        }
        .padding(16)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal, 16)
    }
}
