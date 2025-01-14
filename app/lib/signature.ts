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
  const encodedData = encodeAbiParameters(
    parseAbiParameters("address, bool, bytes32"),
    [address, mint_eligibility, toHex(data || 0, { size: 32 })]
  );
  const { r, s, v } = await sign({
    hash: hashMessage({ raw: toBytes(keccak256(encodedData)) }),
    privateKey: process.env.SIGNER_PRIVATE_KEY as Hex,
  });
  let sBigInt = BigInt(s);
  if (v !== BigInt(27)) {
    sBigInt = sBigInt | (BigInt(1) << BigInt(255));
  }
  const sHex = toHex(sBigInt, { size: 32 });
  return `0x${r.slice(2)}${sHex.slice(2)}`;
}
