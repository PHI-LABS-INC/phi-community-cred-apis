import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";

export interface VerificationResult<T = string> {
  mint_eligibility: boolean;
  data?: T;
}

export interface SimpleVerificationResult {
  mint_eligibility: boolean;
}

/**
 * Generic multi-wallet verifier that handles checking multiple addresses
 * @param req - Next.js request object
 * @param verifyFunction - Function that takes an address and returns verification result
 * @returns Verification result with eligibility status and optional data
 */
export async function verifyMultipleWallets<T = string>(
  req: NextRequest,
  verifyFunction: (address: Address) => Promise<boolean | [boolean, T]>
): Promise<VerificationResult<T>> {
  const address = req.nextUrl.searchParams.get("address");
  const addresses = req.nextUrl.searchParams.get("addresses");

  if (!address || !isAddress(address)) {
    throw new Error("Invalid address provided");
  }

  const addressesToCheck: Address[] = [address as Address];
  if (addresses) {
    const additionalAddresses = addresses
      .split(",")
      .map((addr) => addr.trim())
      .filter((addr) => isAddress(addr)) as Address[];
    addressesToCheck.push(...additionalAddresses);
  }

  for (const addr of addressesToCheck) {
    try {
      const result = await verifyFunction(addr);

      // Handle both boolean and [boolean, data] return types
      if (Array.isArray(result)) {
        const [eligible, data] = result;
        if (eligible) {
          return {
            mint_eligibility: true,
            data,
          };
        }
      } else if (result === true) {
        return {
          mint_eligibility: true,
        };
      }
    } catch (error) {
      console.warn(`Error checking address ${addr}:`, error);
    }
  }

  return {
    mint_eligibility: false,
    data: undefined as T,
  };
}

/**
 * Simplified version for functions that only return boolean
 */
export async function verifyMultipleWalletsSimple(
  req: NextRequest,
  verifyFunction: (address: Address) => Promise<boolean>
): Promise<SimpleVerificationResult> {
  const result = await verifyMultipleWallets(req, verifyFunction);
  return { mint_eligibility: result.mint_eligibility };
}
