import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var displayName = ""
    @State private var selectedRegionId = ""

    var body: some View {
        Form {
            Section("Account Details") {
                TextField("Display Name", text: $displayName)
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                SecureField("Password (min 8 chars)", text: $password)
                    .textContentType(.newPassword)
            }

            Section("Region") {
                Picker("Select Region", selection: $selectedRegionId) {
                    Text("Choose…").tag("")
                    ForEach(authVM.regions) { r in
                        Text(r.name).tag(r.id)
                    }
                }
            }

            if let err = authVM.errorMessage {
                Section {
                    Text(err).foregroundStyle(.red).font(.caption)
                }
            }
        }
        .navigationTitle("Create Account")
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Register") {
                    Task {
                        await authVM.register(
                            email: email,
                            password: password,
                            displayName: displayName,
                            regionId: selectedRegionId
                        )
                        if authVM.isAuthenticated { dismiss() }
                    }
                }
                .disabled(authVM.isLoading || selectedRegionId.isEmpty)
            }
        }
    }
}
