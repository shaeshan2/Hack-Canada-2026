//  CartSummary.swift
//  ReactivChallengeKit
//
//  Copyright © 2025 Reactiv Technologies Inc. All rights reserved.
//

import SwiftUI

/// Expandable cart summary showing items, total, and a checkout button.
struct CartSummary: View {
    let items: [Product]
    let onCheckout: () -> Void

    @State private var expanded = false

    private var total: Double {
        items.reduce(0) { $0 + $1.price }
    }

    private var itemCounts: [(product: Product, count: Int)] {
        var counts: [UUID: (product: Product, count: Int)] = [:]
        for item in items {
            if let existing = counts[item.id] {
                counts[item.id] = (existing.product, existing.count + 1)
            } else {
                counts[item.id] = (item, 1)
            }
        }
        return counts.values.sorted { $0.product.name < $1.product.name }
    }

    var body: some View {
        VStack(spacing: 0) {
            Button {
                withAnimation(.spring(duration: 0.3)) { expanded.toggle() }
            } label: {
                HStack {
                    Image(systemName: "cart.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.blue)
                    Text("\(items.count) item\(items.count == 1 ? "" : "s")")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.primary)
                    Spacer()
                    Text(String(format: "$%.2f", total))
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.primary)
                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.tertiary)
                }
                .padding(14)
            }
            .buttonStyle(.plain)

            if expanded {
                Divider()
                    .padding(.horizontal, 14)

                VStack(spacing: 6) {
                    ForEach(itemCounts, id: \.product.id) { entry in
                        HStack {
                            Text(entry.product.name)
                                .font(.system(size: 13))
                                .foregroundStyle(.secondary)
                            if entry.count > 1 {
                                Text("x\(entry.count)")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(.tertiary)
                            }
                            Spacer()
                            Text(String(format: "$%.2f", entry.product.price * Double(entry.count)))
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(.primary)
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
            }

            Button(action: onCheckout) {
                HStack(spacing: 8) {
                    Image(systemName: "creditcard.fill")
                        .font(.system(size: 14, weight: .semibold))
                    Text("Checkout — \(String(format: "$%.2f", total))")
                        .font(.system(size: 15, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(.blue, in: RoundedRectangle(cornerRadius: 14))
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 14)
            .padding(.top, 4)
        }
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal, 16)
    }
}
