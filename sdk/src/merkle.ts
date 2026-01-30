/**
 * Merkle Tree utilities for Digital Will SDK
 *
 * Provides Merkle tree construction and proof generation for
 * anonymous beneficiary verification. Matches the contract's
 * 4-level tree implementation supporting up to 16 beneficiaries.
 */

import { AleoField } from './types';
import { DigitalWillError, ErrorCode } from './errors';

/**
 * A leaf in the Merkle tree
 */
export interface MerkleLeaf {
  /**
   * Index position in the tree (0-15)
   */
  index: number;

  /**
   * Leaf value (hash of beneficiary data)
   */
  value: AleoField;

  /**
   * Optional metadata for the leaf
   */
  metadata?: {
    beneficiaryAddress?: string;
    shareBps?: number;
  };
}

/**
 * Merkle proof for verifying leaf membership
 */
export interface MerkleProof {
  /**
   * Leaf index in the tree
   */
  index: number;

  /**
   * Leaf value
   */
  leaf: AleoField;

  /**
   * Path of sibling hashes (4 elements for 4-level tree)
   */
  path: [AleoField, AleoField, AleoField, AleoField];

  /**
   * Path indices encoded as bits (which side each sibling is on)
   */
  pathIndices: number;

  /**
   * Root of the tree this proof validates against
   */
  root: AleoField;
}

/**
 * Merkle Tree implementation
 *
 * Supports up to 16 leaves (4-level tree) as per the Leo contract.
 * Uses BHP256-compatible hashing for consistency with on-chain verification.
 *
 * @example
 * ```typescript
 * // Create tree with beneficiary leaves
 * const leaves = beneficiaries.map((b, i) => ({
 *   index: i,
 *   value: hashBeneficiary(b.address, b.shareBps),
 *   metadata: { beneficiaryAddress: b.address, shareBps: b.shareBps }
 * }));
 *
 * const tree = new MerkleTree(leaves);
 *
 * // Get proof for beneficiary at index 2
 * const proof = tree.getProof(2);
 *
 * // Verify the proof
 * const isValid = tree.verify(proof.leaf, proof);
 * ```
 */
export class MerkleTree {
  /**
   * Tree depth (4 levels = 16 leaves max)
   */
  readonly depth: number;

  /**
   * All leaves (padded to 16)
   */
  private readonly leaves: AleoField[];

  /**
   * All tree layers (leaves + internal nodes + root)
   */
  private readonly layers: AleoField[][];

  /**
   * Original leaf data with metadata
   */
  private readonly leafData: Map<number, MerkleLeaf>;

  /**
   * Zero value for empty leaves (hash of empty string)
   */
  static readonly ZERO_VALUE: AleoField = '0field';

  /**
   * Maximum number of leaves (2^depth)
   */
  static readonly MAX_LEAVES = 16;

  /**
   * Create a new Merkle Tree
   *
   * @param leaves - Array of leaves to include
   * @param depth - Tree depth (default: 4 for 16 leaves)
   * @throws DigitalWillError if too many leaves
   */
  constructor(leaves: MerkleLeaf[], depth: number = 4) {
    if (leaves.length > Math.pow(2, depth)) {
      throw new DigitalWillError(
        ErrorCode.BENEFICIARY_LIMIT_EXCEEDED,
        `Maximum ${Math.pow(2, depth)} leaves allowed for depth ${depth}`
      );
    }

    this.depth = depth;
    this.leafData = new Map();

    // Store leaf data
    for (const leaf of leaves) {
      if (leaf.index < 0 || leaf.index >= Math.pow(2, depth)) {
        throw new DigitalWillError(
          ErrorCode.INVALID_PARAMETER,
          `Leaf index ${leaf.index} out of range`
        );
      }
      this.leafData.set(leaf.index, leaf);
    }

    // Initialize leaves array with zeros
    const numLeaves = Math.pow(2, depth);
    this.leaves = new Array(numLeaves).fill(MerkleTree.ZERO_VALUE);

    // Set actual leaf values
    for (const leaf of leaves) {
      this.leaves[leaf.index] = leaf.value;
    }

    // Build tree layers
    this.layers = this.buildLayers();
  }

  /**
   * Get the Merkle root
   */
  get root(): AleoField {
    const lastLayer = this.layers[this.layers.length - 1];
    return lastLayer?.[0] ?? MerkleTree.ZERO_VALUE;
  }

  /**
   * Get number of non-zero leaves
   */
  get leafCount(): number {
    return this.leafData.size;
  }

  /**
   * Get all leaves
   */
  getLeaves(): AleoField[] {
    return [...this.leaves];
  }

  /**
   * Get leaf data at index
   */
  getLeafData(index: number): MerkleLeaf | undefined {
    return this.leafData.get(index);
  }

