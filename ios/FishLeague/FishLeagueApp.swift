import SwiftUI

@main
struct FishLeagueApp: App {
    @StateObject private var authVM = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            if authVM.isAuthenticated {
                let userId = KeychainService.shared.get(key: "user_id") ?? ""
                TabView {
                    TournamentHomeView(userId: userId)
                        .tabItem { Label("Tournament", systemImage: "fish.fill") }
                    ProfileView()
                        .tabItem { Label("Profile", systemImage: "person.crop.circle") }
                }
                .tint(Color(hex: "#2ecc71"))
                .environmentObject(authVM)
            } else {
                LoginView()
                    .environmentObject(authVM)
            }
        }
    }
}
