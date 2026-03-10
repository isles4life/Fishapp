import SwiftUI

@main
struct FishLeagueApp: App {
    @StateObject private var authVM = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            if authVM.isAuthenticated {
                // userId would normally come from decoding the stored JWT
                // For MVP, store userId in Keychain at login time
                let userId = KeychainService.shared.get(key: "user_id") ?? ""
                TournamentHomeView(userId: userId)
                    .environmentObject(authVM)
            } else {
                LoginView()
                    .environmentObject(authVM)
            }
        }
    }
}
