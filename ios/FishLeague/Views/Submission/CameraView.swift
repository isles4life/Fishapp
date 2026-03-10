import SwiftUI
import AVFoundation

/// In-app camera with optional QR code detection.
/// Set `detectQR = true` for Photo 1 (fish on mat).
struct CameraView: UIViewControllerRepresentable {
    let detectQR: Bool
    let onCapture: (UIImage, String?) -> Void   // image + optional QR code

    func makeUIViewController(context: Context) -> CameraViewController {
        let vc = CameraViewController()
        vc.detectQR = detectQR
        vc.onCapture = onCapture
        return vc
    }

    func updateUIViewController(_ uiViewController: CameraViewController, context: Context) {}
}

final class CameraViewController: UIViewController {
    var detectQR = false
    var onCapture: ((UIImage, String?) -> Void)?

    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer!
    private var photoOutput = AVCapturePhotoOutput()
    private var metadataOutput = AVCaptureMetadataOutput()
    private var captureButton: UIButton!
    private var detectedQR: String?
    private var qrOverlay: UILabel!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        setupSession()
        setupUI()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        session.stopRunning()
    }

    private func setupSession() {
        session.sessionPreset = .photo

        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device) else { return }

        session.addInput(input)
        session.addOutput(photoOutput)

        if detectQR {
            session.addOutput(metadataOutput)
            metadataOutput.setMetadataObjectsDelegate(self, queue: .main)
            metadataOutput.metadataObjectTypes = [.qr]
        }

        previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.videoGravity = .resizeAspectFill
        previewLayer.frame = view.layer.bounds
        view.layer.addSublayer(previewLayer)
    }

    private func setupUI() {
        // QR status overlay
        qrOverlay = UILabel()
        qrOverlay.text = detectQR ? "Scanning for QR..." : ""
        qrOverlay.textColor = .white
        qrOverlay.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        qrOverlay.textAlignment = .center
        qrOverlay.layer.cornerRadius = 8
        qrOverlay.clipsToBounds = true
        qrOverlay.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(qrOverlay)

        // Shutter button
        captureButton = UIButton(type: .system)
        captureButton.setTitle("📸", for: .normal)
        captureButton.titleLabel?.font = .systemFont(ofSize: 48)
        captureButton.backgroundColor = UIColor.white.withAlphaComponent(0.85)
        captureButton.layer.cornerRadius = 40
        captureButton.translatesAutoresizingMaskIntoConstraints = false
        captureButton.addTarget(self, action: #selector(capture), for: .touchUpInside)
        view.addSubview(captureButton)

        NSLayoutConstraint.activate([
            qrOverlay.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            qrOverlay.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            qrOverlay.widthAnchor.constraint(equalToConstant: 280),
            qrOverlay.heightAnchor.constraint(equalToConstant: 36),

            captureButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -32),
            captureButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            captureButton.widthAnchor.constraint(equalToConstant: 80),
            captureButton.heightAnchor.constraint(equalToConstant: 80),
        ])
    }

    @objc private func capture() {
        if detectQR && detectedQR == nil {
            let alert = UIAlertController(title: "QR Not Detected",
                                          message: "Please ensure the mat QR code is visible in the frame.",
                                          preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
            return
        }

        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }
}

// MARK: - Photo capture

extension CameraViewController: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let data = photo.fileDataRepresentation(),
              let image = UIImage(data: data) else { return }
        onCapture?(image, detectedQR)
    }
}

// MARK: - QR detection

extension CameraViewController: AVCaptureMetadataOutputObjectsDelegate {
    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard let obj = objects.first as? AVMetadataMachineReadableCodeObject,
              let value = obj.stringValue else { return }

        detectedQR = value
        qrOverlay.text = "✓ QR: \(value)"
        qrOverlay.backgroundColor = UIColor.systemGreen.withAlphaComponent(0.75)
    }
}
