import { useRef, useState } from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { compressImage } from "@/lib/compressImage";

interface AuditPhotoUploadProps {
  photos: File[];
  onChange: (photos: File[]) => void;
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
      onChange([...photos, ...compressed].slice(0, max));
    } finally {
      setProcessing(false);
    }
  };

  const removeAt = (i: number) => onChange(photos.filter((_, idx) => idx !== i));

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
          Anexe fotos como evidência — tire na hora pela câmera ou escolha da galeria/arquivos do celular. (Opcional)
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
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {photos.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
                  <img src={URL.createObjectURL(file)} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeAt(i)} disabled={disabled}
                    aria-label={`Remover foto ${i + 1}`}
                    className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1 hover:bg-black/80 disabled:opacity-50">
                    <X className="h-3.5 w-3.5" />
                  </button>
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
