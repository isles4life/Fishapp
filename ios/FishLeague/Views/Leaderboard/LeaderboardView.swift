import SwiftUI

struct LeaderboardView: View {
    let tournament: Tournament
    let userId: String

    @StateObject private var vm = LeaderboardViewModel()

    var body: some View {
        List {
            if let my = vm.myRank, let rank = my.rank {
                Section("Your Standing") {
                    HStack {
                        Text("Rank \(rank)")
                            .font(.headline)
                        Spacer()
                        if let len = my.fishLengthCm {
                            Text(String(format: "%.1f cm", len))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Section("Top 25") {
                if vm.isLoading {
                    ProgressView()
                } else {
                    ForEach(vm.entries) { entry in
                        LeaderboardRow(entry: entry, isMe: entry.userId == userId)
                    }
                }
            }
        }
        .navigationTitle(tournament.name)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await vm.load(tournamentId: tournament.id, userId: userId)
        }
        .onDisappear {
            vm.disconnect()
        }
        .overlay {
            if let err = vm.errorMessage {
                Text(err).foregroundStyle(.red).padding()
            }
        }
    }
}

private struct LeaderboardRow: View {
    let entry: LeaderboardEntry
    let isMe: Bool

    var body: some View {
        HStack(spacing: 14) {
            Text(medal(entry.rank))
                .font(.title3)
                .frame(width: 36)
            Text(entry.displayName)
                .fontWeight(isMe ? .bold : .regular)
            Spacer()
            Text(String(format: "%.1f cm", entry.fishLengthCm))
                .foregroundStyle(.secondary)
                .font(.subheadline)
        }
        .listRowBackground(isMe ? Color.blue.opacity(0.08) : Color.clear)
    }

    private func medal(_ rank: Int) -> String {
        switch rank {
        case 1: return "🥇"
        case 2: return "🥈"
        case 3: return "🥉"
        default: return "#\(rank)"
        }
    }
}
