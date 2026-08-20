/** Kompresja / skalowanie obrazu w przeglądarce przed uploadem (admin + profil). */

export type PrepareImageForUploadOptions = {
  maxBytes: number;
  /** Najdłuższa krawędź przy pierwszym przejściu (px). */
  maxEdge?: number;
  /** Preferowany MIME wyniku (domyślnie WebP, potem JPEG). */
  preferMime?: "image/webp" | "image/jpeg";
};

export type PrepareImageForUploadResult = {
  file: File;
  /** true, gdy plik został przeskalowany lub przekompresowany. */
  resized: boolean;
  originalBytes: number;
  finalBytes: number;
};

const EDGE_STEPS = [2560, 2048, 1600, 1280, 1024, 800, 640] as const;
const QUALITY_STEPS = [0.88, 0.78, 0.68, 0.58, 0.48, 0.38] as const;

function isSvg(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "image";
}

function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function drawScaled(
  source: ImageBitmap,
  maxEdge: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const longest = Math.max(source.width, source.height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Nie udało się przygotować podglądu obrazu (canvas).");
  }
  ctx.drawImage(source, 0, 0, width, height);
  return { canvas, width, height };
}

async function encodeUnderLimit(
  canvas: HTMLCanvasElement,
  maxBytes: number,
  preferMime: "image/webp" | "image/jpeg"
): Promise<{ blob: Blob; mime: string } | null> {
  const mimeOrder =
    preferMime === "image/jpeg" ? (["image/jpeg", "image/webp"] as const) : (["image/webp", "image/jpeg"] as const);

  for (const mime of mimeOrder) {
    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, mime, quality);
      if (blob && blob.size > 0 && blob.size <= maxBytes) {
        return { blob, mime };
      }
    }
  }
  return null;
}

/**
 * Jeśli plik mieści się w limicie — zwraca oryginał.
 * W przeciwnym razie skaluje i kompresuje (WebP/JPEG), aż zmieści się w `maxBytes`.
 * SVG nie jest przerabiane (wektor); zbyt duże SVG zwraca błąd.
 */
export async function prepareImageForUpload(
  file: File,
  options: PrepareImageForUploadOptions
): Promise<PrepareImageForUploadResult> {
  const maxBytes = options.maxBytes;
  const preferMime = options.preferMime ?? "image/webp";
  const originalBytes = file.size;

  if (!file.type.startsWith("image/") && !isSvg(file)) {
    throw new Error("Wybierz plik graficzny.");
  }

  if (isSvg(file)) {
    if (file.size > maxBytes) {
      throw new Error(
        "Plik SVG jest za duży. Uprość grafikę albo wgraj PNG/WebP/JPG — wtedy strona zmniejszy go automatycznie."
      );
    }
    return { file, resized: false, originalBytes, finalBytes: file.size };
  }

  if (file.size <= maxBytes) {
    return { file, resized: false, originalBytes, finalBytes: file.size };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await loadImageBitmap(file);
  } catch {
    throw new Error("Nie udało się odczytać zdjęcia. Spróbuj innego formatu (JPG, PNG, WebP).");
  }

  try {
    const startEdge = options.maxEdge ?? EDGE_STEPS[0];
    const edges: number[] = EDGE_STEPS.filter((e) => e <= startEdge);
    if (!edges.includes(startEdge)) {
      edges.unshift(startEdge);
    }

    for (const edge of edges) {
      const { canvas } = drawScaled(bitmap, edge);
      const encoded = await encodeUnderLimit(canvas, maxBytes, preferMime);
      if (encoded) {
        const ext = encoded.mime === "image/webp" ? "webp" : "jpg";
        const out = new File([encoded.blob], `${baseName(file.name)}.${ext}`, {
          type: encoded.mime,
          lastModified: Date.now(),
        });
        return {
          file: out,
          resized: true,
          originalBytes,
          finalBytes: out.size,
        };
      }
    }

    throw new Error(
      "Nie udało się zmniejszyć zdjęcia poniżej limitu. Wybierz inny kadr lub prostszy plik."
    );
  } finally {
    bitmap.close();
  }
}

export function formatBytesMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 1024 * 1024 ? 1 : 2)} MB`;
}
