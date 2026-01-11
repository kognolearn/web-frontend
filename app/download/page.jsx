"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function detectOS() {
  if (typeof window === "undefined") return "windows";
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes("win")) return "windows";
  if (userAgent.includes("mac")) return "mac";
  if (userAgent.includes("linux")) return "linux";
  return "windows";
}

function detectMacArch() {
  // Try to detect Apple Silicon vs Intel Mac
  // This is a best-effort detection - users can always choose the other version
  if (typeof window === "undefined") return "arm64";

  // Check for Apple Silicon indicators
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl");
  if (gl) {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (renderer && renderer.toLowerCase().includes("apple")) {
        return "arm64"; // Apple GPU = Apple Silicon
      }
    }
  }

  // Default to arm64 for newer Macs (post-2020)
  return "arm64";
}

// Platform-specific icons
const platformIcons = {
  windows: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  ),
  mac: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  ),
  linux: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.002c-.06-.135-.12-.2-.184-.268h-.007c-.04-.047-.079-.067-.117-.133a.473.473 0 00-.119-.066c.025-.037.061-.074.061-.137 0-.027-.016-.07-.027-.07l.006-.004-.005-.003c-.012-.023-.025-.04-.04-.066-.036-.04-.076-.073-.12-.106-.2-.135-.36-.148-.407-.27-.135-.058-.167-.135-.267-.135-.135 0-.202.049-.267.049-.257.014-.29-.135-.29-.135h-.005c-.012-.001-.025.001-.038.003-.177.055-.308.135-.452.27-.107.135-.148.268-.148.603-.005.203.028.403.094.6.003.018.009.04.009.04v.004c.106.267.142.535.442.935.17.24.373.465.607.67.135.135.268.2.4.337.135.135.2.267.267.469-.14.135-.28.268-.367.336-.082.067-.282.2-.349.336l-.003-.003a.594.594 0 00-.049.07c-.016.018-.028.04-.043.054-.136.027-.19.135-.337.2-.054.03-.107.067-.16.07-.094.06-.09.133-.21.2a.549.549 0 01-.159.067h-.004c-.099.038-.198.062-.303.076-.14.04-.28.067-.416.135-.14.075-.28.137-.356.27-.12.135-.12.267-.18.403-.016.067-.04.133-.06.2a.295.295 0 01-.048.074c-.052.083-.119.135-.2.2-.14.073-.313.118-.49.135-.39.03-.78-.067-1.11-.2-.457-.2-.847-.537-1.109-.935-.013-.014-.024-.027-.034-.04-.11-.2-.176-.465-.24-.668-.065-.2-.126-.402-.154-.603-.006-.06-.008-.12-.01-.181h-.013v-.003-.003c-.128.03-.255.067-.373.135a.612.612 0 00-.153.104c-.14.135-.28.406-.39.6-.163.27-.32.537-.463.803a2.54 2.54 0 00-.116.535c-.003.047-.003.098-.003.136 0 .067.003.135.006.2a1.89 1.89 0 00.054.402c.02.135.046.267.086.4.026.135.06.267.103.4a.769.769 0 01-.202-.003c-.14-.04-.282-.135-.407-.202-.135-.075-.268-.135-.335-.27-.135-.2-.23-.47-.256-.736a2.12 2.12 0 01.067-.87c.066-.265.2-.535.326-.803.12-.273.25-.535.323-.804.075-.27.096-.533.043-.803-.02-.135-.047-.27-.1-.402a1.59 1.59 0 00-.166-.4c-.06-.135-.13-.27-.185-.4a1.325 1.325 0 01-.116-.47c-.01-.2.044-.403.135-.602.07-.135.157-.265.26-.4.102-.135.213-.27.316-.4.105-.135.2-.27.28-.4.075-.128.138-.265.18-.4.04-.14.06-.28.04-.422-.02-.142-.06-.28-.12-.402-.06-.135-.12-.27-.17-.4l-.003-.003c-.008-.02-.018-.04-.026-.058v-.002c-.053-.127-.12-.27-.133-.403-.007-.062-.007-.124.003-.18.015-.135.074-.265.16-.4.09-.134.197-.264.317-.398.12-.135.24-.27.35-.403.12-.135.22-.27.32-.403.1-.128.18-.265.24-.4a.781.781 0 00.087-.4.834.834 0 00-.1-.336.816.816 0 00-.25-.27c-.135-.067-.3-.135-.465-.135zm-1.406.663c.03.009.06.018.088.03.094.046.19.104.28.175.113.092.215.193.304.3.2.202.32.406.38.605.03.135.02.268-.02.402-.025.067-.058.135-.097.202-.04.067-.086.135-.135.202-.1.135-.206.27-.298.403-.093.135-.18.267-.254.4a1.17 1.17 0 00-.17.403c-.02.14-.007.282.04.422.03.07.068.14.107.2.002.002.004.003.005.005-.092.065-.193.135-.29.202l-.003.003c-.07-.037-.135-.074-.2-.11v-.002c-.085-.067-.17-.135-.248-.2a1.596 1.596 0 01-.16-.2c-.075-.135-.135-.27-.18-.403-.046-.135-.077-.27-.086-.4-.007-.078-.002-.155.018-.233.025-.074.07-.15.12-.22.05-.074.1-.15.15-.22.05-.075.09-.15.12-.22.03-.075.04-.15.03-.223-.01-.075-.04-.15-.086-.22a.968.968 0 00-.16-.2 1.57 1.57 0 00-.21-.17 1.276 1.276 0 00-.231-.12c.078-.068.16-.135.24-.198.105-.065.213-.14.32-.2.175-.135.375-.27.547-.4.153-.135.27-.267.35-.4l.003-.003.005-.008c.11.038.19.086.283.135.07.04.135.08.19.135l.06.06zm9.186 2.267c.01 0 .02.003.029.003.142.006.453.053.854.135.36.075.788.17 1.2.27.09.023.18.046.267.07.01.006.023.01.033.016h.002c.064.064.12.135.17.2.01.012.018.025.027.04.05.135.083.27.103.4.018.135.02.27.007.4-.012.13-.034.26-.066.4a2.1 2.1 0 01-.112.393l-.003.003a2.29 2.29 0 01-.163.334 1.95 1.95 0 01-.221.333l-.003.003a1.67 1.67 0 01-.28.27c-.096.067-.193.127-.292.18a.67.67 0 00-.037-.103c-.055-.107-.106-.214-.153-.32a.57.57 0 01-.05-.32c.013-.027.026-.04.04-.066v-.003c.013-.028.025-.04.04-.067l.003-.003c.027-.028.04-.053.067-.08l.003-.003a.6.6 0 00.067-.08l.003-.003c.026-.04.04-.067.066-.107.026-.04.04-.08.066-.12l.003-.003c.013-.04.027-.08.04-.12.013-.04.025-.08.035-.12a.55.55 0 00.013-.12v-.003c0-.04-.003-.08-.01-.12a.61.61 0 00-.028-.12c-.012-.04-.026-.08-.045-.12a.588.588 0 00-.058-.107 1.063 1.063 0 00-.16-.18l-.003-.003a.65.65 0 00-.08-.067.744.744 0 00-.093-.053c-.133-.053-.27-.094-.413-.12a4.76 4.76 0 00-.453-.053h-.003c-.12-.01-.24-.01-.36 0-.078.006-.153.016-.227.028-.045.008-.09.017-.134.027v-.005c-.067-.135-.135-.27-.2-.4a6.75 6.75 0 01-.174-.4c.075-.013.148-.03.224-.04.135-.026.274-.047.413-.06.062-.007.124-.01.186-.013z" />
    </svg>
  ),
};

