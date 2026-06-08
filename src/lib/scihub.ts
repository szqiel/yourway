export async function resolveSciHubUrl(doi: string): Promise<string> {
  const mirrors = [
    "https://sci-hub.se",
    "https://sci-hub.st",
    "https://sci-hub.ru",
  ];

  // Attempt to ping each mirror concurrently and take the first one that succeeds
  try {
    const promises = mirrors.map(async (mirror) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

        const res = await fetch(mirror, {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          return `${mirror}/${doi}`;
        }
      } catch (err) {
        // Silent catch for individual mirror failures
      }
      throw new Error("Failed mirror check");
    });

    // Promise.any returns the first promise that resolves successfully
    const url = await Promise.any(promises);
    return url;
  } catch (e) {
    // If all mirrors fail, return the default standard mirror
    return `https://sci-hub.se/${doi}`;
  }
}

/**
 * Scrapes a Sci-Hub mirror HTML page to find the underlying PDF source URL.
 */
async function scrapeSciHubPdfUrl(mirrorDoiUrl: string): Promise<string | null> {
  try {
    const res = await fetch(mirrorDoiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(6000), // 6s timeout for HTML fetching
    });

    if (!res.ok) {
      console.warn(`Failed to fetch Sci-Hub mirror HTML: Status ${res.status}`);
      return null;
    }

    const html = await res.text();

    // Pattern list to find the pdf source URL
    const urlPatterns = [
      // 1. iframe or embed with src pointing to pdf or downloads
      /<(?:iframe|embed)[^>]+src=["']([^"']*(?:\.pdf|downloads)[^"']*)["']/i,
      // 2. any src/href with id="pdf"
      /id=["']pdf["'][^>]+(?:src|href)=["']([^"']+)["']/i,
      /(?:src|href)=["']([^"']+)["'][^>]+id=["']pdf["']/i,
      // 3. general iframe or embed src
      /<(?:iframe|embed)[^>]+src=["']([^"']+)["']/i,
      // 4. any link containing .pdf or downloads
      /(?:href|src)=["']([^"']+\.pdf[^"']*)["']/i,
    ];

    for (const pattern of urlPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let url = match[1].trim();
        // Resolve relative or protocol-relative URLs
        if (url.startsWith("//")) {
          url = "https:" + url;
        } else if (url.startsWith("/")) {
          const origin = new URL(mirrorDoiUrl).origin;
          url = origin + url;
        } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
          const origin = new URL(mirrorDoiUrl).origin;
          url = origin + "/" + url;
        }
        return url;
      }
    }
  } catch (err) {
    console.error("Error scraping Sci-Hub page HTML:", err);
  }
  return null;
}

/**
 * Downloads a PDF binary from Sci-Hub or a direct URL and returns a Buffer.
 */
export async function downloadPdfFromSciHubOrUrl(doi: string, externalPdfUrl?: string): Promise<Buffer> {
  const mirrors = [
    "https://sci-hub.se",
    "https://sci-hub.st",
    "https://sci-hub.ru",
  ];

  // 1. Try Sci-Hub mirrors first
  if (doi) {
    const cleanDoi = doi.trim();
    for (const mirror of mirrors) {
      try {
        const mirrorDoiUrl = `${mirror}/${cleanDoi}`;
        console.log(`Scraping PDF URL from mirror: ${mirrorDoiUrl}`);
        const pdfUrl = await scrapeSciHubPdfUrl(mirrorDoiUrl);
        if (pdfUrl) {
          console.log(`Found PDF URL: ${pdfUrl}. Downloading binary...`);
          const pdfRes = await fetch(pdfUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": mirror,
            },
            signal: AbortSignal.timeout(10000), // 10s timeout for download
          });

          if (pdfRes.ok) {
            const arrayBuffer = await pdfRes.arrayBuffer();
            return Buffer.from(arrayBuffer);
          } else {
            console.warn(`Failed to download PDF from URL: ${pdfUrl}. Status: ${pdfRes.status}`);
          }
        }
      } catch (err) {
        console.error(`Error downloading from mirror ${mirror} for DOI ${cleanDoi}:`, err);
      }
    }
  }

  // 2. Try external open access PDF URL if Sci-Hub failed
  if (externalPdfUrl) {
    try {
      console.log(`Sci-Hub download failed. Trying external PDF URL: ${externalPdfUrl}`);
      const res = await fetch(externalPdfUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch (err) {
      console.error(`Failed to download from external PDF URL ${externalPdfUrl}:`, err);
    }
  }

  throw new Error("Could not retrieve PDF file from Sci-Hub mirrors or standard URL.");
}

