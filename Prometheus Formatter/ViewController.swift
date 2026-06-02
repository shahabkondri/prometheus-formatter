import Cocoa
import SafariServices
import StoreKit
import WebKit

let extensionBundleIdentifier = "com.shahabkondri.prometheus-formatter.extension"
let appStoreReviewURL = URL(string: "macappstore://apps.apple.com/app/id6738227397?action=write-review")!
let appStoreReviewFallbackURL = URL(string: "https://apps.apple.com/app/id6738227397?action=write-review")!

class ViewController: NSViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!
    private let activeLaunchCountKey = "review.activeLaunchCount"
    private let lastVersionPromptedForReviewKey = "review.lastVersionPromptedForReview"
    private let minimumActiveLaunchesBeforeReviewPrompt = 3
    private var didScheduleReviewRequest = false

    override func viewDidLoad() {
        super.viewDidLoad()

        self.webView.navigationDelegate = self

        self.webView.configuration.userContentController.add(self, name: "controller")

        self.webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!, allowingReadAccessTo: Bundle.main.resourceURL!)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            guard let state = state, error == nil else {
                // Insert code to inform the user that something went wrong.
                return
            }

            DispatchQueue.main.async {
                if #available(macOS 13, *) {
                    webView.evaluateJavaScript("show(\(state.isEnabled), true)")
                } else {
                    webView.evaluateJavaScript("show(\(state.isEnabled), false)")
                }

                self.requestReviewAfterSustainedUseIfAppropriate(isExtensionEnabled: state.isEnabled)
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let action = message.body as? String else {
            return
        }

        switch action {
        case "open-preferences":
            SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
                DispatchQueue.main.async {
                    NSApplication.shared.terminate(nil)
                }
            }
        case "open-review-page":
            if !NSWorkspace.shared.open(appStoreReviewURL) {
                NSWorkspace.shared.open(appStoreReviewFallbackURL)
            }
        default:
            return
        }
    }

    private func requestReviewAfterSustainedUseIfAppropriate(isExtensionEnabled: Bool) {
        guard isExtensionEnabled, !didScheduleReviewRequest else {
            return
        }

        let defaults = UserDefaults.standard
        let activeLaunchCount = defaults.integer(forKey: activeLaunchCountKey) + 1
        defaults.set(activeLaunchCount, forKey: activeLaunchCountKey)

        guard activeLaunchCount >= minimumActiveLaunchesBeforeReviewPrompt else {
            return
        }

        let currentVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
        guard defaults.string(forKey: lastVersionPromptedForReviewKey) != currentVersion else {
            return
        }

        didScheduleReviewRequest = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            guard let self = self, self.view.window?.isVisible == true else {
                return
            }

            self.requestAppStoreReview()
            defaults.set(currentVersion, forKey: self.lastVersionPromptedForReviewKey)
        }
    }

    private func requestAppStoreReview() {
        if #available(macOS 15.0, *) {
            Task { @MainActor in
                AppStore.requestReview(in: self)
            }
        } else if #available(macOS 10.14, *) {
            SKStoreReviewController.requestReview()
        }
    }

}
