/** @typedef {import('./types.js').PackageManagerType} PackageManagerType */

/** @type {Record<PackageManagerType, string>} */
export const PACKAGE_MANAGERS = {
  // Cross-Platform
  brew: "brew install",
  brewcask: "brew install --cask",
  nix: "nix profile install",

  // Linux
  apt: "sudo apt install -y",
  dnf: "sudo dnf install -y",
  flatpak: "flatpak install -y",
  pacman: "sudo pacman -S --noconfirm",
  snap: "sudo snap install",
  zypper: "sudo zypper install -y",

  // macOS
  macports: "sudo port install",

  // Windows
  choco: "choco install -y",
  scoop: "scoop install",
  winget: "winget install -e --id",
};
