export interface BuildrProviderConfig {
  id: string;
  label: string;
  baseUrl: string;
  apiKeyEnvVar: string;
  apiKey?: string;
}
