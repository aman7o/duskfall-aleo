'use client';

import { useRef } from 'react';
import { create } from 'zustand';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import {
  UIWill,
  UIBeneficiary,
  CreateWillFormData,
  WillStatus,
  AleoAddress,
  daysToBlocks,
  blocksToTime,
  percentToBps,
} from '@/types';
import { aleoService, calculateDynamicFee, getExplorerUrl } from '@/services/aleo';
import { queryKeys } from './useWillQuery';
import { logger } from '@/utils/debug';

const PROGRAM_ID = 'digital_will_v7.aleo';

// Safe u64 limit leaving room for fee calculations
const MAX_DEPOSIT_MICROCREDITS = 18_446_744_073_709_000_000n;

function isLeoWalletAdapter(adapter: unknown): adapter is LeoWalletAdapter {
  return adapter !== null &&
         adapter !== undefined &&
         typeof adapter === 'object' &&
         'transactionStatus' in adapter;
}

function generateSecureNonce(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint32Array(4);
    window.crypto.getRandomValues(array);
    const nonce = Array.from(array).map(n => n.toString()).join('');
    return `${nonce}field`;
  }
  // Fallback: must be purely numeric for Leo field type
  const timestamp = Date.now().toString();
  const randomDigits = Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, '0');
  return `${timestamp}${randomDigits}field`;
}

// Strip .private/.public suffix Leo Wallet adds to record field values
function normalizeAleoValue(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/\.(private|public)$/, '');
}

// Distinguishes definitive on-chain failures from "not found yet" polling errors
class TransactionFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionFailedError';
  }
}

export type TxProgressStatus = 'idle' | 'signing' | 'broadcasting' | 'confirming' | 'finalized' | 'error';

interface WillStore {
  will: UIWill | null;
  willId: string | null;
  willConfigRecord: string | null;
  beneficiaryRecords: Map<string, string>;
  lockedCreditsRecords: string[];
  isLoading: boolean;
  error: string | null;
  programDeployed: boolean;
  txProgress: TxProgressStatus;
  currentTxId: string | null;
  activeAbortController: AbortController | null;
  setWill: (will: UIWill | null) => void;
  setWillId: (willId: string | null) => void;
  setWillConfigRecord: (record: string | null) => void;
  setBeneficiaryRecords: (records: Map<string, string>) => void;
  setLockedCreditsRecords: (records: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProgramDeployed: (deployed: boolean) => void;
  setTxProgress: (progress: TxProgressStatus) => void;
  setCurrentTxId: (txId: string | null) => void;
  setActiveAbortController: (controller: AbortController | null) => void;
}

export const useWillStore = create<WillStore>((set) => ({
  will: null,
  willId: null,
  willConfigRecord: null,
  beneficiaryRecords: new Map(),
  lockedCreditsRecords: [],
  isLoading: false,
  error: null,
  programDeployed: false,
  txProgress: 'idle',
  currentTxId: null,
  activeAbortController: null,
  setWill: (will) => set({ will }),
  setWillId: (willId) => set({ willId }),
  setWillConfigRecord: (willConfigRecord) => set({ willConfigRecord }),
  setBeneficiaryRecords: (beneficiaryRecords) => set({ beneficiaryRecords }),
  setLockedCreditsRecords: (lockedCreditsRecords) => set({ lockedCreditsRecords }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setProgramDeployed: (programDeployed) => set({ programDeployed }),
  setTxProgress: (txProgress) => set({ txProgress }),
  setCurrentTxId: (currentTxId) => set({ currentTxId }),
  setActiveAbortController: (activeAbortController) => set({ activeAbortController }),
}));

// localStorage hydration happens in loadStoredRecords() (client-side only)
function parseWillConfigRecord(recordString: string): { willId: string; checkInPeriod: bigint; gracePeriod: bigint; totalSharesBps: number; numBeneficiaries: number; isActive: boolean; nonce: string } | null {
  try {
    const willIdMatch = recordString.match(/will_id:\s*([0-9]+)field/);
    const checkInMatch = recordString.match(/check_in_period:\s*([0-9]+)u32/);
    const graceMatch = recordString.match(/grace_period:\s*([0-9]+)u32/);
    const sharesMatch = recordString.match(/total_shares_bps:\s*([0-9]+)u16/);
    const numBenMatch = recordString.match(/num_beneficiaries:\s*([0-9]+)u8/);
    const activeMatch = recordString.match(/is_active:\s*(true|false)/);
    const nonceMatch = recordString.match(/nonce:\s*([0-9]+)field/);

    if (willIdMatch) {
      return {
        willId: `${willIdMatch[1]}field`,
        checkInPeriod: checkInMatch ? BigInt(checkInMatch[1]) : 0n,
        gracePeriod: graceMatch ? BigInt(graceMatch[1]) : 0n,
        totalSharesBps: sharesMatch ? parseInt(sharesMatch[1]) : 0,
        numBeneficiaries: numBenMatch ? parseInt(numBenMatch[1]) : 0,
        isActive: activeMatch ? activeMatch[1] === 'true' : true,
        nonce: nonceMatch ? `${nonceMatch[1]}field` : '0field',
      };
    }
    return null;
  } catch (error) {
    logger.debug('Will', 'Failed to parse WillConfig record:', error);
    return null;
  }
}

function storeRecord(key: string, value: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

function getRecord(key: string): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

function removeRecord(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
}

// Plaintext records include the _nonce group element needed for spending
function storePlaintext(key: string, value: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`pt_${key}`, value);
  }
}

function getPlaintext(key: string): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(`pt_${key}`);
  }
  return null;
}

function removePlaintext(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`pt_${key}`);
  }
}

function getWillConfigForTransaction(walletAddress: string): string | null {
  const plaintext = getPlaintext(`will_config_${walletAddress}`);
  if (plaintext) {
    return plaintext;
  }
  logger.debug('Will', 'No plaintext WillConfig cached');
  return null;
}

