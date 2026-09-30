/**
 * Global API Configuration and Endpoint URL Resolver
 * 
 * Resolves API requests to the AWS Lambda Function URL in production,
 * and uses the Vite dev server proxy in development.
 */
export const LAMBDA_API_BASE_URL = "https://rpsal5rmqzrby3zg7kehgiabqa0gqqfe.lambda-url.us-east-1.on.aws";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "" : LAMBDA_API_BASE_URL);

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
    return cleanPath;
  }
  const base = API_BASE_URL || LAMBDA_API_BASE_URL;
  return `${base}${cleanPath}`;
}
