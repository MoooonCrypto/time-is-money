require 'json'
# Pod name avoids clashing with Apple's own ScreenTime.framework module.

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'TimeIsMoneyScreenTime'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'UNLICENSED'
  s.author         = 'Time Is Money'
  s.homepage       = 'https://example.invalid/time-is-money'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'FamilyControls', 'DeviceActivity', 'ManagedSettings', 'SwiftUI'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  # Shared/*.swift are symlinks to targets/_shared/*.swift (the source of truth),
  # compiled into this pod as well as into every extension target.
  s.source_files = "*.swift", "Shared/*.swift"
end
