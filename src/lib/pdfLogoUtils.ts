import { supabase } from "@/integrations/supabase/client";

export interface PdfLogo {
  dataUrl: string;
  w: number;
  h: number;
}

async function loadLogoFromUrl(url: string): Promise<PdfLogo | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

export async function loadHospitalLogos(hospitalId: string): Promise<{
  hospitalLogo: PdfLogo | null;
  scihLogos: PdfLogo[];
}> {
  try {
    const { data: logos } = await supabase
      .from("hospital_logos" as never)
      .select("logo_type, storage_path, display_order")
      .eq("hospital_id", hospitalId)
      .order("display_order");

    if (!(logos as any[])?.length) return { hospitalLogo: null, scihLogos: [] };

    const getUrl = (path: string) =>
      supabase.storage.from("hospital-logos").getPublicUrl(path).data.publicUrl;

    const ls = logos as any[];
    const hospitalRec = ls.find((l: any) => l.logo_type === "hospital");
    const scihRecs = ls.filter((l: any) => l.logo_type === "scih");

    const [hospitalLogo, ...scihResults] = await Promise.all([
      hospitalRec ? loadLogoFromUrl(getUrl(hospitalRec.storage_path)) : Promise.resolve(null),
      ...scihRecs.map((r: any) => loadLogoFromUrl(getUrl(r.storage_path))),
    ]);

    return {
      hospitalLogo,
      scihLogos: (scihResults as any[]).filter((l): l is PdfLogo => l !== null),
    };
  } catch {
    return { hospitalLogo: null, scihLogos: [] };
  }
}

/**
 * Renders hospital logo (left) and SCIH logos (right) into a jsPDF document header.
 * Returns the header height used (in mm).
 */
export function renderPdfLogos(
  doc: any,
  logos: { hospitalLogo: PdfLogo | null; scihLogos: PdfLogo[] },
  opts: { x?: number; y?: number; h?: number; pageW?: number } = {}
): number {
  const { hospitalLogo, scihLogos } = logos;
  const x = opts.x ?? 14;
  const y = opts.y ?? 0;
  const h = opts.h ?? 16;
  const pageW = opts.pageW ?? 210;

  if (hospitalLogo) {
    const lw = Math.min(48, (hospitalLogo.w / hospitalLogo.h) * h);
    doc.addImage(hospitalLogo.dataUrl, "PNG", x, y, lw, h);
  }

  if (scihLogos.length > 0) {
    let logoX = pageW - x;
    for (const logo of [...scihLogos].reverse().slice(0, 3)) {
      const lw = Math.min(34, (logo.w / logo.h) * h);
      logoX -= lw;
      doc.addImage(logo.dataUrl, "PNG", logoX, y, lw, h);
      logoX -= 2;
    }
  }

  return h;
}
