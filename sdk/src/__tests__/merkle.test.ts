/**
 * Merkle Tree Tests
 */

import {
  MerkleTree,
  verifyMerkleProof,
  formatProofForContract,
  createEmptyTree,
} from '../merkle';

describe('MerkleTree', () => {
  describe('constructor', () => {
    it('should create a tree with leaves', () => {
      const leaves = [
        { index: 0, value: '100field' },
        { index: 1, value: '200field' },
      ];
      const tree = new MerkleTree(leaves);

      expect(tree.leafCount).toBe(2);
      expect(tree.depth).toBe(4);
      expect(tree.root).toBeTruthy();
    });

    it('should throw for too many leaves', () => {
      const leaves = Array.from({ length: 17 }, (_, i) => ({
        index: i,
        value: `${i}field`,
      }));

      expect(() => new MerkleTree(leaves)).toThrow('Maximum 16 leaves');
    });

    it('should throw for invalid leaf index', () => {
      const leaves = [{ index: 20, value: '100field' }];
      expect(() => new MerkleTree(leaves)).toThrow('out of range');
    });
  });

  describe('root', () => {
    it('should compute consistent root for same leaves', () => {
      const leaves = [
        { index: 0, value: '100field' },
        { index: 1, value: '200field' },
      ];

      const tree1 = new MerkleTree(leaves);
      const tree2 = new MerkleTree(leaves);

      expect(tree1.root).toBe(tree2.root);
    });

    it('should compute different root for different leaves', () => {
      const tree1 = new MerkleTree([{ index: 0, value: '100field' }]);
      const tree2 = new MerkleTree([{ index: 0, value: '200field' }]);

      expect(tree1.root).not.toBe(tree2.root);
    });
  });

  describe('getProof', () => {
    it('should generate a valid proof', () => {
      const leaves = [
        { index: 0, value: '100field' },
        { index: 1, value: '200field' },
        { index: 2, value: '300field' },
      ];
      const tree = new MerkleTree(leaves);

      const proof = tree.getProof(1);

      expect(proof.index).toBe(1);
      expect(proof.leaf).toBe('200field');
      expect(proof.path.length).toBe(4);
      expect(proof.root).toBe(tree.root);
    });

    it('should throw for index out of range', () => {
      const tree = new MerkleTree([{ index: 0, value: '100field' }]);
      expect(() => tree.getProof(16)).toThrow('out of range');
      expect(() => tree.getProof(-1)).toThrow('out of range');
    });
  });

  describe('verify', () => {
    it('should verify a valid proof', () => {
      const leaves = [
        { index: 0, value: '100field' },
        { index: 1, value: '200field' },
        { index: 2, value: '300field' },
        { index: 3, value: '400field' },
      ];
      const tree = new MerkleTree(leaves);

      for (let i = 0; i < leaves.length; i++) {
        const proof = tree.getProof(i);
        expect(tree.verify(leaves[i].value, proof)).toBe(true);
      }
    });

    it('should reject an invalid leaf', () => {
      const tree = new MerkleTree([{ index: 0, value: '100field' }]);
      const proof = tree.getProof(0);

      expect(tree.verify('999field', proof)).toBe(false);
    });

    it('should reject a tampered proof', () => {
      const tree = new MerkleTree([
        { index: 0, value: '100field' },
        { index: 1, value: '200field' },
      ]);
      const proof = tree.getProof(0);

      // Tamper with the path (use a valid field format but different value)
      const tamperedProof = {
        ...proof,
        path: ['999999field', proof.path[1], proof.path[2], proof.path[3]] as [string, string, string, string],
      };

      expect(tree.verify('100field', tamperedProof)).toBe(false);
    });
  });

  describe('computeRoot', () => {
    it('should compute the same root as getProof', () => {
      const leaves = [
        { index: 0, value: '100field' },
        { index: 1, value: '200field' },
      ];
      const tree = new MerkleTree(leaves);
      const proof = tree.getProof(1);

      const computedRoot = MerkleTree.computeRoot(
        proof.leaf,
        proof.path,
        proof.pathIndices
      );

      expect(computedRoot).toBe(tree.root);
    });
  });

  describe('hashPair', () => {
    it('should produce consistent hashes', () => {
      const hash1 = MerkleTree.hashPair('100field', '200field');
      const hash2 = MerkleTree.hashPair('100field', '200field');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different order', () => {
      const hash1 = MerkleTree.hashPair('100field', '200field');
      const hash2 = MerkleTree.hashPair('200field', '100field');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('hashBeneficiary', () => {
    it('should hash beneficiary data to a field', () => {
      const hash = MerkleTree.hashBeneficiary(
        'aleo1testaddress123456789012345678901234567890123456789012',
        5000,
        '123field'
      );

      expect(hash).toMatch(/^\d+field$/);
    });

    it('should produce different hashes for different shares', () => {
      const hash1 = MerkleTree.hashBeneficiary('aleo1test', 5000);
      const hash2 = MerkleTree.hashBeneficiary('aleo1test', 6000);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('fromBeneficiaries', () => {
    it('should create a tree from beneficiary list', () => {
      const beneficiaries = [
        { address: 'aleo1alice', shareBps: 5000 },
        { address: 'aleo1bob', shareBps: 3000 },
        { address: 'aleo1charlie', shareBps: 2000 },
      ];

      const tree = MerkleTree.fromBeneficiaries(beneficiaries, '123field');

      expect(tree.leafCount).toBe(3);
      expect(tree.root).toBeTruthy();
    });
  });

  describe('toJSON / fromJSON', () => {
    it('should serialize and deserialize correctly', () => {
      const leaves = [
        { index: 0, value: '100field', metadata: { beneficiaryAddress: 'aleo1test' } },
        { index: 1, value: '200field' },
      ];
      const tree = new MerkleTree(leaves);

      const json = tree.toJSON();
      const restored = MerkleTree.fromJSON(json);

      expect(restored.root).toBe(tree.root);
      expect(restored.leafCount).toBe(tree.leafCount);
    });
  });
});

describe('verifyMerkleProof', () => {
  it('should verify a proof independently', () => {
    const tree = new MerkleTree([
      { index: 0, value: '100field' },
      { index: 1, value: '200field' },
    ]);
    const proof = tree.getProof(0);

    const isValid = verifyMerkleProof(
      proof.leaf,
      proof.path,
      proof.pathIndices,
      tree.root
    );

    expect(isValid).toBe(true);
  });

  it('should reject invalid root', () => {
    const tree = new MerkleTree([{ index: 0, value: '100field' }]);
    const proof = tree.getProof(0);

    const isValid = verifyMerkleProof(
      proof.leaf,
      proof.path,
      proof.pathIndices,
      'wrongroot'
    );

    expect(isValid).toBe(false);
  });
});

describe('formatProofForContract', () => {
  it('should format proof for Leo contract input', () => {
    const tree = new MerkleTree([{ index: 0, value: '100field' }]);
    const proof = tree.getProof(0);

    const formatted = formatProofForContract(proof);

    expect(formatted.merkle_path_0).toBe(proof.path[0]);
    expect(formatted.merkle_path_1).toBe(proof.path[1]);
    expect(formatted.merkle_path_2).toBe(proof.path[2]);
    expect(formatted.merkle_path_3).toBe(proof.path[3]);
    expect(formatted.path_indices).toMatch(/^\d+u8$/);
  });
});

describe('createEmptyTree', () => {
  it('should create a tree with all zero leaves', () => {
    const tree = createEmptyTree(4);

    expect(tree.leafCount).toBe(0);
    // Root is the result of hashing zeros together, not zero itself
    expect(tree.root).toBeTruthy();
    expect(tree.root).toMatch(/^\d+field$/);
  });
});