  /**
   * Generate a proof for leaf at given index
   *
   * @param index - Leaf index (0 to maxLeaves-1)
   * @returns Merkle proof
   * @throws DigitalWillError if index out of range
   */
  getProof(index: number): MerkleProof {
    if (index < 0 || index >= this.leaves.length) {
      throw new DigitalWillError(
        ErrorCode.INVALID_PARAMETER,
        `Index ${index} out of range [0, ${this.leaves.length - 1}]`
      );
    }

    const path: AleoField[] = [];
    let pathIndices = 0;
    let currentIndex = index;

    // Build path from leaf to root
    for (let layer = 0; layer < this.depth; layer++) {
      const layerNodes = this.layers[layer];
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

      // Match Leo contract semantics (main.leo:872-892):
      // If current index is odd: current is RIGHT, sibling is LEFT → bit = 1
      // If current index is even: current is LEFT, sibling is RIGHT → bit = 0
      if (currentIndex % 2 === 1) {
        pathIndices |= (1 << layer);
      }

      const siblingValue = layerNodes?.[siblingIndex] ?? MerkleTree.ZERO_VALUE;
      path.push(siblingValue);
      currentIndex = Math.floor(currentIndex / 2);
    }

    const leafValue = this.leaves[index] ?? MerkleTree.ZERO_VALUE;
    return {
      index,
      leaf: leafValue,
      path: path as [AleoField, AleoField, AleoField, AleoField],
      pathIndices,
      root: this.root,
    };
  }

  /**
   * Verify a Merkle proof
   *
   * @param leaf - Leaf value to verify
   * @param proof - Merkle proof
   * @returns True if proof is valid
   */
  verify(leaf: AleoField, proof: MerkleProof): boolean {
    const computedRoot = MerkleTree.computeRoot(leaf, proof.path, proof.pathIndices);
    return computedRoot === proof.root;
  }

  /**
   * Compute Merkle root from leaf and proof path
   *
   * This matches the contract's compute_merkle_root inline function.
   *
   * @param leaf - Leaf value
   * @param path - Sibling path
   * @param pathIndices - Encoded path indices
   * @returns Computed root
   */
  static computeRoot(
    leaf: AleoField,
    path: [AleoField, AleoField, AleoField, AleoField],
    pathIndices: number
  ): AleoField {
    let current = leaf;

    for (let i = 0; i < 4; i++) {
      const sibling = path[i] ?? MerkleTree.ZERO_VALUE;
      // CRITICAL FIX: Match Leo contract logic from compute_merkle_root (main.leo:872-892)
      // When bit is 0: current is on LEFT, sibling on RIGHT → hash(current + sibling)
      // When bit is 1: current is on RIGHT, sibling on LEFT → hash(sibling + current)
      const isLeftPosition = ((pathIndices >> i) & 1) === 0;

      if (isLeftPosition) {
        // Current is on the left, sibling on right
        current = MerkleTree.hashPair(current, sibling);
      } else {
        // Current is on the right, sibling on left
        current = MerkleTree.hashPair(sibling, current);
      }
    }

    return current;
  }

