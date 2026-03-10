import SwiftUI

struct TournamentHomeView: View {
    let userId: String
    @StateObject private var vm = TournamentViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Loading tournament…")
                } else if let tournament = vm.activeTournament {
                    ActiveTournamentView(tournament: tournament, userId: userId, vm: vm)
                } else {
                    NoTournamentView()
                }
            }
            .navigationTitle("FishLeague")
        }
        .task { await vm.loadActive() }
    }
}

private struct ActiveTournamentView: View {
    let tournament: Tournament
    let userId: String
    @ObservedObject var vm: TournamentViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                TournamentHeaderCard(tournament: tournament)

                HStack(spacing: 16) {
                    NavigationLink {
                        SubmissionFlowView(tournament: tournament)
                    } label: {
                        ActionCard(title: "Submit Catch", icon: "camera.fill", color: .teal)
                    }

                    NavigationLink {
                        LeaderboardView(tournament: tournament, userId: userId)
                    } label: {
                        ActionCard(title: "Leaderboard", icon: "list.number", color: .blue)
                    }
                }
                .padding(.horizontal)

                if !vm.mySubmissions.isEmpty {
                    MySubmissionsSection(submissions: vm.mySubmissions)
                }
            }
            .padding(.top)
        }
        .task { await vm.loadMySubmissions(tournamentId: tournament.id) }
    }
}

private struct TournamentHeaderCard: View {
    let tournament: Tournament

    var body: some View {
        VStack(spacing: 8) {
            Text(tournament.name)
                .font(.title3.bold())
            HStack {
                Image(systemName: "calendar")
                Text(formatRange(tournament.startsAt, tournament.endsAt))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Text("● LIVE")
                .font(.caption.bold())
                .foregroundStyle(.green)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(14)
        .padding(.horizontal)
    }

    private func formatRange(_ start: Date, _ end: Date) -> String {
        let f = DateFormatter()
        f.dateStyle = .short
        f.timeStyle = .short
        return "\(f.string(from: start)) – \(f.string(from: end))"
    }
}

private struct ActionCard: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundStyle(color)
            Text(title)
                .font(.subheadline.bold())
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(14)
    }
}

private struct MySubmissionsSection: View {
    let submissions: [MySubmission]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("My Submissions")
                .font(.headline)
                .padding(.horizontal)

            ForEach(submissions) { s in
                HStack {
                    Text(String(format: "%.1f cm", s.fishLengthCm))
                        .font(.subheadline.bold())
                    Spacer()
                    StatusBadge(status: s.status)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color(.secondarySystemGroupedBackground))
                .cornerRadius(10)
                .padding(.horizontal)
            }
        }
    }
}

private struct StatusBadge: View {
    let status: String

    var color: Color {
        switch status {
        case "APPROVED": return .green
        case "REJECTED": return .red
        case "FLAGGED": return .orange
        default: return .yellow
        }
    }

    var body: some View {
        Text(status)
            .font(.caption.bold())
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color)
            .cornerRadius(8)
    }
}

private struct NoTournamentView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "fish")
                .font(.system(size: 64))
                .foregroundStyle(.teal.opacity(0.4))
            Text("No Active Tournament")
                .font(.title3.bold())
            Text("Check back soon for the next weekly tournament.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
