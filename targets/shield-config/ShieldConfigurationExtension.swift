// ShieldConfigurationExtension.swift
// Appearance of the Shield shown when a limited app is opened after its limit.
// Single button "閉じる" (handled by the Shield Action extension). No extend/unlock.

import ManagedSettings
import ManagedSettingsUI
import UIKit

class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  static let background = UIColor(red: 0.07, green: 0.09, blue: 0.13, alpha: 1)
  static let accent = UIColor(red: 0.98, green: 0.76, blue: 0.18, alpha: 1)

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    let record = TIMShieldController.record(containing: application.token, category: nil, webDomain: nil)
    return make(limitMinutes: record?.limitMinutes, name: application.localizedDisplayName)
  }

  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    let record = TIMShieldController.record(containing: application.token, category: category.token, webDomain: nil)
    return make(limitMinutes: record?.limitMinutes, name: application.localizedDisplayName)
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    let record = TIMShieldController.record(containing: nil, category: nil, webDomain: webDomain.token)
    return make(limitMinutes: record?.limitMinutes, name: webDomain.domain)
  }

  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
    let record = TIMShieldController.record(containing: nil, category: category.token, webDomain: webDomain.token)
    return make(limitMinutes: record?.limitMinutes, name: webDomain.domain)
  }

  private func make(limitMinutes: Int?, name: String?) -> ShieldConfiguration {
    // The name is optional in the public API; the text reads naturally without it.
    var subtitle = TIMCore.shieldSubtitle(limitMinutes: limitMinutes)
    if let name = name, !name.isEmpty {
      subtitle = "\(name)：" + subtitle
    }
    return ShieldConfiguration(
      backgroundBlurStyle: nil,
      backgroundColor: Self.background,
      icon: Self.logo(),
      title: ShieldConfiguration.Label(text: "今日の利用上限に達しました", color: .white),
      subtitle: ShieldConfiguration.Label(text: subtitle, color: UIColor(white: 0.85, alpha: 1)),
      primaryButtonLabel: ShieldConfiguration.Label(text: "閉じる", color: .white),
      primaryButtonBackgroundColor: .systemIndigo,
      secondaryButtonLabel: nil)
  }

  /// Time Is Money logo drawn in code (gold coin with ¥ and a clock hand),
  /// so the extension needs no asset catalog.
  static func logo() -> UIImage {
    let size = CGSize(width: 120, height: 120)
    return UIGraphicsImageRenderer(size: size).image { ctx in
      let rect = CGRect(origin: .zero, size: size).insetBy(dx: 6, dy: 6)
      accent.setFill()
      UIBezierPath(ovalIn: rect).fill()
      UIColor(red: 0.85, green: 0.6, blue: 0.08, alpha: 1).setStroke()
      let ring = UIBezierPath(ovalIn: rect.insetBy(dx: 6, dy: 6))
      ring.lineWidth = 4
      ring.stroke()
      let text = "¥" as NSString
      let attrs: [NSAttributedString.Key: Any] = [
        .font: UIFont.systemFont(ofSize: 56, weight: .heavy),
        .foregroundColor: background,
      ]
      let textSize = text.size(withAttributes: attrs)
      text.draw(at: CGPoint(x: (size.width - textSize.width) / 2, y: (size.height - textSize.height) / 2),
                withAttributes: attrs)
      _ = ctx
    }
  }
}
