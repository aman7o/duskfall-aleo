'use client';

/**
 * Bulk Add Beneficiaries Component
 *
 * Allows users to upload a CSV file with beneficiary information
 * for batch addition to their will.
 *
 * Pattern cloned from art-factory CSV uploader.
 */

import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
  Users,
  Trash2,
  Edit2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

interface BeneficiaryEntry {
  id: string;
  address: string;
  shareBps: number;
  priority: number;
  name?: string;
  isValid: boolean;
  errors: string[];
}

interface BulkAddBeneficiariesProps {
  maxBeneficiaries?: number;
  existingCount?: number;
  onSubmit: (beneficiaries: Omit<BeneficiaryEntry, 'id' | 'isValid' | 'errors'>[]) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

/**
 * Validate Aleo address format
 */
function isValidAleoAddress(address: string): boolean {
  return (
    typeof address === 'string' &&
    address.startsWith('aleo1') &&
    address.length === 63
  );
}

/**
 * Parse CSV content into beneficiary entries
 */
function parseCSV(content: string): BeneficiaryEntry[] {
  const lines = content.trim().split('\n');
  const entries: BeneficiaryEntry[] = [];

  // Skip header row if present
  const startIndex = lines[0]?.toLowerCase().includes('address') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by comma, handling quoted values
    const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));

    const entry: BeneficiaryEntry = {
      id: `entry_${i}_${Date.now()}`,
      address: values[0] || '',
      shareBps: 0,
      priority: 1,
      name: undefined,
      isValid: true,
      errors: [],
    };

    // Parse share (can be percentage or basis points)
    if (values[1]) {
      const shareValue = values[1].replace('%', '');
      const parsed = parseFloat(shareValue);
      if (!isNaN(parsed)) {
        // If value is <= 100, treat as percentage; otherwise as basis points
        entry.shareBps = parsed <= 100 ? Math.round(parsed * 100) : Math.round(parsed);
      }
    }

    // Parse priority
    if (values[2]) {
      const parsed = parseInt(values[2], 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 255) {
        entry.priority = parsed;
      }
    }

    // Parse name (optional)
    if (values[3]) {
      entry.name = values[3];
    }

    // Validate entry
    validateEntry(entry);
    entries.push(entry);
  }

  return entries;
}

/**
 * Validate a single beneficiary entry
 */
function validateEntry(entry: BeneficiaryEntry): void {
  entry.errors = [];
  entry.isValid = true;

  // Validate address
  if (!entry.address) {
    entry.errors.push('Address is required');
    entry.isValid = false;
  } else if (!isValidAleoAddress(entry.address)) {
    entry.errors.push('Invalid Aleo address format');
    entry.isValid = false;
  }

  // Validate share
  if (entry.shareBps <= 0) {
    entry.errors.push('Share must be greater than 0');
    entry.isValid = false;
  } else if (entry.shareBps > 10000) {
    entry.errors.push('Share cannot exceed 100%');
    entry.isValid = false;
  }

  // Validate priority
  if (entry.priority < 1 || entry.priority > 255) {
    entry.errors.push('Priority must be between 1 and 255');
    entry.isValid = false;
  }
}

/**
 * Generate CSV template
 */
function generateTemplate(): string {
  return `address,share_percent,priority,name
aleo1example1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq,25,1,Alice
aleo1example2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq,25,1,Bob
aleo1example3qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq,50,2,Charlie`;
}

