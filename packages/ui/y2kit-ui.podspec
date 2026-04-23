require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'y2kit-ui'
  s.version      = package['version']
  s.summary      = 'Native building blocks for y2kit-ui.'
  s.homepage     = 'https://example.invalid/y2kit-ui'
  s.license      = { :type => 'MIT' }
  s.author       = { 'y2kit' => 'dev@example.invalid' }
  s.platforms    = { :ios => '15.1' }
  s.source       = { :git => 'https://example.invalid/y2kit-ui.git', :tag => s.version.to_s }
  s.requires_arc = true

  s.source_files = 'ios/**/*.{h,m,mm}'

  s.dependency 'React-Core'
end
