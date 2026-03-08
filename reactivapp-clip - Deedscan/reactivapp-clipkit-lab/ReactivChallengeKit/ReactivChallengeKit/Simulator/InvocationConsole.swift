//  InvocationConsole.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

/// URL text field + invoke button. Replaces Associated Domains for simulation.
struct InvocationConsole: View {
    @Bindable var router: ClipRouter
    @State private var urlText = ""
    @FocusState private var isTextFieldFocused: Bool

    var body: some View {
        VStack(spacing: 8) {
            if let error = router.errorMessage {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.orange)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            GlassEffectContainer {
                HStack(spacing: 8) {
                    Image(systemName: "link")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.tertiary)

                    TextField("Enter invocation URL...", text: $urlText)
                        .font(.system(size: 15))
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .focused($isTextFieldFocused)
                        .onSubmit { invokeURL() }

                    if !urlText.isEmpty {
                        Button {
                            urlText = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(.tertiary)
                        }
                    }

                    Button(action: invokeURL) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(urlText.trimmingCharacters(in: .whitespaces).isEmpty ? Color.gray.opacity(0.3) : Color.blue)
                    }
                    .disabled(urlText.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .glassEffect(.regular.interactive(), in: .capsule)
            }
            .padding(.horizontal, 16)

            if !router.invocationHistory.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    GlassEffectContainer {
                        HStack(spacing: 6) {
                            ForEach(Array(router.invocationHistory.prefix(5).enumerated()), id: \.offset) { item in
                                let url = item.element
                                Button {
                                    urlText = url.absoluteString
                                        .replacingOccurrences(of: "https://", with: "")
                                    invokeURL()
                                } label: {
                                    Text(url.host ?? url.absoluteString)
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundStyle(.secondary)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .glassEffect(.regular.interactive(), in: .capsule)
                                }
                            }
                        }
                        .padding(.vertical, 6)
                    }
                }
                .scrollClipDisabled()
                .padding(.horizontal, 16)
                .padding(.top, 2)
                .padding(.bottom, 4)
            }
        }
        .animation(.easeOut(duration: 0.2), value: router.errorMessage)
    }

    private func invokeURL() {
        let trimmed = urlText.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        isTextFieldFocused = false
        router.invoke(urlString: trimmed)
    }
}
