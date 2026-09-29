cask "screenly" do
  arch arm: "arm64", intel: "x64"

  version "1.4.2"
  sha256 arm:   ":no_check",
         intel: ":no_check"

  url "https://github.com/iamadarsha/screenly/releases/download/v#{version}/Screenly-#{arch}.dmg"
  name "Screenly"
  desc "Local-first screen recording, editing, AI and publishing app"
  homepage "https://github.com/iamadarsha/screenly"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "Screenly.app"

  zap trash: [
    "~/Library/Application Support/Screenly",
    "~/Library/Preferences/app.screenly.desktop.plist",
    "~/Library/Saved Application State/app.screenly.desktop.savedState",
  ]
end
