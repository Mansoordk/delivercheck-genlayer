import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window { ethereum?: EthereumProvider; }
}

function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask or another EIP-1193 wallet is required.");
  }
  return window.ethereum;
}

export async function connectWallet() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Set NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS in frontend/.env.local.");
  }
  const provider = getProvider();
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts?.[0]) throw new Error("No wallet account was returned.");

  const client = createClient({
    chain: studionet,
    account: accounts[0] as `0x${string}`,
    provider,
  });
  await client.connect("studionet");

  return { address: accounts[0] as `0x${string}`, client };
}

export function getReadClient() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Set NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS in frontend/.env.local.");
  }
  return createClient({ chain: studionet });
}

export function getWalletClient(account: `0x${string}`) {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Set NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS in frontend/.env.local.");
  }
  return createClient({ chain: studionet, account, provider: getProvider() });
}

export async function waitForDecision(
  client: ReturnType<typeof getReadClient>,
  hash: `0x${string}`,
  onStatus?: (status: string) => void,
) {
  for (let i = 0; i < 240; i += 1) {
    try {
      const lifecycle = await client.advanced.getTransactionLifecycle({ hash });
      const status = lifecycle?.status || "PENDING";
      onStatus?.(String(status));
      if (status === "ACCEPTED" || status === "FINALIZED" || status === "REJECTED") {
        return lifecycle;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("Timed out while waiting for the GenLayer decision.");
}

export async function waitForReceipt(
  client: ReturnType<typeof getReadClient>,
  hash: `0x${string}`,
) {
  return client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    interval: 5000,
    retries: 240,
  });
}

export function assertSuccessfulReturn(receipt: { execution_result?: string }) {
  if (
    receipt.execution_result &&
    receipt.execution_result !== ExecutionResult.FINISHED_WITH_RETURN
  ) {
    throw new Error(
      `Transaction finished with execution result: ${receipt.execution_result}`,
    );
  }
}
