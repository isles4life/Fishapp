import Foundation

enum QRValidationResult {
    case valid(code: String)
    case invalidFormat
    case missing
}

struct QRValidator {
    static let expectedPrefix = "MAT-"

    static func validate(_ code: String?) -> QRValidationResult {
        guard let code, !code.isEmpty else { return .missing }
        guard code.hasPrefix(expectedPrefix), code.count > expectedPrefix.count else {
            return .invalidFormat
        }
        return .valid(code: code)
    }
}
