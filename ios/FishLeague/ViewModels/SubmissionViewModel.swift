import SwiftUI
import CoreLocation
import AVFoundation

enum SubmissionStep {
    case idle
    case capturePhoto1
    case capturePhoto2
    case review
    case uploading
    case success(String)
    case failure(String)
}

@MainActor
final class SubmissionViewModel: ObservableObject {
    @Published var step: SubmissionStep = .idle
    @Published var photo1: UIImage?
    @Published var photo2: UIImage?
    @Published var detectedQRCode: String?
    @Published var fishLengthCm: Double = 0
    @Published var gpsLocation: CLLocationCoordinate2D?

    private let api = APIClient.shared
    private let locationManager = CLLocationManager()
    private var locationDelegate: LocationDelegate?

    func startSubmission() {
        requestLocation()
        step = .capturePhoto1
    }

    func photo1Captured(_ image: UIImage, qrCode: String?) {
        photo1 = image
        detectedQRCode = qrCode
        step = .capturePhoto2
    }

    func photo2Captured(_ image: UIImage) {
        photo2 = image
        step = .review
    }

    func submit(tournamentId: String) async {
        guard let photo1, let photo2,
              let photo1Data = photo1.jpegData(compressionQuality: 0.85),
              let photo2Data = photo2.jpegData(compressionQuality: 0.85),
              let qr = detectedQRCode,
              let location = gpsLocation else {
            step = .failure("Missing required data. Ensure GPS and QR are captured.")
            return
        }

        step = .uploading

        let fields: [String: String] = [
            "tournamentId": tournamentId,
            "matSerialCode": qr,
            "fishLengthCm": String(fishLengthCm),
            "gpsLat": String(location.latitude),
            "gpsLng": String(location.longitude),
            "capturedAt": ISO8601DateFormatter().string(from: Date()),
        ]

        do {
            let result = try await api.uploadSubmission(
                path: "/submissions",
                fields: fields,
                photo1: photo1Data,
                photo2: photo2Data
            )
            step = .success(result.submissionId)
        } catch {
            step = .failure(error.localizedDescription)
        }
    }

    func reset() {
        photo1 = nil
        photo2 = nil
        detectedQRCode = nil
        fishLengthCm = 0
        step = .idle
    }

    private func requestLocation() {
        let delegate = LocationDelegate { [weak self] coord in
            DispatchQueue.main.async { self?.gpsLocation = coord }
        }
        locationDelegate = delegate
        locationManager.delegate = delegate
        locationManager.requestWhenInUseAuthorization()
        locationManager.requestLocation()
    }
}

// Minimal delegate to avoid SubmissionViewModel conforming to NSObject
private final class LocationDelegate: NSObject, CLLocationManagerDelegate {
    private let onLocation: (CLLocationCoordinate2D) -> Void

    init(onLocation: @escaping (CLLocationCoordinate2D) -> Void) {
        self.onLocation = onLocation
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let loc = locations.first { onLocation(loc.coordinate) }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}
}
