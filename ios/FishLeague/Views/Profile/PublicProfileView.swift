import SwiftUI

// MARK: - Public Angler Profile View (view other anglers)

struct PublicProfileView: View {
    let username: String

    @StateObject private var vm = ProfileViewModel()
    @State private var profile: AnglerProfile?
    @State private var followLoading = false

    var body: some View {
        ZStack {
            Color(hex: "#0d1821").ignoresSafeArea()

            if vm.isLoading {
                ProgressView().tint(.white)
            } else if let p = profile {
                ScrollView {
                    VStack(spacing: 0) {

                        // Follow button row (injected above main content)
                        if p.allowFollowers {
                            HStack {
                                Spacer()
                                Button {
                                    Task { await toggleFollow() }
                                } label: {
                                    if followLoading {
                                        ProgressView().tint(.white).scaleEffect(0.8)
                                    } else {
                                        Text(p.isFollowing == true ? "Following" : "+ Follow")
                                            .fontWeight(.bold).font(.subheadline)
                                    }
                                }
                                .padding(.horizontal, 18).padding(.vertical, 8)
                                .background(p.isFollowing == true ? Color.clear : Color(hex: "#2ecc71"))
                                .foregroundColor(p.isFollowing == true ? Color(hex: "#7a9bbf") : Color(hex: "#0d1821"))
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(p.isFollowing == true ? Color(hex: "#2a3f55") : Color.clear, lineWidth: 1))
                                .cornerRadius(8)
                                .disabled(followLoading)
                            }
                            .padding(.horizontal).padding(.top, 16)
                        }

                        ProfileContent(profile: p, isOwn: false)
                    }
                }
            } else if let err = vm.errorMessage {
                VStack(spacing: 12) {
                    Image(systemName: "person.slash").font(.system(size: 50)).foregroundColor(Color(hex: "#4a6580"))
                    Text(err).foregroundColor(Color(hex: "#7a9bbf")).multilineTextAlignment(.center)
                }
                .padding()
            }
        }
        .navigationTitle("@\(username)")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            profile = await vm.loadPublicProfile(username: username)
        }
    }

    private func toggleFollow() async {
        guard var p = profile else { return }
        followLoading = true
        await vm.toggleFollow(profile: &p)
        profile = p
        followLoading = false
    }
}
