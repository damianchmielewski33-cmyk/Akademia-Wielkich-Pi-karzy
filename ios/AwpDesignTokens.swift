import SwiftUI

/// Kontrakt Design Systemu AWP — te same wartości co `lib/design-system.ts` i Android `AwpColors`.
enum AwpColor {
    static let navy = Color(red: 0x1A / 255, green: 0x2D / 255, blue: 0x5A / 255)
    static let purple = Color(red: 0x3D / 255, green: 0x2A / 255, blue: 0x6E / 255)
    static let pitch = Color(red: 0x00 / 255, green: 0xA6 / 255, blue: 0x51 / 255)
    static let gold = Color(red: 0xF5 / 255, green: 0xC5 / 255, blue: 0x18 / 255)
    static let teal = Color(red: 0x00 / 255, green: 0xC9 / 255, blue: 0xB1 / 255)
    static let red = Color(red: 0xE4 / 255, green: 0x00 / 255, blue: 0x2B / 255)
    static let murawa = Color(red: 0x06 / 255, green: 0x14 / 255, blue: 0x10 / 255)
    static let pageDark = Color(red: 0x0C / 255, green: 0x10 / 255, blue: 0x20 / 255)
}

enum AwpType {
    static let display = "Teko"
    static let ui = "SF Pro Text"
}

enum AwpSpace {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
}
