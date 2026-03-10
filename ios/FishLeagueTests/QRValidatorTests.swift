import XCTest
@testable import FishLeague

final class QRValidatorTests: XCTestCase {
    func testValidQRCode() {
        let result = QRValidator.validate("MAT-0042")
        if case .valid(let code) = result {
            XCTAssertEqual(code, "MAT-0042")
        } else {
            XCTFail("Expected valid QR code")
        }
    }

    func testMissingQRCode() {
        if case .missing = QRValidator.validate(nil) { } else {
            XCTFail("Expected missing")
        }
    }

    func testEmptyQRCode() {
        if case .missing = QRValidator.validate("") { } else {
            XCTFail("Expected missing for empty string")
        }
    }

    func testInvalidPrefix() {
        if case .invalidFormat = QRValidator.validate("BADPREFIX-0001") { } else {
            XCTFail("Expected invalidFormat")
        }
    }

    func testPrefixOnlyIsInvalid() {
        if case .invalidFormat = QRValidator.validate("MAT-") { } else {
            XCTFail("Expected invalidFormat for prefix-only string")
        }
    }
}
