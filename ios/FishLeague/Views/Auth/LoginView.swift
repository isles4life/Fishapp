import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showRegister = false
    @State private var selectedRegionId = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    // Logo
                    VStack(spacing: 8) {
                        Image(systemName: "fish.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(.teal)
                        Text("FishLeague")
                            .font(.largeTitle.bold())
                    }
                    .padding(.top, 40)

                    // Email / Password
                    VStack(spacing: 14) {
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .textFieldStyle(.roundedBorder)

                        SecureField("Password", text: $password)
                            .textContentType(.password)
                            .textFieldStyle(.roundedBorder)

                        if let err = authVM.errorMessage {
                            Text(err).foregroundStyle(.red).font(.caption)
                        }

                        Button("Sign In") {
                            Task { await authVM.login(email: email, password: password) }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(authVM.isLoading)
                        .frame(maxWidth: .infinity)
                    }
                    .padding(.horizontal)

                    // Divider
                    HStack {
                        Rectangle().frame(height: 1).foregroundStyle(.separator)
                        Text("or").font(.caption).foregroundStyle(.secondary)
                        Rectangle().frame(height: 1).foregroundStyle(.separator)
                    }
                    .padding(.horizontal)

                    // Apple Sign In (requires region selection first)
                    if !selectedRegionId.isEmpty {
                        SignInWithAppleButton(.signIn) { request in
                            request.requestedScopes = [.fullName, .email]
                        } onCompletion: { result in
                            Task { await authVM.handleAppleSignIn(result: result, regionId: selectedRegionId) }
                        }
                        .frame(height: 50)
                        .padding(.horizontal)
                    }

                    // Region picker (needed for Apple login)
                    if !authVM.regions.isEmpty {
                        Picker("Region", selection: $selectedRegionId) {
                            Text("Select region...").tag("")
                            ForEach(authVM.regions) { r in
                                Text(r.name).tag(r.id)
                            }
                        }
                        .pickerStyle(.menu)
                    }

                    Button("Create Account") { showRegister = true }
                        .font(.subheadline)
                }
                .padding(.bottom, 40)
            }
            .navigationDestination(isPresented: $showRegister) {
                RegisterView()
                    .environmentObject(authVM)
            }
        }
        .task { await authVM.loadRegions() }
    }
}
