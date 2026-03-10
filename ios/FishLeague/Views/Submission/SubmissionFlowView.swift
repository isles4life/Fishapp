import SwiftUI

struct SubmissionFlowView: View {
    let tournament: Tournament
    @StateObject private var vm = SubmissionViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            switch vm.step {
            case .idle:
                IdleView(vm: vm)

            case .capturePhoto1:
                VStack(spacing: 0) {
                    Text("Photo 1: Fish on Measuring Mat")
                        .font(.headline)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color(.systemBackground))
                    Text("Ensure QR code on mat is visible")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.bottom, 4)
                    CameraView(detectQR: true) { image, qrCode in
                        switch QRValidator.validate(qrCode) {
                        case .valid:
                            vm.photo1Captured(image, qrCode: qrCode)
                        case .missing, .invalidFormat:
                            // Camera VC handles showing the alert; this won't fire
                            break
                        }
                    }
                }
                .ignoresSafeArea(edges: .bottom)

            case .capturePhoto2:
                VStack(spacing: 0) {
                    Text("Photo 2: Angler Holding Fish")
                        .font(.headline)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color(.systemBackground))
                    CameraView(detectQR: false) { image, _ in
                        vm.photo2Captured(image)
                    }
                }
                .ignoresSafeArea(edges: .bottom)

            case .review:
                ReviewView(vm: vm, tournament: tournament)

            case .uploading:
                ProgressView("Uploading submission…")
                    .progressViewStyle(.circular)
                    .padding()

            case .success(let id):
                SuccessView(submissionId: id) { dismiss() }

            case .failure(let msg):
                ErrorView(message: msg) {
                    vm.step = .review
                }
            }
        }
        .navigationTitle("Submit Catch")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Sub-views

private struct IdleView: View {
    @ObservedObject var vm: SubmissionViewModel

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "fish")
                .font(.system(size: 64))
                .foregroundStyle(.teal)
            Text("Submit Your Catch")
                .font(.title2.bold())
            Text("You'll take two photos:\n1. Fish on measuring mat (with QR)\n2. You holding the fish")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            Button("Start Submission") {
                vm.startSubmission()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}

private struct ReviewView: View {
    @ObservedObject var vm: SubmissionViewModel
    let tournament: Tournament

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let p1 = vm.photo1 {
                    ReviewPhotoRow(label: "Photo 1 – Fish on mat", image: p1)
                }
                if let p2 = vm.photo2 {
                    ReviewPhotoRow(label: "Photo 2 – Angler", image: p2)
                }

                if let qr = vm.detectedQRCode {
                    Label("QR: \(qr)", systemImage: "qrcode").foregroundStyle(.green)
                }

                HStack {
                    Text("Fish length (cm)")
                    Spacer()
                    TextField("e.g. 45.5", value: $vm.fishLengthCm, format: .number)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 100)
                }

                if let loc = vm.gpsLocation {
                    Label(String(format: "GPS %.5f, %.5f", loc.latitude, loc.longitude),
                          systemImage: "location.fill")
                    .foregroundStyle(.blue)
                } else {
                    Label("Acquiring GPS…", systemImage: "location")
                        .foregroundStyle(.orange)
                }

                Button("Submit") {
                    Task { await vm.submit(tournamentId: tournament.id) }
                }
                .buttonStyle(.borderedProminent)
                .disabled(vm.fishLengthCm <= 0 || vm.gpsLocation == nil)
                .frame(maxWidth: .infinity)
            }
            .padding()
        }
    }
}

private struct ReviewPhotoRow: View {
    let label: String
    let image: UIImage

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 200)
                .cornerRadius(10)
        }
    }
}

private struct SuccessView: View {
    let submissionId: String
    let onDone: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 64))
                .foregroundStyle(.green)
            Text("Submission Received!")
                .font(.title2.bold())
            Text("Your catch is pending moderation.\nYou'll appear on the leaderboard once approved.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            Button("Done", action: onDone)
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}

private struct ErrorView: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.red)
            Text("Submission Failed")
                .font(.title3.bold())
            Text(message)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            Button("Try Again", action: onRetry)
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
