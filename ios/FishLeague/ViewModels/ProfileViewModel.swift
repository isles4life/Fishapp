import Foundation

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var profile: AnglerProfile?
    @Published var isLoading = false
    @Published var isSaving = false
    @Published var errorMessage: String?
    @Published var successMessage: String?

    // MARK: - Load own profile

    func loadMyProfile() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            profile = try await APIClient.shared.request(path: "/profile/me")
        } catch APIError.httpError(404) {
            profile = nil // not set up yet
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Upsert own profile

    func saveProfile(_ req: UpdateProfileRequest) async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            profile = try await APIClient.shared.request(path: "/profile/me", method: "PUT", body: req)
            successMessage = "Profile saved!"
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                self?.successMessage = nil
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Load public profile by username

    func loadPublicProfile(username: String) async -> AnglerProfile? {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            return try await APIClient.shared.request(path: "/profile/\(username)")
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    // MARK: - Follow / Unfollow

    func toggleFollow(profile: inout AnglerProfile) async {
        do {
            if profile.isFollowing == true {
                let _: FollowResponse = try await APIClient.shared.request(
                    path: "/profile/\(profile.username)/follow", method: "DELETE", body: Optional<String>.none)
                profile.isFollowing = false
            } else {
                let _: FollowResponse = try await APIClient.shared.request(
                    path: "/profile/\(profile.username)/follow", method: "POST", body: Optional<String>.none)
                profile.isFollowing = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
