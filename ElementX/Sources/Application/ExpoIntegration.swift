//
// Copyright 2026 Element Creations Ltd.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial.
//

//
//  Element X iOS + Expo Brownfield demo
//
//  Bootstraps the embedded React Native runtime, seeds shared state with
//  a mock encrypted-rooms snapshot, listens for messages from the Safety
//  Dashboard RN screen, and observes the brownfield `popToNative`
//  notification so the JS-side dismiss API works.
//
//  The Safety Dashboard is presented on a dedicated `UIWindow` (alert
//  level + 1) so it stays above Element X's SwiftUI scene without
//  fighting the AppCoordinator's onboarding/main view swaps.
//

#if os(iOS)
public import Foundation
public import UIKit
internal import ElementXExpo

@objc public final class ExpoIntegration: NSObject {
    private static var overlayWindow: UIWindow?
    
    /// Call from AppDelegate.didFinishLaunchingWithOptions.
    @objc public static func bootstrap() {
        ReactNativeHostManager.shared.initialize()
        seedSharedState()
        registerMessageHandlers()
        observePopToNative()
    }
    
    @objc public static func makeSafetyDashboardViewController() -> UIViewController {
        let rn = ReactNativeViewController(moduleName: "main")
        rn.modalPresentationStyle = .fullScreen
        return rn
    }
    
    @objc public static func scheduleAutoPresentIfRequested() {
        guard UserDefaults.standard.bool(forKey: "ElementXExpoAutoPresent") else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            presentSafetyDashboard()
            if UserDefaults.standard.bool(forKey: "ElementXExpoAutoDemo") {
                scheduleDemoActions()
            }
        }
    }
    
    private static func scheduleDemoActions() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { verifyKeys() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 6.0) {
            BrownfieldMessaging.sendMessage([
                "type": "ROOM_OPENED",
                "name": "#expo-brownfield:matrix.org"
            ])
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 9.5) {
            NotificationCenter.default.post(name: Notification.Name("popToNative"),
                                            object: nil,
                                            userInfo: ["animated": true])
        }
    }
    
    private static func observePopToNative() {
        NotificationCenter.default.addObserver(forName: Notification.Name("popToNative"),
                                               object: nil,
                                               queue: .main) { _ in
            tearDownOverlay()
        }
    }
    
    private static func presentSafetyDashboard() {
        guard overlayWindow == nil,
              let scene = UIApplication.shared.connectedScenes
              .compactMap({ $0 as? UIWindowScene })
              .first(where: { $0.activationState == .foregroundActive }) ?? UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first else {
            return
        }
        let window = UIWindow(windowScene: scene)
        window.windowLevel = .alert + 1
        window.rootViewController = makeSafetyDashboardViewController()
        window.makeKeyAndVisible()
        overlayWindow = window
    }
    
    private static func tearDownOverlay() {
        guard let window = overlayWindow else { return }
        UIView.animate(withDuration: 0.25, animations: {
            window.alpha = 0
        }, completion: { _ in
            window.isHidden = true
            window.rootViewController = nil
            overlayWindow = nil
        })
    }
    
    private static func seedSharedState() {
        let now = ISO8601DateFormatter().string(from: Date())
        BrownfieldState.set("encryptedSessions", 24)
        BrownfieldState.set("verifiedDevices", 7)
        BrownfieldState.set("pendingInvites", 2)
        BrownfieldState.set("lastSyncedAt", now)
        BrownfieldState.set("rooms", sampleRooms())
    }
    
    private static func sampleRooms() -> [[String: Any]] {
        [
            [
                "id": 1,
                "name": "Element X iOS",
                "alias": "#element-x-ios:matrix.org",
                "initials": "EX",
                "color": "#0DBD8B",
                "preview": "alice: shipping the Compound update",
                "unread": 4,
                "encrypted": true
            ],
            [
                "id": 2,
                "name": "Matrix Rust SDK",
                "alias": "#matrix-rust-sdk:matrix.org",
                "initials": "MR",
                "color": "#9B51E0",
                "preview": "bob: bumped to 0.9.0 — sliding sync is faster",
                "unread": 12,
                "avatarUrl": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&q=70&auto=format&fit=crop",
                "encrypted": true
            ],
            [
                "id": 3,
                "name": "Brownfield WG",
                "alias": "#expo-brownfield:matrix.org",
                "initials": "BW",
                "color": "#0082C9",
                "preview": "gabriel: hostProvidedFrameworks landed",
                "unread": 0,
                "avatarUrl": "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200&q=70&auto=format&fit=crop",
                "encrypted": true
            ],
            [
                "id": 4,
                "name": "Coffee club",
                "alias": "#coffee:matrix.org",
                "initials": "CC",
                "color": "#EB5757",
                "preview": "carol: who's in for an afternoon refill?",
                "unread": 0,
                "encrypted": false
            ]
        ]
    }
    
    private static func registerMessageHandlers() {
        _ = BrownfieldMessaging.addListener { message in
            guard let type = message["type"] as? String else { return }
            switch type {
            case "OPEN_ROOM":
                openRoom(message)
            case "VERIFY_KEYS":
                verifyKeys()
            default:
                break
            }
        }
    }
    
    private static func openRoom(_ message: [String: Any?]) {
        BrownfieldMessaging.sendMessage([
            "type": "ROOM_OPENED",
            "id": (message["id"] ?? 0) as Any,
            "name": (message["name"] ?? "") as Any
        ])
    }
    
    private static func verifyKeys() {
        BrownfieldState.set("lastSyncedAt", ISO8601DateFormatter().string(from: Date()))
        BrownfieldState.set("verifiedDevices",
                            ((BrownfieldState.get("verifiedDevices") as? Int) ?? 0) + 1)
        BrownfieldMessaging.sendMessage(["type": "KEYS_VERIFIED"])
    }
}
#endif
