import React, { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { ReportAgencyBrand } from './ReportAgencyBrand';

export interface AgencyBrandSettings { agencyName: string; logoUrl: string }

export function ReportBrandSettings({ value, onChange }: { value: AgencyBrandSettings; onChange: (value: AgencyBrandSettings) => void }) {
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const current = useRef(value);
  current.current = value;
  const upload = (file?: File) => {
    if (!file) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setError('Elegí un archivo PNG, JPG o WebP de hasta 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError('No se pudo leer la imagen. Probá con otro archivo.');
    reader.onload = () => {
      const data = String(reader.result);
      const image = new Image();
      image.onerror = () => setError('El archivo no es una imagen válida.');
      image.onload = () => onChange({ ...current.current, logoUrl: data });
      image.src = data;
    };
    reader.readAsDataURL(file);
  };
  return <details className="print:hidden rounded-xl border border-white/10 bg-[#141b25] text-neutral-100">
    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Marca de la agencia <span className="ml-2 text-xs font-normal text-neutral-400">Nombre y logo del informe</span></summary>
    <div className="grid gap-5 border-t border-white/10 p-4 sm:grid-cols-[1fr_160px]">
      <div className="space-y-4">
        <label className="block text-xs font-medium text-neutral-400">Nombre de la agencia
          <input value={value.agencyName} onChange={event => onChange({ ...value, agencyName: event.target.value })} placeholder="Nombre de tu agencia" className="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black/20 px-3 text-sm text-white outline-none focus:border-blue-400" />
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => fileInput.current?.click()} className="flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500"><ImagePlus className="h-4 w-4" />{value.logoUrl ? 'Cambiar logo' : 'Subir logo'}</button>
          {value.logoUrl && <button type="button" onClick={() => { onChange({ ...value, logoUrl: '' }); setError(''); }} className="min-h-11 rounded-lg border border-white/15 px-4 text-sm text-neutral-300 hover:bg-white/5">Quitar logo</button>}
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Archivo del logo de la agencia" className="hidden" onChange={event => { upload(event.target.files?.[0]); event.target.value = ''; }} />
        </div>
        <label className="block text-xs font-medium text-neutral-400">O pegá el enlace del logo
          <input type="url" value={value.logoUrl.startsWith('data:') ? '' : value.logoUrl} onChange={event => { setError(''); onChange({ ...value, logoUrl: event.target.value }); }} placeholder="https://tu-agencia.com/logo.png" className="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black/20 px-3 text-sm text-white outline-none focus:border-blue-400" />
        </label>
        <p className="text-xs leading-relaxed text-neutral-400">PNG, JPG o WebP, hasta 1 MB. Se guarda en este navegador para todos tus informes y se incluye al exportar a PDF.</p>
        {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
      </div>
      <div className="report-editorial flex min-h-24 items-center justify-center self-start rounded-xl border border-slate-200 bg-white p-4"><ReportAgencyBrand name={value.agencyName} logo={value.logoUrl} /></div>
    </div>
  </details>;
}
