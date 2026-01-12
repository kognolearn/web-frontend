export function isDownloadRedirectEnabled() {
  const raw = process.env.NEXT_PUBLIC_FORCE_DOWNLOAD_REDIRECT || "";
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function getDownloadRedirectPath(fallbackPath = "/dashboard") {
  return isDownloadRedirectEnabled() ? "/download" : fallbackPath;
}
