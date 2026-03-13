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

// MARK: - Angler Profile

enum WaterType: String, Codable, CaseIterable {
    case freshwater = "FRESHWATER"
    case saltwater = "SALTWATER"
    case both = "BOTH"

    var label: String {
        switch self {
        case .freshwater: return "Freshwater"
        case .saltwater: return "Saltwater"
        case .both: return "Both"
        }
    }
}

struct AnglerStats: Decodable {
    let totalCatches: Int
    let totalTournamentsEntered: Int
    let tournamentsWon: Int
    let largestCatchCm: Double?
    let averageCatchCm: Double?
    let verifiedCatches: Int
}

struct AnglerAchievement: Decodable, Identifiable {
    let id: String
    let badge: String
    let earnedAt: Date
}

struct AnglerProfileUser: Decodable {
    let displayName: String
    let createdAt: Date
}

struct AnglerProfile: Decodable, Identifiable {
    let id: String
    let userId: String
    let username: String
    let bio: String?
    let profilePhotoUrl: String?
    let verifiedAngler: Bool
    let homeState: String?
    let homeCity: String?
    let country: String?
    let primarySpecies: [String]
    let favoriteTechniques: [String]
    let favoriteBaits: [String]
    let preferredWaterType: WaterType?
    let favoriteRod: String?
    let favoriteReel: String?
    let favoriteLine: String?
    let favoriteBoat: String?
    let sponsorTags: [String]
    let sportsmanshipScore: Double
    let followersCount: Int
    let followingCount: Int
    let allowFollowers: Bool
    let publicProfile: Bool
    let badges: [String]
    let lastActiveAt: Date
    let profileViews: Int
    let achievements: [AnglerAchievement]
    let stats: AnglerStats
    var isFollowing: Bool?
    let user: AnglerProfileUser
}

struct UpdateProfileRequest: Encodable {
    var username: String?
    var bio: String?
    var profilePhotoUrl: String?
    var homeState: String?
    var homeCity: String?
    var country: String?
    var primarySpecies: [String]?
    var favoriteTechniques: [String]?
    var favoriteBaits: [String]?
    var preferredWaterType: String?
    var favoriteRod: String?
    var favoriteReel: String?
    var favoriteLine: String?
    var favoriteBoat: String?
    var sponsorTags: [String]?
    var allowFollowers: Bool?
    var publicProfile: Bool?
}

struct FollowResponse: Decodable {
    let following: Bool
}

// MARK: - WebSocket

struct LeaderboardUpdate: Decodable {
    let tournamentId: String
    let entries: [LeaderboardEntry]
    let updatedAt: String
}
