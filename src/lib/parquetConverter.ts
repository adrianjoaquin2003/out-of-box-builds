import Papa from 'papaparse';

export interface ParquetData {
  columns: Record<string, Float64Array>;
  metadata: {
    rowCount: number;
    columnCount: number;
    headers: string[];
    units: string[];
  };
}

/**
 * Converts CSV to columnar format (Parquet-like structure)
 * This happens in the browser before upload
 */
export async function convertCsvToColumnar(file: File): Promise<{
  buffer: ArrayBuffer;
  metadata: ParquetData['metadata'];
}> {
  console.log('Converting CSV to columnar format...');

  // Decompress if needed
  let csvFile: File = file;
  if (file.name.endsWith('.deflate')) {
    const decompressed = new DecompressionStream('deflate');
    const decompressedStream = file.stream().pipeThrough(decompressed);
    const decompressedBlob = await new Response(decompressedStream).blob();
    csvFile = new File([decompressedBlob], file.name.replace('.deflate', ''), { type: 'text/csv' });
  }

  // Parse CSV
  const csvData = await new Promise<any[]>((resolve, reject) => {
    const rows: any[] = [];
    
    Papa.parse(csvFile, {
      worker: true,
      step: (row: any) => {
        rows.push(row.data);
      },
      complete: () => resolve(rows),
      error: (error: any) => reject(error)
    });
  });

  console.log(`Parsed ${csvData.length} rows`);

  // Extract headers and units
  const headers = csvData[14]?.map((h: string) => 
    h.trim().replace(/"/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  ) || [];
  
  const units = csvData[15]?.map((u: string) => u.trim().replace(/"/g, '')) || [];

  // Build columnar data
  const columns: Record<string, Float64Array> = {};
  const rowCount = csvData.length - 16;

  headers.forEach((header: string) => {
    columns[header] = new Float64Array(rowCount);
  });

  for (let i = 16; i < csvData.length; i++) {
    const row = csvData[i];
    headers.forEach((header: string, idx: number) => {
      const value = parseFloat(row[idx]);
      columns[header][i - 16] = isNaN(value) ? 0 : value;
    });
  }

  console.log(`Converted to columnar format: ${rowCount} rows, ${headers.length} columns`);

  // Serialize to binary format
  const metadata = {
    rowCount,
    columnCount: headers.length,
    headers,
    units
  };

  // Create buffer: metadata + column data
  const metadataStr = JSON.stringify(metadata);
  const metadataBytes = new TextEncoder().encode(metadataStr);
  const metadataLength = metadataBytes.length;

  // Calculate total size
  let totalSize = 4 + metadataLength; // 4 bytes for metadata length + metadata
  headers.forEach(() => {
    totalSize += rowCount * 8; // 8 bytes per Float64
  });

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  // Write metadata length
  view.setUint32(offset, metadataLength, true);
  offset += 4;

  // Write metadata
  new Uint8Array(buffer, offset, metadataLength).set(metadataBytes);
  offset += metadataLength;

  // Write column data
  headers.forEach((header: string) => {
    new Float64Array(buffer, offset, rowCount).set(columns[header]);
    offset += rowCount * 8;
  });

  return { buffer, metadata };
}

/**
 * Reads columnar data from buffer
 */
export function readColumnarData(buffer: ArrayBuffer): ParquetData {
  const view = new DataView(buffer);
  let offset = 0;

  // Read metadata length
  const metadataLength = view.getUint32(offset, true);
  offset += 4;

  // Read metadata
  const metadataBytes = new Uint8Array(buffer, offset, metadataLength);
  const metadataStr = new TextDecoder().decode(metadataBytes);
  const metadata = JSON.parse(metadataStr);
  offset += metadataLength;

  // Read columns
  const columns: Record<string, Float64Array> = {};
  metadata.headers.forEach((header: string) => {
    const columnData = new Float64Array(buffer, offset, metadata.rowCount);
    columns[header] = columnData;
    offset += metadata.rowCount * 8;
  });

  return { columns, metadata };
}

/**
 * Queries a specific metric from columnar data
 */
export function queryMetric(
  data: ParquetData,
  metricName: string,
  sampleSize: number = 2000
): { time: number; value: number }[] {
  const timeColumn = data.columns['time'];
  const metricColumn = data.columns[metricName];

  if (!metricColumn) {
    throw new Error(`Metric "${metricName}" not found`);
  }

  const totalRows = data.metadata.rowCount;
  const step = Math.max(1, Math.floor(totalRows / sampleSize));

  const results: { time: number; value: number }[] = [];
  for (let i = 0; i < totalRows; i += step) {
    results.push({
      time: timeColumn[i],
      value: metricColumn[i]
    });
  }

  // Always include last point
  if (results.length > 0 && results[results.length - 1].time !== timeColumn[totalRows - 1]) {
    results.push({
      time: timeColumn[totalRows - 1],
      value: metricColumn[totalRows - 1]
    });
  }

  return results;
}
