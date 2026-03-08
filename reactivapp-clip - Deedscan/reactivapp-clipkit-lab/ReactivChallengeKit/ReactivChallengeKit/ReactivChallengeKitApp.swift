//  ReactivChallengeKitApp.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

@main
struct ReactivChallengeKitApp: App {
    @State private var router = ClipRouter()

    var body: some Scene {
        WindowGroup {
            SimulatorShell(router: router)
        }
    }
}
