import SwiftUI
import AuthenticationServices

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var regions: [Region] = []

    private let api = APIClient.shared
    private let keychain = KeychainService.shared

    init() {
        isAuthenticated = keychain.get(key: "auth_token") != nil
    }

    func loadRegions() async {
        do {
            regions = try await api.request(path: "/users/regions")
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func register(email: String, password: String, displayName: String, regionId: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let body = RegisterRequest(email: email, password: password, displayName: displayName, regionId: regionId)
            let response: AuthResponse = try await api.request(path: "/auth/register", method: "POST", body: body)
            storeToken(response.token)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let body = LoginRequest(email: email, password: password)
            let response: AuthResponse = try await api.request(path: "/auth/login", method: "POST", body: body)
            storeToken(response.token)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func handleAppleSignIn(result: Result<ASAuthorization, Error>, regionId: String) async {
        isLoading = true
        defer { isLoading = false }

        switch result {
        case .success(let auth):
            guard let cred = auth.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = cred.identityToken,
                  let token = String(data: tokenData, encoding: .utf8) else {
                errorMessage = "Apple Sign In failed"
                return
            }

            let displayName = [cred.fullName?.givenName, cred.fullName?.familyName]
                .compactMap { $0 }.joined(separator: " ")

            do {
                let body = AppleLoginRequest(identityToken: token, displayName: displayName.isEmpty ? nil : displayName, regionId: regionId)
                let response: AuthResponse = try await api.request(path: "/auth/apple", method: "POST", body: body)
                storeToken(response.token)
            } catch {
                errorMessage = error.localizedDescription
            }

        case .failure(let error):
            errorMessage = error.localizedDescription
        }
    }

    func logout() {
        keychain.delete(key: "auth_token")
        isAuthenticated = false
    }

    private func storeToken(_ token: String) {
        keychain.set(key: "auth_token", value: token)
        isAuthenticated = true
    }
}