  /**
   * Hash two child nodes to get parent
   *
   * WARNING: This is a PLACEHOLDER hash function that does NOT match the on-chain
   * BHP256 computation. The Leo contract uses:
   *   BHP256::hash_to_field(left + right)
   * where left and right are field elements added together before hashing.
   *
   * For production Merkle proofs with claim_with_merkle_proof, you MUST use
   * the actual Aleo SDK's BHP256 hash function.
   *
   * TODO: Replace with actual Aleo SDK BHP256 implementation for production.
   */
  static hashPair(left: AleoField, right: AleoField): AleoField {
    // PLACEHOLDER: This does NOT match BHP256::hash_to_field(left + right)
    // The contract adds field elements then hashes, not string concatenation
    // For testing only - production must use Aleo SDK's BHP256
    const leftNum = BigInt(left.replace('field', '') || '0');
    const rightNum = BigInt(right.replace('field', '') || '0');

    let hash = 0n;
    const combined = leftNum.toString() + ':' + rightNum.toString();
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 31n + BigInt(combined.charCodeAt(i))) % (2n ** 253n);
    }

    return `${hash}field`;
  }

  /**
   * Hash beneficiary data for use as leaf value
   *
   * WARNING: This is a PLACEHOLDER hash function that does NOT match the on-chain
   * BHP256 computation. For production use with claim_with_merkle_proof, you MUST
   * use the actual Aleo SDK's BHP256 hash function.
   *
   * The Leo contract computes leaves as (main.leo:967-968):
   *   let share_field: field = share_bps as field;
   *   let leaf: field = BHP256::hash_to_field(BHP256::hash_to_field(claimer_address) + share_field);
   *
   * CRITICAL: The willId is NOT part of the leaf hash in the contract!
   *
   * TODO: Replace with actual Aleo SDK BHP256 implementation for production.
   *
   * @param beneficiaryAddress - Beneficiary's Aleo address
   * @param shareBps - Share in basis points
   * @param _willId - DEPRECATED: Will identifier is NOT used by contract (kept for API compatibility)
   * @returns Hash as field element (placeholder - not BHP256 compatible)
   */
  static hashBeneficiary(
    beneficiaryAddress: string,
    shareBps: number,
    _willId?: AleoField // eslint-disable-line @typescript-eslint/no-unused-vars
  ): AleoField {
    // PLACEHOLDER: This does NOT match BHP256::hash_to_field
    // The actual contract formula is: BHP256::hash_to_field(BHP256::hash_to_field(address) + share_bps_as_field)
    // For testing only - production must use Aleo SDK's BHP256
    //
    // FIX: Do NOT include willId in the hash - contract doesn't use it!
    // The formula should be: hash(hash(address) + share_bps)
    const data = `${beneficiaryAddress}:${shareBps}`;
    let hash = 0n;
    for (let i = 0; i < data.length; i++) {
      hash = (hash * 31n + BigInt(data.charCodeAt(i))) % (2n ** 253n);
    }
    return `${hash}field`;
  }

  /**
   * Create tree from beneficiary list
   *
   * Convenience factory method for creating a tree from beneficiary data.
   *
   * @param beneficiaries - Array of beneficiary info
   * @param willId - Will identifier for domain separation
   * @returns MerkleTree instance
   */
  static fromBeneficiaries(
    beneficiaries: Array<{ address: string; shareBps: number }>,
    willId?: AleoField
  ): MerkleTree {
    const leaves: MerkleLeaf[] = beneficiaries.map((b, index) => ({
      index,
      value: MerkleTree.hashBeneficiary(b.address, b.shareBps, willId),
      metadata: {
        beneficiaryAddress: b.address,
        shareBps: b.shareBps,
      },
    }));

    return new MerkleTree(leaves);
  }

  /**
   * Build tree layers from leaves
   */
  private buildLayers(): AleoField[][] {
    const layers: AleoField[][] = [this.leaves];

    let currentLayer = this.leaves;
    for (let d = 0; d < this.depth; d++) {
      const nextLayer: AleoField[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i] ?? MerkleTree.ZERO_VALUE;
        const right = currentLayer[i + 1] ?? MerkleTree.ZERO_VALUE;
        nextLayer.push(MerkleTree.hashPair(left, right));
      }
      layers.push(nextLayer);
      currentLayer = nextLayer;
    }

    return layers;
  }

  /**
   * Export tree for serialization
   */
  toJSON(): {
    depth: number;
    root: AleoField;
    leaves: Array<{ index: number; value: AleoField; metadata?: unknown }>;
  } {
    const leaves: Array<{ index: number; value: AleoField; metadata?: unknown }> = [];
    for (const [index, leaf] of this.leafData) {
      leaves.push({
        index,
        value: leaf.value,
        metadata: leaf.metadata,
      });
    }

    return {
      depth: this.depth,
      root: this.root,
      leaves,
    };
  }

  /**
   * Create tree from serialized data
   */
  static fromJSON(data: {
    depth: number;
    leaves: Array<{ index: number; value: AleoField; metadata?: unknown }>;
  }): MerkleTree {
    const leaves: MerkleLeaf[] = data.leaves.map(l => ({
      index: l.index,
      value: l.value,
      metadata: l.metadata as MerkleLeaf['metadata'],
    }));

    return new MerkleTree(leaves, data.depth);
  }
}

/**
 * Verify a Merkle proof independently (without tree instance)
 */
export function verifyMerkleProof(
  leaf: AleoField,
  path: [AleoField, AleoField, AleoField, AleoField],
  pathIndices: number,
  expectedRoot: AleoField
): boolean {
  const computedRoot = MerkleTree.computeRoot(leaf, path, pathIndices);
  return computedRoot === expectedRoot;
}

/**
 * Format proof for contract input
 */
export function formatProofForContract(proof: MerkleProof): {
  merkle_path_0: AleoField;
  merkle_path_1: AleoField;
  merkle_path_2: AleoField;
  merkle_path_3: AleoField;
  path_indices: string;
} {
  if (proof.path.length !== 4) {
    throw new Error(`Merkle proof path must have exactly 4 elements, got ${proof.path.length}`);
  }
  if (proof.pathIndices < 0 || proof.pathIndices > 15) {
    throw new Error(`Merkle proof path_indices must be 0-15 (4-bit), got ${proof.pathIndices}`);
  }
  return {
    merkle_path_0: proof.path[0],
    merkle_path_1: proof.path[1],
    merkle_path_2: proof.path[2],
    merkle_path_3: proof.path[3],
    path_indices: `${proof.pathIndices}u8`,
  };
}

/**
 * Create an empty Merkle tree with all zero leaves
 */
export function createEmptyTree(depth: number = 4): MerkleTree {
  return new MerkleTree([], depth);
}
