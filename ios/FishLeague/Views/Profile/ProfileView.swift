import SwiftUI

// MARK: - My Profile View (view + edit own profile)

struct ProfileView: View {
    @StateObject private var vm = ProfileViewModel()
    @State private var showEdit = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#0d1821").ignoresSafeArea()

                if vm.isLoading {
                    ProgressView().tint(.white)
                } else if let profile = vm.profile {
                    ProfileContent(profile: profile, isOwn: true) {
                        showEdit = true
                    }
                } else {
                    // First-time setup
                    VStack(spacing: 20) {
                        Image(systemName: "fish.fill")
                            .font(.system(size: 60))
                            .foregroundColor(Color(hex: "#2ecc71"))
                        Text("Set Up Your Angler Profile")
                            .font(.title2).fontWeight(.bold).foregroundColor(.white)
                        Text("Tell the FishLeague community who you are.")
                            .foregroundColor(Color(hex: "#7a9bbf")).multilineTextAlignment(.center)
                        Button("Create Profile") { showEdit = true }
                            .buttonStyle(GreenButtonStyle())
                    }
                    .padding(32)
                }
            }
            .navigationTitle("My Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if vm.profile != nil {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Edit") { showEdit = true }
                            .foregroundColor(Color(hex: "#2ecc71"))
                    }
                }
            }
            .sheet(isPresented: $showEdit, onDismiss: {
                Task { await vm.loadMyProfile() }
            }) {
                EditProfileSheet(existing: vm.profile, vm: vm)
            }
        }
        .task { await vm.loadMyProfile() }
    }
}

// MARK: - Shared profile content (own + public)

struct ProfileContent: View {
    let profile: AnglerProfile
    let isOwn: Bool
    var onEdit: (() -> Void)? = nil

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {

                // Header
                HStack(alignment: .top, spacing: 16) {
                    AsyncImage(url: URL(string: profile.profilePhotoUrl ?? "")) { img in
                        img.resizable().scaledToFill()
                    } placeholder: {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 50)).foregroundColor(Color(hex: "#2a3f55"))
                    }
                    .frame(width: 80, height: 80).clipShape(Circle())
                    .overlay(Circle().stroke(Color(hex: "#2a3f55"), lineWidth: 2))

                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Text(profile.user.displayName)
                                .font(.title2).fontWeight(.bold).foregroundColor(.white)
                            if profile.verifiedAngler {
                                Text("✓ VERIFIED")
                                    .font(.caption2).fontWeight(.heavy)
                                    .foregroundColor(Color(hex: "#3498db"))
                                    .padding(.horizontal, 6).padding(.vertical, 2)
                                    .background(Color(hex: "#3498db").opacity(0.15))
                                    .cornerRadius(6)
                            }
                        }
                        Text("@\(profile.username)")
                            .font(.subheadline).foregroundColor(Color(hex: "#4a6580"))

                        if let bio = profile.bio, !bio.isEmpty {
                            Text(bio).font(.footnote).foregroundColor(Color(hex: "#7a9bbf"))
                                .lineLimit(3)
                        }

                        HStack(spacing: 16) {
                            StatPill(value: "\(profile.followersCount)", label: "Followers")
                            StatPill(value: "\(profile.followingCount)", label: "Following")
                            if let city = profile.homeCity ?? profile.homeState {
                                Label(city, systemImage: "mappin.circle.fill")
                                    .font(.caption).foregroundColor(Color(hex: "#4a6580"))
                            }
                        }
                        .padding(.top, 4)
                    }
                    Spacer()
                }
                .padding(.horizontal)

                // Stats grid
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    StatCard(label: "Catches", value: "\(profile.stats.totalCatches)")
                    StatCard(label: "Tournaments", value: "\(profile.stats.totalTournamentsEntered)")
                    StatCard(label: "Wins", value: "\(profile.stats.tournamentsWon)")
                    StatCard(label: "Best Catch", value: profile.stats.largestCatchCm.map { String(format: "%.1f cm", $0) } ?? "—")
                    StatCard(label: "Avg Catch", value: profile.stats.averageCatchCm.map { String(format: "%.1f cm", $0) } ?? "—")
                    StatCard(label: "Sportsmanship", value: String(format: "%.1f ★", profile.sportsmanshipScore))
                }
                .padding(.horizontal)

                // Badges
                if !profile.badges.isEmpty {
                    ProfileSection(title: "Badges") {
                        FlowLayout(spacing: 8) {
                            ForEach(profile.badges, id: \.self) { badge in
                                Text("🏆 \(badge)")
                                    .font(.caption).fontWeight(.semibold)
                                    .foregroundColor(Color(hex: "#f0b429"))
                                    .padding(.horizontal, 12).padding(.vertical, 5)
                                    .background(Color(hex: "#f0b429").opacity(0.12))
                                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(hex: "#f0b429").opacity(0.3)))
                                    .cornerRadius(20)
                            }
                        }
                    }
                }

                // Fishing preferences
                if !profile.primarySpecies.isEmpty || !profile.favoriteTechniques.isEmpty || !profile.favoriteBaits.isEmpty {
                    ProfileSection(title: "Fishing Preferences") {
                        if !profile.primarySpecies.isEmpty {
                            TagRow(label: "Species", tags: profile.primarySpecies)
                        }
                        if !profile.favoriteTechniques.isEmpty {
                            TagRow(label: "Techniques", tags: profile.favoriteTechniques)
                        }
                        if !profile.favoriteBaits.isEmpty {
                            TagRow(label: "Baits", tags: profile.favoriteBaits)
                        }
                        if let waterType = profile.preferredWaterType {
                            HStack {
                                Text("Water").font(.caption).foregroundColor(Color(hex: "#4a6580"))
                                Text(waterType.label).font(.subheadline).foregroundColor(Color(hex: "#7a9bbf"))
                            }
                        }
                    }
                }

                // Gear
                let hasGear = profile.favoriteRod != nil || profile.favoriteReel != nil
                    || profile.favoriteLine != nil || profile.favoriteBoat != nil || !profile.sponsorTags.isEmpty
                if hasGear {
                    ProfileSection(title: "Gear") {
                        GearRow(label: "Rod", value: profile.favoriteRod)
                        GearRow(label: "Reel", value: profile.favoriteReel)
                        GearRow(label: "Line", value: profile.favoriteLine)
                        GearRow(label: "Boat", value: profile.favoriteBoat)
                        if !profile.sponsorTags.isEmpty {
                            TagRow(label: "Sponsors", tags: profile.sponsorTags)
                        }
                    }
                }

                Spacer(minLength: 40)
            }
            .padding(.top, 16)
        }
    }
}

