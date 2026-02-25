export interface BuildrInitConfig {
  schemaVersion: 1;
  createdAt: string;
  workspace: string;
}

export const buildInitConfig = (workspaceName: string, now: Date = new Date()): BuildrInitConfig => {
  return {
    schemaVersion: 1,
    createdAt: now.toISOString(),
    workspace: workspaceName
  };
};
