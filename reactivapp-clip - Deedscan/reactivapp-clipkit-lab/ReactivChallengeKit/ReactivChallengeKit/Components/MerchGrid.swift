//  MerchGrid.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

/// A 2-column grid of merch products. Embeds in a parent ScrollView.
struct MerchGrid: View {
    let products: [Product]
    let onAddToCart: (Product) -> Void

    private let columns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10),
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 10) {
            ForEach(products) { product in
                MerchProductCard(product: product) {
                    onAddToCart(product)
                }
            }
        }
        .padding(.horizontal, 16)
    }
}
