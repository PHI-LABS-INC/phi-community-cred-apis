import {
  encodeAbiParameters,
  parseAbiParameters,
  toBytes,
  Hex,
  hashMessage,
  keccak256,
  toHex,
  Address,
} from "viem";
import { sign } from "viem/accounts";

export async function createSignature({
  address,
  mint_eligibility,
  data,
}: {
  address: Address;
  mint_eligibility: boolean;
  data?: string;
}): Promise<Hex> {
  // Encode the parameters
  const encodedData = encodeAbiParameters(
    parseAbiParameters("address, bool, bytes32"),
    [address, mint_eligibility, toHex(data || 0, { size: 32 })]
  );

  // Sign the hash
  const { r, s, v } = await sign({
    hash: hashMessage({ raw: toBytes(keccak256(encodedData)) }),
    privateKey: process.env.SIGNER_PRIVATE_KEY as Hex,
  });

  // Adjust `s` to be in the lower range if needed
  let sBigInt = BigInt(s);
  if (v !== BigInt(27)) {
    sBigInt = sBigInt | (BigInt(1) << BigInt(255));
  }

  // Convert `s` to a 32-byte hex value
  const sHex = toHex(sBigInt, { size: 32 });

  // Return the concatenated signature
  return `0x${r.slice(2)}${sHex.slice(2)}`;
}
