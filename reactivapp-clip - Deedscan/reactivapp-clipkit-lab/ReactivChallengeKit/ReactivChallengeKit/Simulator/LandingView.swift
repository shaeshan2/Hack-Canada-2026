//  LandingView.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

struct LandingView: View {
    private static let reactivLogoURL = URL(string: "https://cdn.shopify.com/s/files/1/0654/2458/8973/files/reactiv_logo_lightbg-cropped_1322x342.png?v=1762787994")

    @Bindable var router: ClipRouter
    @State private var selectedTouchpoint: JourneyTouchpoint = .utility

    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: 14) {
                    labBanner
                        .padding(.top, 8)

                    journeyTimeline

                    contextStrip
                        .padding(.horizontal, 16)

                    clipsContent
                }
                .padding(.bottom, 20)
            }
            .scrollIndicators(.hidden)
        }
        .safeAreaInset(edge: .bottom, spacing: 8) {
            InvocationConsole(router: router)
                .padding(.bottom, 10)
        }
        .onAppear {
            if let first = availableTouchpoints.first {
                selectedTouchpoint = first
            }
        }
    }

    // MARK: - Header Banner

    private var labBanner: some View {
        return HStack(spacing: 14) {
            reactivLogoMark

            VStack(alignment: .leading, spacing: 3) {
                Text("ClipKit Lab")
                    .font(.system(size: 21, weight: .bold))
                    .foregroundStyle(.primary)
                Text("\(ClipRouter.allExperiences.count) experiences available")
                    .font(.system(size: 12))
                    .foregroundStyle(Color(.tertiaryLabel))
            }

            Spacer()
        }
        .padding(16)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 22))
        .padding(.horizontal, 16)
    }

    private var reactivLogoMark: some View {
        Group {
            if let url = Self.reactivLogoURL {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                    default:
                        Image(systemName: "appclip")
                            .font(.system(size: 26))
                            .foregroundStyle(.secondary)
                    }
                }
            } else {
                Image(systemName: "appclip")
                    .font(.system(size: 26))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 92, height: 44)
        .padding(.horizontal, 8)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - Journey Timeline

    private var journeyTimeline: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(availableTouchpoints) { touchpoint in
                        let isSelected = touchpoint == selectedTouchpoint
                        let clipCount = clipsForTouchpoint(touchpoint).count

                        Button {
                            withAnimation(.spring(duration: 0.3)) {
                                selectedTouchpoint = touchpoint
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: touchpoint.icon)
                                    .font(.system(size: 12, weight: .semibold))

                                Text(touchpoint.title)
                                    .font(.system(size: 13, weight: isSelected ? .bold : .medium))
                                    .lineLimit(1)

                                if clipCount > 0 {
                                    Text("\(clipCount)")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 18, height: 18)
                                        .background(.blue, in: .circle)
                                }
                            }
                            .foregroundStyle(isSelected ? .primary : .secondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .glassEffect(.regular.interactive(), in: .capsule)
                            .opacity(isSelected ? 1.0 : 0.78)
                        }
                        .buttonStyle(.plain)
                        .id(touchpoint)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
            }
            .scrollClipDisabled()
            .padding(.vertical, 4)
            .onChange(of: selectedTouchpoint) { _, newValue in
                withAnimation { proxy.scrollTo(newValue, anchor: .center) }
            }
        }
    }

    // MARK: - Context Strip

    private var contextStrip: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Image(systemName: selectedTouchpoint.icon)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.blue)
                Text(selectedTouchpoint.context)
                    .font(.system(size: 12))
                    .foregroundStyle(Color(.label))
            }

            HStack(spacing: 5) {
                Image(systemName: "bell.fill")
                    .font(.system(size: 9))
                    .foregroundStyle(.orange)
                Text(selectedTouchpoint.notificationHint)
                    .font(.system(size: 11))
                    .foregroundStyle(Color(.secondaryLabel))
            }
        }
    }

    // MARK: - Clips Content

    @ViewBuilder
    private var clipsContent: some View {
        let clips = clipsForTouchpoint(selectedTouchpoint)

        if clips.isEmpty {
            emptyState
                .padding(.top, 20)
        } else {
            VStack(spacing: 12) {
                ForEach(clips.indices, id: \.self) { i in
                    let exp = clips[i]
                    let sampleURL = ClipRouter.sampleURL(for: exp.urlPattern)
                    InvocationCard(
                        experience: exp,
                        sampleURL: sampleURL
                    ) {
                        router.invoke(urlString: sampleURL)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "plus.circle.dashed")
                .font(.system(size: 36))
                .foregroundStyle(Color(.quaternaryLabel))

            Text("No clips for \(selectedTouchpoint.title)")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(.tertiary)

            Text("Set touchpoint id = \"\(selectedTouchpoint.id)\"")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.blue.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    // MARK: - Helpers

    private var availableTouchpoints: [JourneyTouchpoint] {
        var seen: Set<String> = []
        let unique = ClipRouter.allExperiences.compactMap { experience -> JourneyTouchpoint? in
            let point = experience.touchpoint
            guard seen.insert(point.id).inserted else { return nil }
            return point
        }

        return unique.sorted {
            if $0.sortOrder == $1.sortOrder {
                return $0.title < $1.title
            }
            return $0.sortOrder < $1.sortOrder
        }
    }

    private func clipsForTouchpoint(_ touchpoint: JourneyTouchpoint) -> [any ClipExperience.Type] {
        ClipRouter.allExperiences.filter { $0.touchpoint == touchpoint }
    }
}

// MARK: - Invocation Card

struct InvocationCard: View {
    let experience: any ClipExperience.Type
    let sampleURL: String
    let onInvoke: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline) {
                    Text(experience.clipName)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.primary)
                    Spacer()
                    if experience.teamName != "Reactiv" {
                        Text(experience.teamName)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.blue)
                    }
                }

                Text(experience.clipDescription)
                    .font(.system(size: 13))
                    .foregroundStyle(Color(.label))
                    .lineLimit(2)
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 12)

            Button(action: onInvoke) {
                HStack(spacing: 10) {
                    Image(systemName: experience.invocationSource.icon)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.blue)
                        .frame(width: 32, height: 32)
                        .glassEffect(.regular.interactive(), in: .circle)

                    Text(experience.invocationSource.triggerLabel)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.blue)

                    Spacer()

                    Image(systemName: "arrow.right")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.tertiary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 10)
            .padding(.bottom, 12)
        }
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 22))
    }
}
