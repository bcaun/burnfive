import SwiftUI

@main
struct LineBlastApp: App {
    var body: some Scene {
        WindowGroup {
            GameView()
                .ignoresSafeArea()
                .background(Color("LaunchBackground").ignoresSafeArea())
                .preferredColorScheme(nil)
        }
    }
}
