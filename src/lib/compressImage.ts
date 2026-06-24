interface CompressOptions {
  maxDimension?: number; // maior lado, em px
  quality?: number; // 0..1 (JPEG)
  /** Não comprime arquivos menores que isto (bytes). */
  skipUnder?: number;
}

/**
 * Comprime/redimensiona uma imagem no navegador via canvas.
 * Retorna um novo File (JPEG). Se algo falhar (ex.: HEIC não suportado
 * pelo canvas), devolve o arquivo original sem quebrar o fluxo.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const { maxDimension = 1600, quality = 0.7, skipUnder = 300 * 1024 } = opts;

  if (!file.type.startsWith("image/")) return file;
  if (file.size <= skipUnder) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });

    const { width, height } = img;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file; // não piorou? mantém original

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
