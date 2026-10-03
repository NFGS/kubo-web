import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileCode2, FileText, ReceiptText } from 'lucide-react';
import { apiFetch, downloadFile } from '../lib/api';
import { dateTime } from '../lib/format';
import type { DocumentItem } from '../lib/types';
import { Badge, Button, Card, EmptyState, ErrorNote, Select, Spinner } from '../components/ui';

const KIND_LABELS: Record<string, string> = {
  INVOICE_XML: 'Factura electrónica',
  CREDIT_NOTE_XML: 'Nota crédito',
  RECEIPT_PDF: 'Comprobante de venta',
  PURCHASE_SUPPORT: 'Soporte de compra'
};

const KIND_TONES: Record<string, 'info' | 'success' | 'warning' | 'neutral'> = {
  INVOICE_XML: 'info',
  CREDIT_NOTE_XML: 'warning',
  RECEIPT_PDF: 'success',
  PURCHASE_SUPPORT: 'neutral'
};

function humanSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Documentos del negocio (P-25, ADR-0018).
 *
 * Todo lo que el sistema genera o recibe como archivo: el XML de las facturas
 * electrónicas, las notas crédito, los comprobantes en PDF y los soportes de
 * compra. La lista muestra solo metadatos; el contenido se descarga con la
 * sesión (nunca por un enlace público).
 */
export function DocumentsPage() {
  const [kind, setKind] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const documents = useQuery({
    queryKey: ['documents'],
    queryFn: () => apiFetch<{ data: DocumentItem[] }>('/documents')
  });

  const rows = (documents.data?.data ?? []).filter((doc) => !kind || doc.kind === kind);

  async function descargar(doc: DocumentItem): Promise<void> {
    setError(null);
    setDownloading(doc.id);
    try {
      await downloadFile(`/documents/${doc.id}`, doc.filename);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible descargar el documento');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Documentos</h1>
          <p className="text-sm text-slate-600">
            Facturas, notas crédito, comprobantes y soportes del negocio.
          </p>
        </div>
        <Select
          className="max-w-60"
          aria-label="Filtrar por tipo de documento"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        >
          <option value="">Todos los tipos</option>
          {Object.entries(KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </header>

      <ErrorNote
        message={
          error ??
          (documents.isError
            ? documents.error instanceof Error
              ? documents.error.message
              : 'No fue posible cargar los documentos'
            : null)
        }
      />

      <Card>
        {documents.isLoading ? (
          <Spinner label="Cargando documentos…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Sin documentos"
            description="Al facturar una venta, adjuntar un soporte o imprimir un comprobante, el archivo aparecerá aquí."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center gap-3 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-kubo-50 text-kubo-600">
                  {doc.kind === 'INVOICE_XML' || doc.kind === 'CREDIT_NOTE_XML' ? (
                    <FileCode2 className="h-4 w-4" aria-hidden />
                  ) : doc.kind === 'RECEIPT_PDF' ? (
                    <ReceiptText className="h-4 w-4" aria-hidden />
                  ) : (
                    <FileText className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{doc.filename}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {humanSize(doc.size)}
                    {doc.created_at ? ` · ${dateTime(doc.created_at)}` : ''}
                  </p>
                </div>
                <Badge tone={KIND_TONES[doc.kind] ?? 'neutral'}>
                  {KIND_LABELS[doc.kind] ?? doc.kind}
                </Badge>
                <Button
                  variant="secondary"
                  loading={downloading === doc.id}
                  onClick={() => void descargar(doc)}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Descargar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
