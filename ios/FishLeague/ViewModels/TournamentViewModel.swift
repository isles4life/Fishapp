import SwiftUI

@MainActor
final class TournamentViewModel: ObservableObject {
    @Published var activeTournament: Tournament?
    @Published var mySubmissions: [MySubmission] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api = APIClient.shared

    func loadActive() async {
        isLoading = true
        defer { isLoading = false }

        do {
            activeTournament = try await api.request(path: "/tournaments/active")
        } catch {
            // No active tournament is not a fatal error
            activeTournament = nil
        }
    }

    func loadMySubmissions(tournamentId: String) async {
        do {
            mySubmissions = try await api.request(path: "/submissions/mine?tournamentId=\(tournamentId)")
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
