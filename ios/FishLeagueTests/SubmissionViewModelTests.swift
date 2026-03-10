import XCTest
@testable import FishLeague

@MainActor
final class SubmissionViewModelTests: XCTestCase {
    func testInitialState() {
        let vm = SubmissionViewModel()
        if case .idle = vm.step { } else {
            XCTFail("Initial step should be idle")
        }
        XCTAssertNil(vm.photo1)
        XCTAssertNil(vm.photo2)
        XCTAssertNil(vm.detectedQRCode)
        XCTAssertEqual(vm.fishLengthCm, 0)
    }

    func testPhoto1CapturedAdvancesStep() {
        let vm = SubmissionViewModel()
        let img = UIImage()
        vm.photo1Captured(img, qrCode: "MAT-0001")

        XCTAssertEqual(vm.detectedQRCode, "MAT-0001")
        if case .capturePhoto2 = vm.step { } else {
            XCTFail("After photo1, step should be capturePhoto2")
        }
    }

    func testPhoto2CapturedAdvancesStep() {
        let vm = SubmissionViewModel()
        vm.photo1Captured(UIImage(), qrCode: "MAT-0001")
        vm.photo2Captured(UIImage())

        if case .review = vm.step { } else {
            XCTFail("After photo2, step should be review")
        }
    }

    func testResetClearsState() {
        let vm = SubmissionViewModel()
        vm.photo1Captured(UIImage(), qrCode: "MAT-0001")
        vm.photo2Captured(UIImage())
        vm.fishLengthCm = 55.5
        vm.reset()

        XCTAssertNil(vm.photo1)
        XCTAssertNil(vm.photo2)
        XCTAssertNil(vm.detectedQRCode)
        XCTAssertEqual(vm.fishLengthCm, 0)
        if case .idle = vm.step { } else {
            XCTFail("After reset, step should be idle")
        }
    }

    func testSubmitFailsWithoutRequiredData() async {
        let vm = SubmissionViewModel()
        let fakeTournament = Tournament(
            id: "t1", name: "Test", weekNumber: 1, year: 2026,
            startsAt: Date(), endsAt: Date().addingTimeInterval(86400),
            isOpen: true, region: nil
        )
        // No photos, no QR, no GPS – should fail gracefully
        await vm.submit(tournamentId: fakeTournament.id)
        if case .failure = vm.step { } else {
            XCTFail("Should fail when required data is missing")
        }
    }
}