function getLockedCreditsForTransaction(walletAddress: string, index = 0): string | null {
  const plaintext = getPlaintext(`locked_credits_${walletAddress}_${index}`);
  if (plaintext) {
    return plaintext;
  }
  logger.debug('Will', 'No plaintext LockedCredits cached');
  return null;
}

function getBenAllocationForTransaction(walletAddress: string, beneficiaryAddress: string): string | null {
  for (let i = 0; i < 10; i++) {
    const plaintext = getPlaintext(`beneficiary_${walletAddress}_${i}`);
    if (plaintext && plaintext.includes(beneficiaryAddress)) {
      return plaintext;
    }
  }
  logger.debug('Will', 'No plaintext BenAllocation cached for', beneficiaryAddress);
  return null;
}

async function fetchAndStorePlaintexts(
  requestRecordPlaintexts: ((program: string) => Promise<any[]>) | undefined,
  walletAddress: string
): Promise<boolean> {
  if (!requestRecordPlaintexts) {
    logger.debug('Will', 'fetchAndStorePlaintexts: requestRecordPlaintexts is undefined');
    return false;
  }

  try {
    logger.debug('Will', 'On-demand plaintext fetch for', walletAddress);
    const plaintexts = await requestRecordPlaintexts(PROGRAM_ID);
    logger.debug('Will', `On-demand: got ${plaintexts?.length || 0} record plaintexts`);

    if (!plaintexts || plaintexts.length === 0) {
      return false;
    }

    let stored = false;
    let lockedCreditsIdx = 0;
    let benAllocationIdx = 0;

    for (const pt of plaintexts) {
      let ptStr: string;
      if (typeof pt === 'string') {
        ptStr = pt;
      } else if (pt && typeof pt === 'object') {
        ptStr = (pt as Record<string, unknown>).plaintext as string
          || (pt as Record<string, unknown>).data as string
          || (pt as Record<string, unknown>).text as string
          || JSON.stringify(pt);
      } else {
        ptStr = String(pt);
      }
      logger.debug('Will', 'On-demand plaintext:', ptStr.substring(0, 200));

      if (ptStr.includes('check_in_period') && ptStr.includes('will_id')) {
        storePlaintext(`will_config_${walletAddress}`, ptStr);
        logger.debug('Will', 'On-demand: stored WillConfig plaintext');
        stored = true;
      } else if (ptStr.includes('depositor') && ptStr.includes('amount')) {
        storePlaintext(`locked_credits_${walletAddress}_${lockedCreditsIdx}`, ptStr);
        lockedCreditsIdx++;
        stored = true;
      } else if (ptStr.includes('beneficiary_addr') && ptStr.includes('share_bps')) {
        storePlaintext(`beneficiary_${walletAddress}_${benAllocationIdx}`, ptStr);
        benAllocationIdx++;
        stored = true;
      }
    }
    return stored;
  } catch (err) {
    logger.debug('Will', 'On-demand plaintext fetch failed:', err);
    return false;
  }
}

// Leo Wallet expects record inputs as objects, not plaintext strings
interface FreshRecords {
  willConfig: any | null;
  lockedCredits: any[];
  benAllocations: any[];
}

async function fetchFreshRecordObjects(
  requestRecords: ((program: string) => Promise<any[]>) | undefined,
  expectedIsActive?: boolean,
): Promise<FreshRecords> {
  if (!requestRecords) {
    logger.debug('Will', 'fetchFreshRecordObjects: requestRecords not available');
    return { willConfig: null, lockedCredits: [], benAllocations: [] };
  }

  try {
    logger.debug('Will', 'Fetching fresh record objects from wallet...');
    const records = await requestRecords(PROGRAM_ID);

    if (!records || records.length === 0) {
      logger.debug('Will', 'No records found for program');
      return { willConfig: null, lockedCredits: [], benAllocations: [] };
    }

    logger.debug('Will', `Got ${records.length} records from wallet`);

    let willConfig: any = null;
    const lockedCredits: any[] = [];
    const benAllocations: any[] = [];

    for (const r of records) {
      if (r.spent) continue;

      const isWillConfig = r.recordName === 'WillConfig' ||
        (r.data && typeof r.data === 'object' && r.data.check_in_period);
      const isLockedCredits = r.recordName === 'LockedCredits' ||
        (r.data && typeof r.data === 'object' && r.data.depositor && r.data.will_id);
      const isBenAllocation = r.recordName === 'BenAllocation' ||
        (r.data && typeof r.data === 'object' && r.data.beneficiary_addr && r.data.share_bps);

      if (isWillConfig && !willConfig) {
        if (expectedIsActive !== undefined && r.data && typeof r.data === 'object') {
          const rawVal = r.data.is_active;
          const isActive = typeof rawVal === 'string'
            ? rawVal.replace(/\.(private|public)$/, '') === 'true'
            : rawVal === true;
          if (isActive !== expectedIsActive) {
            logger.debug('Will', `Skipping WillConfig with is_active=${isActive}, expected ${expectedIsActive}`);
            continue;
          }
        }
        willConfig = r;
        logger.debug('Will', 'Found WillConfig record object:', r.id || 'no-id');
      } else if (isLockedCredits) {
        lockedCredits.push(r);
      } else if (isBenAllocation) {
        benAllocations.push(r);
      }
    }

    logger.debug('Will', `Categorized: WillConfig=${willConfig ? 'found' : 'none'}, LockedCredits=${lockedCredits.length}, BenAllocations=${benAllocations.length}`);
    return { willConfig, lockedCredits, benAllocations };
  } catch (err) {
    logger.debug('Will', 'Failed to fetch record objects:', err);
    return { willConfig: null, lockedCredits: [], benAllocations: [] };
  }
}