// MARK: - Edit Profile Sheet

struct EditProfileSheet: View {
    let existing: AnglerProfile?
    @ObservedObject var vm: ProfileViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var username: String = ""
    @State private var bio: String = ""
    @State private var photoUrl: String = ""
    @State private var homeState: String = ""
    @State private var homeCity: String = ""
    @State private var country: String = ""
    @State private var primarySpecies: String = ""
    @State private var favoriteTechniques: String = ""
    @State private var favoriteBaits: String = ""
    @State private var waterType: WaterType? = nil
    @State private var favoriteRod: String = ""
    @State private var favoriteReel: String = ""
    @State private var favoriteLine: String = ""
    @State private var favoriteBoat: String = ""
    @State private var sponsorTags: String = ""
    @State private var allowFollowers: Bool = true
    @State private var publicProfile: Bool = true

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#0d1821").ignoresSafeArea()
                Form {
                    Section("Identity") {
                        FLTextField(label: "Username (3–20 chars)", text: $username, placeholder: "bass_master_99")
                        FLTextField(label: "Bio (max 250 chars)", text: $bio, placeholder: "Tell the community about yourself...")
                        FLTextField(label: "Profile Photo URL", text: $photoUrl, placeholder: "https://...")
                    }
                    .listRowBackground(Color(hex: "#162032"))

                    Section("Location") {
                        FLTextField(label: "State / Province", text: $homeState, placeholder: "Texas")
                        FLTextField(label: "City", text: $homeCity, placeholder: "Austin")
                        FLTextField(label: "Country", text: $country, placeholder: "USA")
                    }
                    .listRowBackground(Color(hex: "#162032"))

                    Section("Fishing Preferences") {
                        FLTextField(label: "Species (comma-separated)", text: $primarySpecies, placeholder: "Bass, Trout, Redfish")
                        FLTextField(label: "Techniques (comma-separated)", text: $favoriteTechniques, placeholder: "Fly, Spinning, Baitcasting")
                        FLTextField(label: "Baits (comma-separated)", text: $favoriteBaits, placeholder: "Crankbait, Jig, Live Shrimp")
                        Picker("Water Type", selection: $waterType) {
                            Text("Select…").tag(Optional<WaterType>.none)
                            ForEach(WaterType.allCases, id: \.self) { wt in
                                Text(wt.label).tag(Optional(wt))
                            }
                        }
                        .foregroundColor(Color(hex: "#e8f0fe"))
                    }
                    .listRowBackground(Color(hex: "#162032"))

                    Section("Gear") {
                        FLTextField(label: "Favorite Rod", text: $favoriteRod, placeholder: "Daiwa Tatula")
                        FLTextField(label: "Favorite Reel", text: $favoriteReel, placeholder: "Shimano Stradic")
                        FLTextField(label: "Favorite Line", text: $favoriteLine, placeholder: "20lb Fluorocarbon")
                        FLTextField(label: "Favorite Boat", text: $favoriteBoat, placeholder: "Ranger Z520C")
                        FLTextField(label: "Sponsor Tags (comma-separated)", text: $sponsorTags, placeholder: "Shimano, Rapala")
                    }
                    .listRowBackground(Color(hex: "#162032"))

                    Section("Privacy") {
                        Toggle("Public Profile", isOn: $publicProfile)
                            .foregroundColor(Color(hex: "#e8f0fe")).tint(Color(hex: "#2ecc71"))
                        Toggle("Allow Followers", isOn: $allowFollowers)
                            .foregroundColor(Color(hex: "#e8f0fe")).tint(Color(hex: "#2ecc71"))
                    }
                    .listRowBackground(Color(hex: "#162032"))

                    if let err = vm.errorMessage {
                        Section {
                            Text(err).foregroundColor(Color(hex: "#e74c3c")).font(.footnote)
                        }
                        .listRowBackground(Color.clear)
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle(existing == nil ? "Create Profile" : "Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }.foregroundColor(Color(hex: "#7a9bbf"))
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if vm.isSaving {
                        ProgressView().tint(.white)
                    } else {
                        Button("Save") { save() }
                            .fontWeight(.bold).foregroundColor(Color(hex: "#2ecc71"))
                    }
                }
            }
        }
        .onAppear { prefill() }
    }

    private func prefill() {
        guard let p = existing else { return }
        username = p.username; bio = p.bio ?? ""; photoUrl = p.profilePhotoUrl ?? ""
        homeState = p.homeState ?? ""; homeCity = p.homeCity ?? ""; country = p.country ?? ""
        primarySpecies = p.primarySpecies.joined(separator: ", ")
        favoriteTechniques = p.favoriteTechniques.joined(separator: ", ")
        favoriteBaits = p.favoriteBaits.joined(separator: ", ")
        waterType = p.preferredWaterType
        favoriteRod = p.favoriteRod ?? ""; favoriteReel = p.favoriteReel ?? ""
        favoriteLine = p.favoriteLine ?? ""; favoriteBoat = p.favoriteBoat ?? ""
        sponsorTags = p.sponsorTags.joined(separator: ", ")
        allowFollowers = p.allowFollowers; publicProfile = p.publicProfile
    }

    private func tags(_ raw: String) -> [String] {
        raw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }

    private func save() {
        let req = UpdateProfileRequest(
            username: username.isEmpty ? nil : username,
            bio: bio.isEmpty ? nil : bio,
            profilePhotoUrl: photoUrl.isEmpty ? nil : photoUrl,
            homeState: homeState.isEmpty ? nil : homeState,
            homeCity: homeCity.isEmpty ? nil : homeCity,
            country: country.isEmpty ? nil : country,
            primarySpecies: tags(primarySpecies),
            favoriteTechniques: tags(favoriteTechniques),
            favoriteBaits: tags(favoriteBaits),
            preferredWaterType: waterType?.rawValue,
            favoriteRod: favoriteRod.isEmpty ? nil : favoriteRod,
            favoriteReel: favoriteReel.isEmpty ? nil : favoriteReel,
            favoriteLine: favoriteLine.isEmpty ? nil : favoriteLine,
            favoriteBoat: favoriteBoat.isEmpty ? nil : favoriteBoat,
            sponsorTags: tags(sponsorTags),
            allowFollowers: allowFollowers,
            publicProfile: publicProfile
        )
        Task {
            await vm.saveProfile(req)
            if vm.errorMessage == nil { dismiss() }
        }
    }
}

