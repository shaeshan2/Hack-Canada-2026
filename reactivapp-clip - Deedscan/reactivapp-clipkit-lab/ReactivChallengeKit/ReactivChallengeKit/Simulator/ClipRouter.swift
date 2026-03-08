//  ClipRouter.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI
import UIKit

@Observable
final class ClipRouter {

    static let builtInExperiences: [any ClipExperience.Type] = [
        VenueMerchExperience.self,
        TrailCheckInExperience.self,
    ]

    static var allExperiences: [any ClipExperience.Type] {
        builtInExperiences + SubmissionRegistry.all
    }

    struct MatchResult: Identifiable {
        let id = UUID()
        let context: ClipContext
        let experienceType: any ClipExperience.Type
    }

    private(set) var currentMatch: MatchResult?
    private(set) var invocationHistory: [URL] = []
    private(set) var errorMessage: String?

    func invoke(urlString: String) {
        errorMessage = nil
        currentMatch = nil

        var normalized = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        if !normalized.contains("://") {
            normalized = "https://\(normalized)"
        }

        guard let url = URL(string: normalized) else {
            errorMessage = "Invalid URL: \(urlString)"
            return
        }

        invocationHistory.insert(url, at: 0)

        for experienceType in Self.allExperiences {
            if let params = match(url: url, against: experienceType.urlPattern) {
                let context = ClipContext(invocationURL: url, pathParameters: params)
                currentMatch = MatchResult(context: context, experienceType: experienceType)
#if !targetEnvironment(simulator)
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
#endif
                return
            }
        }

        errorMessage = "No clip registered for this URL"
    }

    func dismiss() {
        currentMatch = nil
        errorMessage = nil
    }

    static func sampleURL(for pattern: String) -> String {
        let defaults: [String: String] = [
            "name": "Hacker",
            "id": "42",
            "venueId": "rogers-centre",
            "showId": "tonight",
            "artistId": "jelly-roll",
            "boothId": "3",
            "param": "demo",
        ]
        let segments = pattern.split(separator: "/", omittingEmptySubsequences: true)
        let resolved = segments.map { segment -> String in
            if segment.hasPrefix(":") {
                let param = String(segment.dropFirst())
                return defaults[param] ?? param
            }
            return String(segment)
        }
        return resolved.joined(separator: "/")
    }

    // MARK: - Pattern Matching

    private func match(url: URL, against pattern: String) -> [String: String]? {
        let patternParts = pattern.split(separator: "/", omittingEmptySubsequences: true)
        guard let patternHost = patternParts.first else { return nil }

        let patternSegments = Array(patternParts.dropFirst())

        guard var host = url.host?.lowercased() else { return nil }
        if host.hasPrefix("www.") {
            host = String(host.dropFirst(4))
        }
        guard host == patternHost.lowercased() else { return nil }

        let urlSegments = url.pathComponents.filter { !$0.isEmpty && $0 != "/" }

        guard urlSegments.count == patternSegments.count else { return nil }

        var params: [String: String] = [:]

        for (urlSeg, patternSeg) in zip(urlSegments, patternSegments) {
            if patternSeg.hasPrefix(":") {
                let paramName = String(patternSeg.dropFirst())
                params[paramName] = urlSeg
            } else if urlSeg.lowercased() != patternSeg.lowercased() {
                return nil
            }
        }

        return params
    }
}

// MARK: - Type-erased View builder

extension ClipRouter.MatchResult {
    @ViewBuilder
    func makeView() -> some View {
        AnyClipView(experienceType: experienceType, context: context)
    }
}

private struct AnyClipView: View {
    let experienceType: any ClipExperience.Type
    let context: ClipContext

    var body: some View {
        AnyView(_makeExperience())
    }

    private func _makeExperience() -> any View {
        func open<T: ClipExperience>(_ type: T.Type) -> T {
            T(context: context)
        }
        return open(experienceType)
    }
}