async function pollTransactionStatus(
  adapter: LeoWalletAdapter,
  txId: string,
  maxAttempts = 60,
  intervalMs = 2000,
  onProgress?: (status: TxProgressStatus) => void,
  onTxId?: (txId: string) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  onProgress?.('broadcasting');
  onTxId?.(txId);
  logger.tx.broadcasting(txId);

  let interval = intervalMs;
  const maxInterval = 10000;

  for (let i = 0; i < maxAttempts; i++) {
    if (abortSignal?.aborted) {
      throw new Error('Transaction polling aborted');
    }
    await new Promise(r => setTimeout(r, interval));

    try {
      const status = await adapter.transactionStatus(txId);

      if (status === 'Queued' || status === 'Processing') {
        onProgress?.('confirming');
        logger.tx.confirming(txId);
      }

      if (status === 'Finalized') {
        onProgress?.('finalized');
        logger.tx.confirmed(txId);
        return txId;
      }
      if (status === 'Rejected' || status === 'Failed') {
        onProgress?.('error');
        logger.tx.failed(txId, status);
        throw new TransactionFailedError(`Transaction ${status.toLowerCase()}`);
      }

      interval = Math.min(interval * 1.2, maxInterval);
    } catch (err) {
      if (err instanceof TransactionFailedError) throw err;
      // Not found yet — normal during testnet propagation
      logger.debug('TX', `Polling attempt ${i + 1}/${maxAttempts}: ${err instanceof Error ? err.message : 'transaction not found yet'}`);
      interval = Math.min(interval * 1.5, maxInterval);
    }
  }

  onProgress?.('error');
  logger.tx.timeout(txId);
  throw new Error('Transaction timeout - please check explorer');
}

