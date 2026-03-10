import Foundation

// MARK: - Auth

struct AuthResponse: Decodable {
    let token: String
    let userId: String
}

struct RegisterRequest: Encodable {
    let email: String
    let password: String
    let displayName: String
    let regionId: String
}

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct AppleLoginRequest: Encodable {
    let identityToken: String
    let displayName: String?
    let regionId: String
}

// MARK: - User

struct User: Decodable, Identifiable {
    let id: String
    let displayName: String
    let email: String?
    let regionId: String
    let authProvider: String
}

struct Region: Decodable, Identifiable {
    let id: String
    let name: String
}

// MARK: - Tournament

struct Tournament: Decodable, Identifiable {
    let id: String
    let name: String
    let weekNumber: Int
    let year: Int
    let startsAt: Date
    let endsAt: Date
    let isOpen: Bool
    let region: RegionSummary?

    struct RegionSummary: Decodable {
        let name: String
    }
}

// MARK: - Submission

struct SubmissionResult: Decodable {
    let submissionId: String
    let status: String
}

struct MySubmission: Decodable, Identifiable {
    let id: String
    let status: String
    let fishLengthCm: Double
    let capturedAt: Date
}

// MARK: - Leaderboard

struct LeaderboardEntry: Decodable, Identifiable {
    var id: String { userId }
    let rank: Int
    let userId: String
    let displayName: String
    let fishLengthCm: Double
}

struct UserRank: Decodable {
    let rank: Int?
    let fishLengthCm: Double?
}

// MARK: - WebSocket

struct LeaderboardUpdate: Decodable {
    let tournamentId: String
    let entries: [LeaderboardEntry]
    let updatedAt: String
}