// MARK: - Reusable sub-views

struct StatCard: View {
    let label: String; let value: String
    var body: some View {
        VStack(spacing: 4) {
            Text(value).font(.title3).fontWeight(.heavy).foregroundColor(Color(hex: "#2ecc71"))
            Text(label).font(.caption2).foregroundColor(Color(hex: "#4a6580"))
                .textCase(.uppercase).tracking(0.5).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 12)
        .background(Color(hex: "#1e2d40")).cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: "#2a3f55"), lineWidth: 1))
    }
}

struct StatPill: View {
    let value: String; let label: String
    var body: some View {
        VStack(spacing: 1) {
            Text(value).font(.subheadline).fontWeight(.bold).foregroundColor(Color(hex: "#e8f0fe"))
            Text(label).font(.caption2).foregroundColor(Color(hex: "#4a6580"))
        }
    }
}

struct ProfileSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.caption).fontWeight(.heavy)
                .foregroundColor(Color(hex: "#4a6580")).textCase(.uppercase).tracking(0.5)
            content()
        }
        .padding(16)
        .background(Color(hex: "#162032")).cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#2a3f55"), lineWidth: 1))
        .padding(.horizontal)
    }
}

struct TagRow: View {
    let label: String; let tags: [String]
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundColor(Color(hex: "#4a6580"))
            FlowLayout(spacing: 6) {
                ForEach(tags, id: \.self) { tag in
                    Text(tag).font(.caption).foregroundColor(Color(hex: "#7a9bbf"))
                        .padding(.horizontal, 10).padding(.vertical, 3)
                        .background(Color(hex: "#1e2d40"))
                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(hex: "#2a3f55")))
                        .cornerRadius(20)
                }
            }
        }
    }
}

