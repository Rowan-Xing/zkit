require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

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

  s.source_files = 'ios/**/*.{h,m,mm}'

  s.dependency 'React-Core'
end
