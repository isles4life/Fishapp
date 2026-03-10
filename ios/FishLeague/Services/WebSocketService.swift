import Foundation

protocol LeaderboardUpdateDelegate: AnyObject {
    func didReceiveLeaderboardUpdate(_ update: LeaderboardUpdate)
}

final class WebSocketService {
    static let shared = WebSocketService()

    weak var delegate: LeaderboardUpdateDelegate?
    private var task: URLSessionWebSocketTask?
    private var currentTournamentId: String?

    private let baseURL: String = {
        let api = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
            ?? "http://localhost:3000"
        return api.replacingOccurrences(of: "http", with: "ws")
            .replacingOccurrences(of: "https", with: "wss")
    }()

    func connect(tournamentId: String) {
        disconnect()
        currentTournamentId = tournamentId

        guard let url = URL(string: "\(baseURL)/leaderboard") else { return }
        let session = URLSession(configuration: .default)
        task = session.webSocketTask(with: url)
        task?.resume()

        sendSubscribe(tournamentId: tournamentId)
        receiveLoop()
    }

    func disconnect() {
        task?.cancel(with: .normalClosure, reason: nil)
        task = nil
        currentTournamentId = nil
    }

    private func sendSubscribe(tournamentId: String) {
        let payload = #"{"event":"subscribe","data":{"tournamentId":"\#(tournamentId)"}}"#
        task?.send(.string(payload)) { _ in }
    }

    private func receiveLoop() {
        task?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(.string(let text)):
                self.handleMessage(text)
                self.receiveLoop()
            case .success(.data):
                self.receiveLoop()
            case .failure:
                // Simple reconnect after 3s
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    if let id = self.currentTournamentId { self.connect(tournamentId: id) }
                }
            @unknown default:
                break
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }
        // Socket.IO wraps events; parse leaderboard:update payload
        if let wrapper = try? JSONDecoder().decode(SocketIOMessage.self, from: data),
           wrapper.event == "leaderboard:update",
           let payload = wrapper.data {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            if let update = try? decoder.decode(LeaderboardUpdate.self, from: payload) {
                DispatchQueue.main.async { self.delegate?.didReceiveLeaderboardUpdate(update) }
            }
        }
    }
}

private struct SocketIOMessage: Decodable {
    let event: String
    let data: Data?
}