struct GearRow: View {
    let label: String; let value: String?
    var body: some View {
        if let v = value, !v.isEmpty {
            HStack {
                Text(label).font(.caption).foregroundColor(Color(hex: "#4a6580")).frame(width: 50, alignment: .leading)
                Text(v).font(.subheadline).foregroundColor(Color(hex: "#7a9bbf"))
            }
        }
    }
}

struct FLTextField: View {
    let label: String
    @Binding var text: String
    let placeholder: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundColor(Color(hex: "#4a6580"))
            TextField(placeholder, text: $text)
                .foregroundColor(Color(hex: "#e8f0fe"))
                .autocorrectionDisabled()
        }
    }
}

/// Simple flow layout for tags
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        let height = rows.map { $0.map { $0.sizeThatFits(.unspecified).height }.max() ?? 0 }
            .reduce(0) { $0 + $1 } + CGFloat(max(rows.count - 1, 0)) * spacing
        return CGSize(width: proposal.width ?? 0, height: height)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        var y = bounds.minY
        for row in rows {
            var x = bounds.minX
            let rowH = row.map { $0.sizeThatFits(.unspecified).height }.max() ?? 0
            for view in row {
                let size = view.sizeThatFits(.unspecified)
                view.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
                x += size.width + spacing
            }
            y += rowH + spacing
        }
    }
    private func computeRows(proposal: ProposedViewSize, subviews: Subviews) -> [[LayoutSubviews.Element]] {
        var rows: [[LayoutSubviews.Element]] = [[]]
        var x: CGFloat = 0
        let maxW = proposal.width ?? .infinity
        for view in subviews {
            let w = view.sizeThatFits(.unspecified).width
            if x + w > maxW && !rows[rows.count - 1].isEmpty {
                rows.append([]); x = 0
            }
            rows[rows.count - 1].append(view)
            x += w + spacing
        }
        return rows
    }
}

struct GreenButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .fontWeight(.bold).foregroundColor(Color(hex: "#0d1821"))
            .padding(.horizontal, 28).padding(.vertical, 12)
            .background(Color(hex: "#2ecc71")).cornerRadius(10)
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

// Color hex extension (shared)
extension Color {
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var rgb: UInt64 = 0
        Scanner(string: h).scanHexInt64(&rgb)
        self.init(red: Double((rgb >> 16) & 0xff) / 255,
                  green: Double((rgb >> 8) & 0xff) / 255,
                  blue: Double(rgb & 0xff) / 255)
    }
}
