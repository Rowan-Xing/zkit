require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
new_arch_enabled = ENV['RCT_NEW_ARCH_ENABLED'] == '1'
new_arch_compiler_flags = '-DRCT_NEW_ARCH_ENABLED'

Pod::Spec.new do |s|
  s.name         = 'zkit-ui'
  s.version      = package['version']
  s.summary      = 'Native building blocks for zkit-ui.'
  s.homepage     = 'https://github.com/Concur-max/zkit/tree/main/packages/ui'
  s.license      = { :type => 'MIT' }
  s.author       = { 'zkit' => 'dev@example.invalid' }
  s.platforms    = { :ios => '15.1' }
  s.source       = { :git => 'https://github.com/Concur-max/zkit.git', :tag => s.version.to_s }
  s.requires_arc = true
  s.swift_version = '5.4'
  s.static_framework = true
  s.compiler_flags = new_arch_compiler_flags if new_arch_enabled

  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'OTHER_SWIFT_FLAGS' => "$(inherited) #{new_arch_enabled ? new_arch_compiler_flags : ''}"
  }

  s.dependency 'ExpoModulesCore'
  s.dependency 'React-Core'
  s.dependency 'SDWebImage'
end