// Platform display info (name, default file extension)
const platformInfo = {
  windows: { name: "Windows", defaultFile: "Kogno-Setup.exe" },
  mac: { name: "macOS", defaultFile: "Kogno.dmg" },
  "mac-intel": { name: "macOS (Intel)", defaultFile: "Kogno.dmg" },
  linux: { name: "Linux", defaultFile: "Kogno.AppImage" },
};

export default function DownloadPage() {
  const [detectedOS, setDetectedOS] = useState("windows");
  const [macArch, setMacArch] = useState("arm64");
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setDetectedOS(detectOS());
    setMacArch(detectMacArch());
  }, []);

  useEffect(() => {
    async function fetchLatestRelease() {
      try {
        setLoading(true);
        const response = await fetch("/api/releases/latest?platform=darwin");
        if (response.ok) {
          const data = await response.json();
          setReleaseInfo(data);
        } else if (response.status === 404) {
          setError("No releases available yet");
        } else {
          setError("Failed to fetch release info");
        }
      } catch {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    }
    fetchLatestRelease();
  }, []);

  // Build download URLs based on release version
  const getDownloadUrl = (platform) => {
    if (!releaseInfo?.version) return "#";

    // Map UI platform names to API platform keys
    const platformMap = {
      windows: "win32",
      mac: `darwin-${macArch}`,
      "mac-intel": "darwin-x64",
      linux: "linux",
    };

    const apiPlatform = platformMap[platform] || platform;
    return `/api/releases/download/${apiPlatform}/${releaseInfo.version}`;
  };

  // Get the primary platform info based on detected OS
  const getPrimaryPlatform = () => {
    if (detectedOS === "mac") {
      return {
        key: "mac",
        name: macArch === "arm64" ? "macOS (Apple Silicon)" : "macOS (Intel)",
        icon: platformIcons.mac,
        file: releaseInfo?.path || platformInfo.mac.defaultFile,
      };
    }
    return {
      key: detectedOS,
      name: platformInfo[detectedOS]?.name || "Windows",
      icon: platformIcons[detectedOS] || platformIcons.windows,
      file: releaseInfo?.path || platformInfo[detectedOS]?.defaultFile || "Kogno-Setup.exe",
    };
  };

  // Get other platforms to show in dropdown
  const getOtherPlatforms = () => {
    const platforms = [];

    if (detectedOS !== "windows") {
      platforms.push({
        key: "windows",
        name: "Windows",
        icon: platformIcons.windows,
        file: platformInfo.windows.defaultFile,
      });
    }

    if (detectedOS !== "mac") {
      platforms.push({
        key: "mac",
        name: "macOS (Apple Silicon)",
        icon: platformIcons.mac,
        file: platformInfo.mac.defaultFile,
      });
    }

    // Always show Intel Mac as an option
    if (detectedOS !== "mac" || macArch !== "x64") {
      platforms.push({
        key: "mac-intel",
        name: "macOS (Intel)",
        icon: platformIcons.mac,
        file: platformInfo.mac.defaultFile,
      });
    }

    if (detectedOS !== "linux") {
      platforms.push({
        key: "linux",
        name: "Linux",
        icon: platformIcons.linux,
        file: platformInfo.linux.defaultFile,
      });
    }

    return platforms;
  };

  const primaryPlatform = getPrimaryPlatform();
  const otherPlatforms = getOtherPlatforms();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12 overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.75)) 0%, transparent 100%)` }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.5)) 0%, transparent 100%)` }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold text-[var(--primary)]">
            Kogno
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 dark:border-white/5 bg-[var(--surface-1)]/80 backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Download Kogno</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Get the desktop app to unlock the full learning experience
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-4 mb-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
              <span className="ml-3 text-sm text-[var(--muted-foreground)]">Loading downloads...</span>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
              <p className="text-sm text-orange-500">{error}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Please check back later for download links
              </p>
            </div>
          )}

          {/* Primary download button */}
          {!loading && !error && (
            <>
              <a
                href={getDownloadUrl(primaryPlatform.key)}
                className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary)]/90 transition-all shadow-lg shadow-[var(--primary)]/20 mb-2"
              >
                <span className="text-white/90">{primaryPlatform.icon}</span>
                <span>Download for {primaryPlatform.name}</span>
              </a>
              {releaseInfo?.version && (
                <p className="text-center text-xs text-[var(--muted-foreground)] mb-4">
                  Version {releaseInfo.version}
                </p>
              )}
            </>
          )}

          {/* Other platforms toggle */}
          {!loading && !error && (
            <button
              onClick={() => setShowAllPlatforms(!showAllPlatforms)}
              className="w-full text-center text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-4"
            >
              {showAllPlatforms ? "Hide other platforms" : "Other platforms"}
            </button>
          )}

          {/* Other platforms */}
          {showAllPlatforms && !loading && !error && (
            <div className="space-y-2 mb-6">
              {otherPlatforms.map((platform) => (
                <a
                  key={platform.key}
                  href={getDownloadUrl(platform.key)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 bg-[var(--surface-2)]/50 text-[var(--foreground)] transition-all"
                >
                  <span className="text-[var(--muted-foreground)]">{platform.icon}</span>
                  <span className="text-sm">{platform.name}</span>
                  <span className="ml-auto text-xs text-[var(--muted-foreground)]">{platform.file}</span>
                </a>
              ))}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 pt-6 border-t border-white/10 dark:border-white/5">
            <h2 className="text-sm font-medium mb-3">After downloading:</h2>
            <ol className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs flex items-center justify-center">1</span>
                <span>Install and open the Kogno app</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs flex items-center justify-center">2</span>
                <span>Sign in with your account</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs flex items-center justify-center">3</span>
                <span>Create your first course to complete setup</span>
              </li>
            </ol>
          </div>

          {/* Help link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              Already have the app?{" "}
              <Link
                href="/auth/sign-in"
                className="font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
