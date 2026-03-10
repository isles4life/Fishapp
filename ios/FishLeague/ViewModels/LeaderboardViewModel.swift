import SwiftUI

@MainActor
final class LeaderboardViewModel: ObservableObject, LeaderboardUpdateDelegate {
    @Published var entries: [LeaderboardEntry] = []
    @Published var myRank: UserRank?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api = APIClient.shared
    private let ws = WebSocketService.shared

    func load(tournamentId: String, userId: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let entriesTask: [LeaderboardEntry] = api.request(path: "/leaderboard/\(tournamentId)")
            async let rankTask: UserRank = api.request(path: "/leaderboard/\(tournamentId)/me")

            entries = try await entriesTask
            myRank = try await rankTask
        } catch {
            errorMessage = error.localizedDescription
        }

        ws.delegate = self
        ws.connect(tournamentId: tournamentId)
    }

    func disconnect() {
        ws.disconnect()
    }

    nonisolated func didReceiveLeaderboardUpdate(_ update: LeaderboardUpdate) {
        Task { @MainActor in
            self.entries = update.entries
        }
    }
}
