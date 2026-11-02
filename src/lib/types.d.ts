export type PackageManagerType = keyof typeof import("./packageManagers.js").PACKAGE_MANAGERS;

export interface QueueItem {
  id: string | number;
  domain: string;
  appName: string;
}

export type PackageQueues = Record<PackageManagerType, Map<string | number, QueueItem>>;

export interface ThemeConfig {
  monoFont: string;
  sansFont: string;
  background: string;
  window: string;
  text: string;
  accent: string;
}

export interface PackageManagerItem {
  type: PackageManagerType;
  id: string | number;
}

export interface AppItem {
  name: string;
  url: string;
  domain: string;
  pmData: PackageManagerItem[];
  chipHtml: string;
}

export interface AppSection {
  letter: string;
  apps: AppItem[];
}

export interface AppConfig {
  theme: Partial<ThemeConfig>;
  markdown: string;
  title: string;
  rawText: string;
  state?: AppSection[];
}

export interface EditorSession {
  draftText: string;
  initialText: string;
  isEditing: boolean;
}

export type SaveResult =
  | { valid: true; config: AppConfig }
  | { valid: false; config: AppConfig; error: string };
