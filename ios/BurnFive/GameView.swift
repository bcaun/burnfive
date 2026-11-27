import SwiftUI
import UIKit
import WebKit

/// Игра живет в папке www внутри приложения и открывается со схемы burnfive://localhost,
/// поэтому работает без интернета, а localStorage (рекорды, прогресс) сохраняется между запусками.
struct GameView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: BundleSchemeHandler.scheme)
        config.userContentController.add(context.coordinator, name: "bf")
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.suppressesIncrementalRendering = true
        // в приложении масштабирование страницы пальцами не нужно
        let viewport = "var m=document.querySelector('meta[name=viewport]');if(m)m.content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';"
        config.userContentController.addUserScript(WKUserScript(source: viewport, injectionTime: .atDocumentEnd, forMainFrameOnly: true))

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = UIColor(named: "LaunchBackground")
        web.scrollView.backgroundColor = .clear
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.alwaysBounceHorizontal = false
        web.scrollView.showsHorizontalScrollIndicator = false
        web.allowsLinkPreview = false
        web.allowsBackForwardNavigationGestures = false
        web.navigationDelegate = context.coordinator
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }
        #endif
        web.load(URLRequest(url: URL(string: "\(BundleSchemeHandler.scheme)://localhost/index.html")!))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        private let light = UIImpactFeedbackGenerator(style: .light)
        private let medium = UIImpactFeedbackGenerator(style: .medium)
        private let notify = UINotificationFeedbackGenerator()

        /// Сообщения из игры: window.webkit.messageHandlers.bf.postMessage({h: "light"})
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any], let kind = body["h"] as? String else { return }
            switch kind {
            case "light": light.impactOccurred()
            case "medium": medium.impactOccurred()
            case "success": notify.notificationOccurred(.success)
            case "warning": notify.notificationOccurred(.warning)
            default: break
            }
        }

        /// Внешние ссылки открываем в Safari, внутри приложения остается только сама игра
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = action.request.url, let scheme = url.scheme,
               scheme == "http" || scheme == "https", action.navigationType == .linkActivated {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        /// Если система выгрузила процесс страницы, просто загружаем игру заново
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }
    }
}

/// Отдает файлы из папки www внутри приложения по адресам burnfive://localhost/<файл>
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "burnfive"

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var name = (url.path as NSString).lastPathComponent
        if name.isEmpty || name == "/" { name = "index.html" }
        guard let file = Bundle.main.url(forResource: name, withExtension: nil, subdirectory: "www"),
              let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let ext = (name as NSString).pathExtension.lowercased()
        let type: String
        switch ext {
        case "html": type = "text/html; charset=utf-8"
        case "js": type = "application/javascript; charset=utf-8"
        case "css": type = "text/css; charset=utf-8"
        case "json": type = "application/json; charset=utf-8"
        case "png": type = "image/png"
        case "svg": type = "image/svg+xml"
        default: type = "application/octet-stream"
        }
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                       headerFields: ["Content-Type": type, "Content-Length": "\(data.count)",
                                                      "Cache-Control": "no-cache"])!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
