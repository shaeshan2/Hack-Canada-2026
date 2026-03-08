//  MerchProductCard.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

/// Displays a single merch product with name, price, and an add-to-cart action.
struct MerchProductCard: View {
    let product: Product
    let onAddToCart: () -> Void

    @State private var added = false

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: product.systemImage)
                .font(.system(size: 32))
                .foregroundStyle(.secondary)
                .frame(height: 50)

            Text(product.name)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.primary)
                .lineLimit(2)
                .multilineTextAlignment(.center)

            Text(product.formattedPrice)
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(.primary)

            Button {
                added = true
                onAddToCart()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    added = false
                }
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: added ? "checkmark" : "plus")
                        .font(.system(size: 11, weight: .bold))
                    Text(added ? "Added" : "Add")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundStyle(added ? .green : .blue)
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .glassEffect(.regular.interactive(), in: .capsule)
            }
            .animation(.easeInOut(duration: 0.2), value: added)
        }
        .padding(12)
        .frame(maxWidth: .infinity)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 16))
    }
}
