//  ClipContext.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import Foundation

/// Parsed invocation data passed to every ClipExperience.
struct ClipContext {
    let invocationURL: URL
    let pathParameters: [String: String]
    let queryParameters: [String: String]

    init(invocationURL: URL, pathParameters: [String: String] = [:]) {
        self.invocationURL = invocationURL
        self.pathParameters = pathParameters

        var query: [String: String] = [:]
        if let components = URLComponents(url: invocationURL, resolvingAgainstBaseURL: false),
           let items = components.queryItems {
            for item in items {
                query[item.name] = item.value ?? ""
            }
        }
        self.queryParameters = query
    }
}