async function retryWalletOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Only retry "Not ready" — INVALID_PARAMS means bad data, not timing
      if (errorMsg.includes('Not ready')) {
        lastError = err instanceof Error ? err : new Error(errorMsg);

        if (attempt < maxRetries) {
          logger.debug('TX', `${operationName} failed with "${errorMsg}", retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
      }

      throw err;
    }
  }

  throw lastError || new Error(`${operationName} failed after ${maxRetries} retries`);
}

function formatWalletError(err: unknown): string {
  const errorMsg = err instanceof Error ? err.message : String(err);

  if (errorMsg.includes('Not ready')) {
    return 'Leo Wallet is still initializing. Please wait a moment and try again.';
  }
  if (errorMsg.includes('INVALID_PARAMS')) {
    return 'Wallet connection issue. Please try disconnecting and reconnecting your wallet.';
  }
  if (errorMsg.includes('User rejected')) {
    return 'Transaction was rejected by user.';
  }

  return errorMsg;
}

export function useWill() {
  const {
    will,
    willId,
    willConfigRecord,
    beneficiaryRecords,
    lockedCreditsRecords,
    isLoading,
    error,
    programDeployed,
    txProgress,
    currentTxId,
    activeAbortController,
    setWill,
    setWillId,
    setWillConfigRecord,
    setBeneficiaryRecords,
    setLockedCreditsRecords,
    setLoading,
    setError,
    setProgramDeployed,
    setTxProgress,
    setCurrentTxId,
    setActiveAbortController
  } = useWillStore();
  const wallet = useWallet();
  const { publicKey, requestRecords, requestRecordPlaintexts, requestTransaction, connected } = wallet;
  const rawAdapter = wallet.wallet?.adapter;
  const adapter = isLeoWalletAdapter(rawAdapter) ? rawAdapter : undefined;
  const queryClient = useQueryClient();

  const fetchRequestIdRef = useRef(0);

  const createTxAbortController = (): AbortController => {
    if (activeAbortController) {
      activeAbortController.abort();
    }
    const controller = new AbortController();
    setActiveAbortController(controller);
    return controller;
  };

  const cleanupTxAbortController = () => {
    setActiveAbortController(null);
  };

  const invalidateWillCache = async (targetWillId?: string) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.all });
    if (targetWillId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.will(targetWillId) });
    }
  };

  const checkProgramDeployed = async () => {
    const deployed = await aleoService.isProgramDeployed();
    setProgramDeployed(deployed);
    return deployed;
  };

  const loadStoredRecords = (walletAddress: string) => {
    let storedWillId = getRecord(`will_id_${walletAddress}`);
    const storedWillConfig = getRecord(`will_config_${walletAddress}`);

    if (storedWillId && (storedWillId.includes('.private') || storedWillId.includes('.public'))) {
      storedWillId = normalizeAleoValue(storedWillId);
      storeRecord(`will_id_${walletAddress}`, storedWillId);
      logger.debug('Will', `Migrated cached will_id to remove visibility suffix: ${storedWillId}`);
    }

    if (storedWillId) {
      setWillId(storedWillId);
    }
    if (storedWillConfig) {
      setWillConfigRecord(storedWillConfig);
    }

    const benRecords = new Map<string, string>();
    for (let i = 0; i < 10; i++) {
      const record = getRecord(`beneficiary_${walletAddress}_${i}`);
      if (record) {
        benRecords.set(`${i}`, record);
      }
    }
    setBeneficiaryRecords(benRecords);

    const lockedRecords: string[] = [];
    for (let i = 0; i < 20; i++) {
      const record = getRecord(`locked_credits_${walletAddress}_${i}`);
      if (record) {
        lockedRecords.push(record);
      }
    }
    setLockedCreditsRecords(lockedRecords);

    return { storedWillId, storedWillConfig };
  };

  const fetchWill = async (ownerAddress: AleoAddress, forceRefresh = false) => {
    const requestId = ++fetchRequestIdRef.current;

    setLoading(true);
    setError(null);
    logger.will.fetching(ownerAddress);

    try {
      const { storedWillId, storedWillConfig } = loadStoredRecords(ownerAddress);

      const deployed = await checkProgramDeployed();
      if (!deployed) {
        const error = 'Contract not deployed on testnet. Please deploy the contract first.';
        logger.will.error('fetchWill', error);
        setError(error);
        setLoading(false);
        return;
      }

      let fetchedBeneficiaries: UIBeneficiary[] = [];
      let storedLockedRecords: string[] = [];

      // Skip wallet popup if we have cached data (unless forceRefresh)
      const hasCachedWillId = storedWillId || getRecord(`will_id_${ownerAddress}`);
      const shouldFetchRecords = publicKey && requestRecords && (!hasCachedWillId || forceRefresh);

      if (shouldFetchRecords) {
        try {
          logger.debug('Will', 'Fetching records from wallet (no cache)');
          const records = await requestRecords(PROGRAM_ID);

          if (records && records.length > 0) {
            logger.debug('Will', 'Raw records from wallet (first record keys):', Object.keys(records[0]));
            logger.debug('Will', 'First record sample:', JSON.stringify(records[0], null, 2).substring(0, 500));
          }

          const willConfigRecords = records?.filter((r: unknown) => {
            const record = r as { data?: { will_id?: string; check_in_period?: string }; recordName?: string };
            return record.recordName === 'WillConfig' ||
                   (record.data && record.data.check_in_period);
          });
          if (willConfigRecords && willConfigRecords.length > 0) {
            const configRecord = willConfigRecords[0] as { data?: { will_id?: string } };
            const recordStr = JSON.stringify(configRecord);
            storeRecord(`will_config_${publicKey}`, recordStr);
            setWillConfigRecord(recordStr);

            if (configRecord.data?.will_id) {
              const extractedWillId = normalizeAleoValue(configRecord.data.will_id);
              storeRecord(`will_id_${publicKey}`, extractedWillId);
              setWillId(extractedWillId);
            }
          }

          const beneficiaryRecordsData = records?.filter((r: unknown) => {
            const record = r as { data?: { share_bps?: string; beneficiary_addr?: string }; recordName?: string };
            return record.data && (record.data.share_bps || record.data.beneficiary_addr || record.recordName === 'Beneficiary' || record.recordName === 'BenAllocation');
          });
          if (beneficiaryRecordsData) {
            fetchedBeneficiaries = beneficiaryRecordsData.map((b: unknown, i: number) => {
              const record = b as { data?: { owner?: string; beneficiary_addr?: string; will_owner?: string; will_id?: string; share_bps?: string; priority?: string; verification_hash?: string; is_active?: string }; owner?: string };
              storeRecord(`beneficiary_${publicKey}_${i}`, JSON.stringify(record));
              return {
                owner: record.data?.beneficiary_addr || record.data?.owner || record.owner || '',
                willOwner: record.data?.will_owner || '',
                willId: record.data?.will_id || '',
                shareBps: parseInt(record.data?.share_bps || '0'),
                priority: parseInt(record.data?.priority || '0'),
                verificationHash: record.data?.verification_hash || '',
                isActive: record.data?.is_active !== 'false',
                displayName: `Beneficiary ${i + 1}`,
                relationship: '',
                sharePercent: parseInt(record.data?.share_bps || '0') / 100,
                beneficiaryAddr: record.data?.beneficiary_addr,
              };
            });
          }

          const lockedRecordsData = records?.filter((r: unknown) => {
            const record = r as { data?: { amount?: string; depositor?: string; will_id?: string }; recordName?: string };
            return record.recordName === 'LockedCredits' ||
                   (record.data && record.data.depositor && record.data.will_id);
          });
          if (lockedRecordsData) {
            storedLockedRecords = lockedRecordsData.map((r: unknown, i: number) => {
              const recordStr = JSON.stringify(r);
              storeRecord(`locked_credits_${publicKey}_${i}`, recordStr);
              return recordStr;
            });
            setLockedCreditsRecords(storedLockedRecords);
          }
        } catch (err) {
          console.log('Could not fetch records from wallet:', err);
        }
      }

      // Plaintexts include _nonce needed for spending — fetch independently
      const hasCachedPlaintext = getPlaintext(`will_config_${publicKey}`);
      const shouldFetchPlaintexts = publicKey && requestRecordPlaintexts && (!hasCachedPlaintext || forceRefresh);

      if (shouldFetchPlaintexts) {
        try {
          logger.debug('Will', 'Fetching record plaintexts (with _nonce) from wallet...');
          const plaintexts = await requestRecordPlaintexts(PROGRAM_ID);
          logger.debug('Will', `Got ${plaintexts?.length || 0} record plaintexts from wallet`);

          if (plaintexts && plaintexts.length > 0) {
            let willConfigIdx = 0;
            let lockedCreditsIdx = 0;
            let benAllocationIdx = 0;

            for (const pt of plaintexts) {
              let ptStr: string;
              if (typeof pt === 'string') {
                ptStr = pt;
              } else if (pt && typeof pt === 'object') {
                ptStr = (pt as Record<string, unknown>).plaintext as string
                  || (pt as Record<string, unknown>).data as string
                  || (pt as Record<string, unknown>).text as string
                  || JSON.stringify(pt);
              } else {
                ptStr = String(pt);
              }

              if (ptStr.includes('check_in_period') && ptStr.includes('will_id')) {
                storePlaintext(`will_config_${publicKey}`, ptStr);
                logger.debug('Will', 'Stored WillConfig plaintext (has _nonce)');
                willConfigIdx++;
              } else if (ptStr.includes('depositor') && ptStr.includes('amount')) {
                storePlaintext(`locked_credits_${publicKey}_${lockedCreditsIdx}`, ptStr);
                logger.debug('Will', `Stored LockedCredits plaintext #${lockedCreditsIdx}`);
                lockedCreditsIdx++;
              } else if (ptStr.includes('beneficiary_addr') && ptStr.includes('share_bps')) {
                storePlaintext(`beneficiary_${publicKey}_${benAllocationIdx}`, ptStr);
                logger.debug('Will', `Stored BenAllocation plaintext #${benAllocationIdx}`);
                benAllocationIdx++;
              }
            }
          }
        } catch (ptErr) {
          logger.debug('Will', 'Could not fetch record plaintexts (non-fatal):', ptErr);
        }
      }

      const effectiveWillId = normalizeAleoValue(willId || storedWillId || '');

      if (!effectiveWillId) {
        logger.will.notFound(ownerAddress);
        setWill(null);
        setLoading(false);
        return;
      }

      const [status, lastCheckIn, totalLocked, totalClaimed, checkInPeriodVal, gracePeriodVal, currentBlock] = await Promise.all([
        aleoService.getWillStatus(effectiveWillId),
        aleoService.getLastCheckIn(effectiveWillId),
        aleoService.getTotalLocked(effectiveWillId),
        aleoService.getTotalClaimed(effectiveWillId),
        aleoService.getCheckInPeriod(effectiveWillId),
        aleoService.getGracePeriod(effectiveWillId),
        aleoService.getLatestBlockHeight(),
      ]);

      if (status === null) {
        logger.will.notFound(ownerAddress);
        setWill(null);
        setLoading(false);
        return;
      }

      const checkInPeriod = checkInPeriodVal ?? 129600n;
      const gracePeriod = gracePeriodVal ?? 30240n;
      const lastCheckInBlock = lastCheckIn || 0n;
      const deadline = lastCheckInBlock + checkInPeriod + gracePeriod;
      const blocksRemaining = deadline > currentBlock ? deadline - currentBlock : 0n;

      const totalSharesBps = fetchedBeneficiaries.reduce((sum, b) => sum + b.shareBps, 0);
      const allocatedPercent = totalSharesBps / 100;
      const unallocatedPercent = 100 - allocatedPercent;

      const uiWill: UIWill = {
        owner: ownerAddress,
        willId: effectiveWillId,
        checkInPeriod,
        gracePeriod,
        totalSharesBps,
        numBeneficiaries: fetchedBeneficiaries.length,
        isActive: status === WillStatus.ACTIVE,
        nonce: '0field',
        status: status as WillStatus,
        lastCheckIn: lastCheckInBlock,
        deadline,
        blocksRemaining,
        timeRemaining: blocksToTime(blocksRemaining),
        totalLocked: totalLocked || 0n,
        totalClaimed: totalClaimed || 0n,
        allocatedPercent,
        unallocatedPercent,
        beneficiaries: fetchedBeneficiaries,
      };

      // Stale response guard — a newer fetchWill call superseded this one
      if (fetchRequestIdRef.current !== requestId) {
        return;
      }

      setWill(uiWill);
      logger.will.loaded(effectiveWillId, WillStatus[status] || String(status));
      setLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch will';
      logger.will.error('fetchWill', errorMsg);
      setError(errorMsg);
      setLoading(false);
    }
  };

  const createWill = async (data: CreateWillFormData) => {
    console.log('[CreateWill] Starting...', { publicKey, connected, hasAdapter: !!adapter, hasRequestTransaction: !!requestTransaction });

    if (!connected) {
      throw new Error('Wallet not connected. Please connect your Leo Wallet.');
    }

    if (!publicKey) {
      throw new Error('No wallet address found. Please reconnect your wallet.');
    }

    if (!requestTransaction) {
      throw new Error('Wallet does not support transactions. Please use Leo Wallet.');
    }

    if (!adapter) {
      throw new Error('Wallet adapter not ready. Please wait a moment and try again.');
    }

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');
    logger.tx.creating('create_will', { checkInDays: data.checkInPeriodDays, graceDays: data.gracePeriodDays });
    logger.tx.signing();

    try {
      const deployed = await checkProgramDeployed();
      if (!deployed) {
        throw new Error('Contract not deployed on testnet.');
      }

      const nonce = generateSecureNonce();
      const checkInPeriod = `${daysToBlocks(data.checkInPeriodDays)}u32`;
      const gracePeriod = `${daysToBlocks(data.gracePeriodDays)}u32`;

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'create_will',
        [nonce, checkInPeriod, gracePeriod],
        calculateDynamicFee('create_will'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'createWill'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
          logger.will.created(nonce);
        } finally {
          cleanupTxAbortController();
        }
      }

      await invalidateWillCache();
      await fetchWill(publicKey, true);
      setLoading(false);
    } catch (err) {
      cleanupTxAbortController();
      const errorMsg = formatWalletError(err);
      logger.will.error('createWill', errorMsg);
      setError(errorMsg);
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const checkIn = async () => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    if (!will) throw new Error('No will found');

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');
    logger.tx.creating('check_in_backup', { willId: will.willId });
    logger.tx.signing();

    try {
      if (!will.willId || will.willId === 'unknown') {
        throw new Error('Will ID not available. Please refresh your will data.');
      }

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'check_in_backup',
        [will.willId],
        calculateDynamicFee('check_in_backup'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'checkIn'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
          logger.will.checkedIn();
        } finally {
          cleanupTxAbortController();
        }
      }

      await invalidateWillCache(will.willId);
      await fetchWill(publicKey, true);
      setLoading(false);
    } catch (err) {
      cleanupTxAbortController();
      const errorMsg = formatWalletError(err);
      logger.will.error('checkIn', errorMsg);
      setError(errorMsg);
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const addBeneficiary = async (beneficiary: UIBeneficiary) => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    if (!will) throw new Error('No will found');

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');

    const shareBps = percentToBps(beneficiary.sharePercent || 0);

    if (shareBps <= 0) {
      throw new Error('Share percentage must be greater than 0');
    }
    if (shareBps > 10000) {
      throw new Error('Share percentage cannot exceed 100%');
    }
    const currentTotalBps = will.totalSharesBps || 0;
    if (currentTotalBps + shareBps > 10000) {
      const remainingPercent = (10000 - currentTotalBps) / 100;
      throw new Error(
        `Cannot add ${beneficiary.sharePercent}% share. Only ${remainingPercent.toFixed(1)}% remaining unallocated.`
      );
    }

    logger.tx.creating('add_beneficiary', { address: beneficiary.owner, shareBps });
    logger.tx.signing();

    try {
      const { willConfig: willConfigRecord } = await fetchFreshRecordObjects(requestRecords);

      if (!willConfigRecord) {
        throw new Error('WillConfig record not found. Please clear cache and refresh your will data.');
      }

      const shareBpsStr = `${shareBps}u16`;
      const priority = `${(will.numBeneficiaries + 1)}u8`;

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'add_beneficiary',
        [willConfigRecord, beneficiary.owner, shareBpsStr, priority],
        calculateDynamicFee('add_beneficiary'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'addBeneficiary'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
          logger.will.beneficiaryAdded(beneficiary.owner, shareBps);
        } finally {
          cleanupTxAbortController();
        }
      }

      clearWillCache();
      await invalidateWillCache(will.willId);
      await fetchWill(publicKey, true);
      setLoading(false);
    } catch (err) {
      cleanupTxAbortController();
      logger.debug('Will', 'Raw wallet error:', err);
      const errorMsg = formatWalletError(err);
      logger.will.error('addBeneficiary', errorMsg);
      setError(errorMsg);
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const deposit = async (amount: string, creditsRecord?: string) => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    if (!will) throw new Error('No will found');

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');
    logger.tx.creating('deposit', { amount });
    logger.tx.signing();

    try {
      const microcredits = BigInt(Math.floor(parseFloat(amount) * 1_000_000));

      if (microcredits <= 0n) {
        throw new Error('Deposit amount must be greater than 0');
      }
      if (microcredits < 10000n) {
        throw new Error('Minimum deposit is 0.01 ALEO (10,000 microcredits)');
      }
      if (microcredits > MAX_DEPOSIT_MICROCREDITS) {
        throw new Error('Deposit amount exceeds maximum allowed (u64 overflow)');
      }

      const { willConfig: willConfigRecord } = await fetchFreshRecordObjects(requestRecords);

      if (!willConfigRecord) {
        throw new Error('WillConfig record not found. Please clear cache and refresh.');
      }

      const creditsInput = creditsRecord;

      if (!creditsInput) {
        throw new Error(
          'No private credits available for this amount. Use "Public" deposit for faucet credits instead.'
        );
      }

      const inputs = [willConfigRecord, creditsInput, `${microcredits}u64`];

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'deposit',
        inputs,
        calculateDynamicFee('deposit'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'deposit'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
          logger.will.deposited(amount);
        } finally {
          cleanupTxAbortController();
        }
      }

      clearWillCache();
      await invalidateWillCache(will.willId);
      await fetchWill(publicKey, true);
      setLoading(false);
    } catch (err) {
      cleanupTxAbortController();
      logger.debug('Will', 'Raw wallet error:', err);
      const errorMsg = formatWalletError(err);
      logger.will.error('deposit', errorMsg);
      setError(errorMsg);
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const depositPublic = async (amount: string) => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    if (!will) throw new Error('No will found');

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');
    logger.tx.creating('deposit_public', { amount, willId: will.willId });
    logger.tx.signing();

    try {
      const microcredits = BigInt(Math.floor(parseFloat(amount) * 1_000_000));

      if (microcredits <= 0n) {
        throw new Error('Deposit amount must be greater than 0');
      }
      if (microcredits < 10000n) {
        throw new Error('Minimum deposit is 0.01 ALEO (10,000 microcredits)');
      }
      if (microcredits > MAX_DEPOSIT_MICROCREDITS) {
        throw new Error('Deposit amount exceeds maximum allowed (u64 overflow)');
      }

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'deposit_public',
        [will.willId, `${microcredits}u64`],
        calculateDynamicFee('deposit_public'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'depositPublic'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
          logger.will.deposited(amount);
        } finally {
          cleanupTxAbortController();
        }
      }

      await invalidateWillCache(will.willId);
      await fetchWill(publicKey, true);
      setLoading(false);
    } catch (err) {
      cleanupTxAbortController();
      const errorMsg = formatWalletError(err);
      logger.will.error('depositPublic', errorMsg);
      setError(errorMsg);
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const removeBeneficiary = async (beneficiaryAddress: string, beneficiaryRecordStr?: string) => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    if (!will) throw new Error('No will found');

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');

    try {
      const { willConfig: willConfigRecord, benAllocations } = await fetchFreshRecordObjects(requestRecords);

      if (!willConfigRecord) {
        throw new Error('WillConfig record not found. Please clear cache and refresh.');
      }

      const benAllocationRecord = benAllocations.find((r: any) => {
        const addr = r.data?.beneficiary_addr || '';
        const cleanAddr = typeof addr === 'string' ? addr.replace(/\.private$/, '') : addr;
        return cleanAddr === beneficiaryAddress;
      });

      if (!benAllocationRecord) {
        throw new Error('Beneficiary allocation record not found. Cannot revoke.');
      }

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'revoke_beneficiary',
        [willConfigRecord, benAllocationRecord],
        calculateDynamicFee('revoke_beneficiary'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'removeBeneficiary'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
        } finally {
          cleanupTxAbortController();
        }
      }

      clearWillCache();
      await invalidateWillCache(will.willId);
      await fetchWill(publicKey, true);
      setLoading(false);
    } catch (err) {
      cleanupTxAbortController();
      logger.debug('Will', 'Raw wallet error:', err);
      setError(formatWalletError(err));
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const deactivateWill = async () => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    if (!will) throw new Error('No will found');
    if (will.status !== WillStatus.ACTIVE) throw new Error('Will is not active');

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');

    try {
      // expectedIsActive=true: deactivate_will asserts config.is_active == true
      let willConfigRecord: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { willConfig } = await fetchFreshRecordObjects(requestRecords, true);
        willConfigRecord = willConfig;
        if (willConfigRecord) break;
        logger.debug('Will', `deactivateWill: wallet returned stale record (attempt ${attempt + 1}/3), waiting 3s...`);
        await new Promise(r => setTimeout(r, 3000));
      }

      if (!willConfigRecord) {
        clearWillCache();
        throw new Error("Wallet hasn't received the updated record yet. Please wait a moment and try again.");
      }

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'deactivate_will',
        [willConfigRecord],
        calculateDynamicFee('deactivate_will'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'deactivateWill'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
        } finally {
          cleanupTxAbortController();
        }
      }

      clearWillCache();
      await invalidateWillCache(will.willId);
      await fetchWill(publicKey, true);
      setLoading(false);
    } catch (err) {
      clearWillCache();
      cleanupTxAbortController();
      logger.debug('Will', 'Raw wallet error:', err);
      setError(formatWalletError(err));
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const reactivateWill = async () => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    if (!will) throw new Error('No will found');
    if (will.status !== WillStatus.INACTIVE) throw new Error('Will is not inactive');

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');

    try {
      // Verify on-chain status matches before submitting — stale records will fail
      if (will.willId && will.willId !== 'unknown') {
        const onChainStatus = await aleoService.getWillStatus(will.willId);
        if (onChainStatus !== null && onChainStatus !== WillStatus.INACTIVE) {
          clearWillCache();
          throw new Error(
            `Stale record detected: on-chain status is ${WillStatus[onChainStatus] || onChainStatus}, not INACTIVE. Cache cleared — please retry.`
          );
        }
      }

      // expectedIsActive=false: reactivate_will asserts !config.is_active
      // Retry with delay — wallet may still return stale record after recent deactivation
      let willConfigRecord: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { willConfig } = await fetchFreshRecordObjects(requestRecords, false);
        willConfigRecord = willConfig;
        if (willConfigRecord) break;
        logger.debug('Will', `reactivateWill: wallet returned stale record (attempt ${attempt + 1}/3), waiting 3s...`);
        await new Promise(r => setTimeout(r, 3000));
      }

      if (!willConfigRecord) {
        clearWillCache();
        throw new Error("Wallet hasn't received the updated record yet. Please wait a moment and try again.");
      }

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'reactivate_will',
        [willConfigRecord],
        calculateDynamicFee('reactivate_will'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'reactivateWill'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
        } finally {
          cleanupTxAbortController();
        }
      }

      clearWillCache();
      await invalidateWillCache(will.willId);
      await fetchWill(publicKey, true);
      setLoading(false);
    } catch (err) {
      clearWillCache();
      cleanupTxAbortController();
      logger.debug('Will', 'Raw wallet error:', err);
      setError(formatWalletError(err));
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const triggerWill = async (willIdToTrigger?: string, expectedLocked?: bigint) => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');

    try {
      const targetWillId = willIdToTrigger || willId || getRecord(`will_id_${publicKey}`);
      if (!targetWillId) {
        throw new Error('Will ID not found. Cannot trigger will.');
      }

      logger.tx.creating('trigger_will', { willId: targetWillId });
      logger.tx.signing();

      let lockedAmount = expectedLocked;
      if (!lockedAmount) {
        const totalLocked = await aleoService.getTotalLocked(targetWillId);
        lockedAmount = totalLocked || 0n;
      }

      // trigger_address needed because self.caller in nested credits.aleo call refers to the program
      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'trigger_will',
        [targetWillId, `${lockedAmount}u64`, publicKey],
        calculateDynamicFee('trigger_will'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'triggerWill'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
          logger.will.triggered(targetWillId);
        } finally {
          cleanupTxAbortController();
        }
      }

      await invalidateWillCache(targetWillId);
      await fetchWill(publicKey, true);
      setLoading(false);
    } catch (err) {
      cleanupTxAbortController();
      const errorMsg = formatWalletError(err);
      logger.will.error('triggerWill', errorMsg);
      setError(errorMsg);
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const withdraw = async (lockedCreditsRecordStr?: string) => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    if (!will) throw new Error('No will found');

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');
    logger.tx.creating('withdraw');
    logger.tx.signing();

    try {
      const { willConfig: willConfigRecord, lockedCredits } = await fetchFreshRecordObjects(requestRecords);

      if (!willConfigRecord) {
        throw new Error('WillConfig record not found. Please clear cache and refresh.');
      }

      if (lockedCredits.length === 0) {
        throw new Error('No locked credits record found. Nothing to withdraw.');
      }

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'withdraw',
        [willConfigRecord, lockedCredits[0]],
        calculateDynamicFee('withdraw'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'withdraw'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
          logger.will.withdrawn('all locked credits');
        } finally {
          cleanupTxAbortController();
        }
      }

      clearWillCache();
      await invalidateWillCache(will.willId);
      await fetchWill(publicKey, true);
      setLoading(false);
    } catch (err) {
      cleanupTxAbortController();
      logger.debug('Will', 'Raw wallet error:', err);
      const errorMsg = formatWalletError(err);
      logger.will.error('withdraw', errorMsg);
      setError(errorMsg);
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const emergencyRecovery = async () => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    if (!will) throw new Error('No will found');
    if (will.status !== WillStatus.TRIGGERED) throw new Error('Will must be triggered to recover');

    const halfLocked = will.totalLocked / 2n;
    if (will.totalClaimed >= halfLocked) {
      throw new Error('Cannot recover - more than 50% has been claimed');
    }

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');
    logger.tx.creating('emergency_recovery', { willId: will.willId });
    logger.tx.signing();

    try {
      const { willConfig: willConfigRecord, lockedCredits } = await fetchFreshRecordObjects(requestRecords);

      if (!willConfigRecord) {
        throw new Error('WillConfig record not found. Please clear cache and refresh.');
      }

      if (lockedCredits.length === 0) {
        throw new Error('LockedCredits record not found. Cannot perform emergency recovery without locked funds record.');
      }

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'emergency_recovery',
        [willConfigRecord, lockedCredits[0]],
        calculateDynamicFee('emergency_recovery'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'emergencyRecovery'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
          logger.info('Will', 'Emergency recovery completed');
        } finally {
          cleanupTxAbortController();
        }
      }

      clearWillCache();
      await invalidateWillCache(will.willId);
      await fetchWill(publicKey, true);
      setLoading(false);
    } catch (err) {
      cleanupTxAbortController();
      logger.debug('Will', 'Raw wallet error:', err);
      const errorMsg = formatWalletError(err);
      logger.will.error('emergencyRecovery', errorMsg);
      setError(errorMsg);
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const claimInheritanceV2 = async (targetWillId: string, shareBps: number, amountToClaim: bigint) => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');
    logger.tx.creating('claim_inheritance_v2', { willId: targetWillId, shareBps, amount: String(amountToClaim) });
    logger.tx.signing();

    try {
      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'claim_inheritance_v2',
        [targetWillId, publicKey, `${amountToClaim}u64`, `${shareBps}u16`],
        calculateDynamicFee('claim_inheritance_v2'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'claimInheritanceV2'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
          logger.will.claimed(`${Number(amountToClaim) / 1_000_000} ALEO`);
        } finally {
          cleanupTxAbortController();
        }
      }

      setLoading(false);
      return { success: true, txId: typeof txId === 'string' ? txId : '' };
    } catch (err) {
      cleanupTxAbortController();
      const errorMsg = formatWalletError(err);
      logger.will.error('claimInheritanceV2', errorMsg);
      setError(errorMsg);
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const claimInheritance = async (beneficiaryRecordStr?: string, amountToClaim?: bigint) => {
    if (!publicKey || !requestTransaction || !adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);
    setCurrentTxId(null);
    setTxProgress('signing');
    logger.tx.creating('claim_inheritance', { amount: amountToClaim?.toString() || 'calculated' });
    logger.tx.signing();

    try {
      let benRecord = beneficiaryRecordStr;

      if (!benRecord) {
        for (let i = 0; i < 10; i++) {
          const storedRecord = getRecord(`beneficiary_${publicKey}_${i}`);
          if (storedRecord) {
            benRecord = storedRecord;
            logger.debug('Will', `Found beneficiary record at index ${i}`);
            break;
          }
        }
      }

      if (!benRecord) {
        throw new Error('Beneficiary record not found. You may not be a beneficiary of this will, or consider using claimInheritanceV2 which does not require a record.');
      }

      let beneficiaryInput: string;
      try {
        const parsed = JSON.parse(benRecord);
        beneficiaryInput = parsed.plaintext || parsed.ciphertext || benRecord;
      } catch {
        // If not JSON, use as-is (already plaintext format)
        beneficiaryInput = benRecord;
      }

      let claimAmount = amountToClaim;
      if (!claimAmount && will) {
        const myBeneficiary = will.beneficiaries.find(
          b => b.owner.toLowerCase() === publicKey.toLowerCase() ||
               b.beneficiaryAddr?.toLowerCase() === publicKey.toLowerCase()
        );
        if (myBeneficiary) {
          claimAmount = (will.totalLocked * BigInt(myBeneficiary.shareBps)) / 10000n;
        }
      }

      if (!claimAmount || claimAmount === 0n) {
        throw new Error('Cannot determine claim amount. Please provide the amount to claim.');
      }

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        'claim_inheritance',
        [beneficiaryInput, `${claimAmount}u64`],
        calculateDynamicFee('claim_inheritance'),
        false
      );

      const txId = await retryWalletOperation(
        () => requestTransaction(aleoTransaction),
        'claimInheritance'
      );
      if (typeof txId === 'string') {
        const abortController = createTxAbortController();
        try {
          await pollTransactionStatus(adapter, txId, 60, 2000, setTxProgress, setCurrentTxId, abortController.signal);
          logger.will.claimed(`${Number(claimAmount) / 1_000_000} ALEO`);
        } finally {
          cleanupTxAbortController();
        }
      }

      setLoading(false);
      return { success: true, txId: typeof txId === 'string' ? txId : '' };
    } catch (err) {
      cleanupTxAbortController();
      const errorMsg = formatWalletError(err);
      logger.will.error('claimInheritance', errorMsg);
      setError(errorMsg);
      setTxProgress('error');
      setLoading(false);
      throw err;
    }
  };

  const getTransactionExplorerUrl = (): string | null => {
    if (!currentTxId) return null;
    return getExplorerUrl(currentTxId);
  };

  const resetTransaction = () => {
    setTxProgress('idle');
    setCurrentTxId(null);
    setError(null);
  };

  const clearWillCache = () => {
    if (publicKey) {
      removeRecord(`will_id_${publicKey}`);
      removeRecord(`will_config_${publicKey}`);
      removePlaintext(`will_config_${publicKey}`);
      for (let i = 0; i < 10; i++) {
        removeRecord(`beneficiary_${publicKey}_${i}`);
        removePlaintext(`beneficiary_${publicKey}_${i}`);
      }
      for (let i = 0; i < 20; i++) {
        removeRecord(`locked_credits_${publicKey}_${i}`);
        removePlaintext(`locked_credits_${publicKey}_${i}`);
      }
      setWillId(null);
      setWillConfigRecord(null);
      setBeneficiaryRecords(new Map());
      setLockedCreditsRecords([]);
      logger.info('Will', 'Cache cleared (including plaintexts) - next fetch will request records from wallet');
    }
  };

  const cancelActiveTransaction = () => {
    if (activeAbortController) {
      activeAbortController.abort();
      setActiveAbortController(null);
      setTxProgress('idle');
      logger.debug('TX', 'Cancelled active transaction polling');
    }
  };

  return {
    will,
    willId,
    willConfigRecord,
    lockedCreditsRecords,
    isLoading,
    error,
    programDeployed,
    txProgress,
    currentTxId,
    setTxProgress,
    fetchWill,
    createWill,
    checkIn,
    addBeneficiary,
    removeBeneficiary,
    deposit,
    depositPublic,
    withdraw,
    deactivateWill,
    reactivateWill,
    triggerWill,
    emergencyRecovery,
    claimInheritance,
    claimInheritanceV2,
    checkProgramDeployed,
    loadStoredRecords,
    getTransactionExplorerUrl,
    resetTransaction,
    clearWillCache,
    cancelActiveTransaction,
  };
}
