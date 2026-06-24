import { useRef, useState } from "react";
import { Camera, ImagePlus, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { compressImage } from "@/lib/compressImage";

export interface PhotoItem {
  file: File;
  caption: string;
}

interface AuditPhotoUploadProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  disabled?: boolean;
  max?: number;
}

export function AuditPhotoUpload({ photos, onChange, disabled, max = 10 }: AuditPhotoUploadProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const addFiles = async (files: File[]) => {
    const incoming = files.filter((f) => f.type.startsWith("image/"));
    const slots = max - photos.length;
    const toAdd = incoming.slice(0, Math.max(0, slots));
    if (toAdd.length === 0) return;
    setProcessing(true);
    try {
      const compressed = await Promise.all(toAdd.map((f) => compressImage(f)));
      onChange([...photos, ...compressed.map((file) => ({ file, caption: "" }))].slice(0, max));
    } finally {
      setProcessing(false);
    }
  };

  const removeAt = (i: number) => onChange(photos.filter((_, idx) => idx !== i));

  const setCaption = (i: number, caption: string) =>
    onChange(photos.map((p, idx) => (idx === i ? { ...p, caption } : p)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const full = photos.length >= max;
  const busy = disabled || processing;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5" /> Fotos da auditoria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Anexe fotos como evidência — tire na hora pela câmera ou escolha da galeria/arquivos do celular.
          Você pode reordenar e adicionar uma legenda a cada foto. (Opcional)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2"
            disabled={busy || full} onClick={() => cameraRef.current?.click()}>
            <Camera className="h-4 w-4" /> Tirar foto
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2"
            disabled={busy || full} onClick={() => galleryRef.current?.click()}>
            <ImagePlus className="h-4 w-4" /> Galeria / Arquivo
          </Button>
          {processing && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Otimizando imagens…
            </span>
          )}
        </div>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ""; addFiles(fs); }} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ""; addFiles(fs); }} />

        {photos.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((item, i) => (
                <div key={`${item.file.name}-${i}`} className="rounded-md border bg-muted/30 overflow-hidden">
                  <div className="relative aspect-square bg-muted">
                    <img src={URL.createObjectURL(item.file)} alt={item.caption || `Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute top-1 left-1 rounded bg-black/60 text-white text-[10px] px-1.5 py-0.5">{i + 1}</span>
                    <button type="button" onClick={() => removeAt(i)} disabled={busy}
                      aria-label={`Remover foto ${i + 1}`}
                      className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1 hover:bg-black/80 disabled:opacity-50">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-1.5 space-y-1.5">
                    <Input
                      value={item.caption}
                      onChange={(e) => setCaption(i, e.target.value)}
                      placeholder="Legenda (opcional)"
                      disabled={busy}
                      className="h-7 text-xs"
                    />
                    <div className="flex items-center justify-between">
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                        disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Mover para trás">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                        disabled={busy || i === photos.length - 1} onClick={() => move(i, 1)} aria-label="Mover para frente">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {photos.length} foto(s) anexada(s){full ? ` — máximo de ${max} atingido` : ""}.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