export default function BulkAddBeneficiaries({
  maxBeneficiaries = 16,
  existingCount = 0,
  onSubmit,
  onCancel,
  className = '',
}: BulkAddBeneficiariesProps) {
  const [entries, setEntries] = useState<BeneficiaryEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableSlots = maxBeneficiaries - existingCount;

  // Process uploaded file
  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parseCSV(content);

        if (parsed.length === 0) {
          setError('No valid entries found in the CSV file');
          return;
        }

        if (parsed.length > availableSlots) {
          setError(
            `Too many beneficiaries. You can add ${availableSlots} more (found ${parsed.length})`
          );
          return;
        }

        setEntries(parsed);
      } catch (err) {
        setError('Failed to parse CSV file. Please check the format.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  }, [availableSlots]);

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setError(null);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  // Download template
  const handleDownloadTemplate = () => {
    const template = generateTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'beneficiaries_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Remove entry
  const handleRemoveEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // Update entry
  const handleUpdateEntry = (id: string, field: keyof BeneficiaryEntry, value: string | number) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;

        const updated = { ...e, [field]: value };

        // Re-validate
        if (field === 'shareBps' && typeof value === 'string') {
          const parsed = parseFloat(value);
          updated.shareBps = !isNaN(parsed) ? Math.round(parsed * 100) : 0;
        }

        validateEntry(updated);
        return updated;
      })
    );
  };

  // Submit entries
  const handleSubmit = async () => {
    const validEntries = entries.filter((e) => e.isValid);
    if (validEntries.length === 0) {
      setError('No valid entries to submit');
      return;
    }

    // Check total shares
    const totalShares = validEntries.reduce((sum, e) => sum + e.shareBps, 0);
    if (totalShares > 10000) {
      setError(`Total shares (${totalShares / 100}%) exceed 100%`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(
        validEntries.map(({ address, shareBps, priority, name }) => ({
          address,
          shareBps,
          priority,
          name,
        }))
      );
      setEntries([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add beneficiaries');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalShares = entries.reduce((sum, e) => sum + (e.isValid ? e.shareBps : 0), 0);
  const validCount = entries.filter((e) => e.isValid).length;
  const invalidCount = entries.length - validCount;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Bulk Add Beneficiaries</h3>
              <p className="text-sm text-text-tertiary">
                Upload a CSV file with beneficiary details
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload area */}
        {entries.length === 0 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-background-tertiary'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload
              className={`w-10 h-10 mx-auto mb-3 ${
                isDragging ? 'text-primary' : 'text-text-tertiary'
              }`}
            />
            <p className="text-text-primary font-medium mb-1">
              {isDragging ? 'Drop your file here' : 'Drag & drop your CSV file'}
            </p>
            <p className="text-sm text-text-tertiary">
              or click to browse ({availableSlots} slots available)
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-accent-red shrink-0 mt-0.5" />
            <p className="text-sm text-accent-red">{error}</p>
          </div>
        )}

        {/* Entries list */}
        {entries.length > 0 && (
          <>
            {/* Summary */}
            <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm text-text-secondary">
                  {validCount} valid entries
                </span>
                {invalidCount > 0 && (
                  <span className="text-sm text-accent-red">
                    {invalidCount} invalid
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm ${totalShares > 10000 ? 'text-accent-red' : 'text-text-secondary'}`}>
                  Total: {(totalShares / 100).toFixed(1)}%
                </span>
                <button
                  onClick={() => setEntries([])}
                  className="text-sm text-text-tertiary hover:text-accent-red transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Entries table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-background-tertiary">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      Share
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`${!entry.isValid ? 'bg-accent-red/5' : ''}`}
                    >
                      <td className="px-4 py-3">
                        {editingId === entry.id ? (
                          <input
                            type="text"
                            value={entry.address}
                            onChange={(e) =>
                              handleUpdateEntry(entry.id, 'address', e.target.value)
                            }
                            onBlur={() => setEditingId(null)}
                            autoFocus
                            className="w-full px-2 py-1 bg-background-secondary border border-border rounded text-sm font-mono"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-text-tertiary shrink-0" />
                            <span className="text-sm font-mono text-text-secondary truncate max-w-[200px]">
                              {entry.address || '-'}
                            </span>
                            {entry.name && (
                              <span className="text-xs text-text-tertiary">
                                ({entry.name})
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-primary">
                          {(entry.shareBps / 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">
                          {entry.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {entry.isValid ? (
                          <span className="inline-flex items-center gap-1 text-xs text-accent-green">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Valid
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-accent-red cursor-help"
                            title={entry.errors.join(', ')}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            {entry.errors[0]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingId(entry.id)}
                            className="p-1 text-text-tertiary hover:text-primary rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveEntry(entry.id)}
                            className="p-1 text-text-tertiary hover:text-accent-red rounded transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {onCancel && (
                <Button variant="secondary" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={validCount === 0 || totalShares > 10000}
                isLoading={isSubmitting}
                loadingText="Adding..."
                className="flex-1"
              >
                Add {validCount} Beneficiar{validCount === 1 ? 'y' : 'ies'}
              </Button>
            </div>
          </>
        )}

        {/* Format help */}
        {entries.length === 0 && (
          <div className="p-4 bg-background-tertiary rounded-lg">
            <p className="text-sm font-medium text-text-primary mb-2">CSV Format</p>
            <code className="block text-xs text-text-tertiary font-mono whitespace-pre">
              address,share_percent,priority,name
              aleo1...,25,1,Alice
              aleo1...,75,1,Bob
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
