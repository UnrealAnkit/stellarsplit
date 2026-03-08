/**
 * stellar.js — StellarSplit on-chain settlement logic
 * Uses Stellar Testnet + Horizon API
 */

import * as StellarSdk from "stellar-sdk";
import { isConnected, getPublicKey, signTransaction } from "@stellar/freighter-api";

export const NETWORK           = "TESTNET";
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const HORIZON_URL        = "https://horizon-testnet.stellar.org";
export const FRIENDBOT_URL      = "https://friendbot.stellar.org";
export const server             = new StellarSdk.Horizon.Server(HORIZON_URL);

// ── Freighter ──────────────────────────────────────────────────────────────
export async function checkFreighter() {
  try { return !!(await isConnected()); } catch { return false; }
}
export async function connectFreighter() {
  if (!(await isConnected())) throw new Error("Freighter not installed — get it at freighter.app");
  const pk = await getPublicKey();
  if (!pk) throw new Error("No account in Freighter.");
  return pk;
}

// ── Keypair helpers ────────────────────────────────────────────────────────
export function generateKeypair() {
  const kp = StellarSdk.Keypair.random();
  return { publicKey: kp.publicKey(), secretKey: kp.secret() };
}

export async function fundTestnet(publicKey) {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (JSON.stringify(err).includes("already")) return true;
    throw new Error("Friendbot error");
  }
  return true;
}

export async function getBalance(publicKey) {
  try {
    const acc = await server.loadAccount(publicKey);
    const xlm = acc.balances.find(b => b.asset_type === "native");
    return xlm ? parseFloat(xlm.balance).toFixed(4) : "0.0000";
  } catch { return "0.0000"; }
}

// ── Core: send a single settlement payment ──────────────────────────────────
/**
 * Settle one share on-chain.
 * @param {object} p
 *   senderPublicKey  — who's paying
 *   senderSecretKey  — null if Freighter
 *   useFreighter     — bool
 *   recipientPublicKey
 *   amountXLM        — string, e.g. "4.50"
 *   memo             — up to 28 chars (bill title + payer name)
 */
export async function settlePayment({
  senderPublicKey,
  senderSecretKey,
  useFreighter,
  recipientPublicKey,
  amountXLM,
  memo,
}) {
  const account = await server.loadAccount(senderPublicKey);
  const memoText = memo.slice(0, 28);

  const txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: recipientPublicKey,
      asset: StellarSdk.Asset.native(),
      amount: parseFloat(amountXLM).toFixed(7),
    }))
    .addMemo(StellarSdk.Memo.text(memoText))
    .setTimeout(180)
    .build();

  let signed;
  if (useFreighter) {
    const xdr = txBuilder.toXDR();
    const signedXdr = await signTransaction(xdr, { network: NETWORK, networkPassphrase: NETWORK_PASSPHRASE });
    signed = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  } else {
    const kp = StellarSdk.Keypair.fromSecret(senderSecretKey);
    txBuilder.sign(kp);
    signed = txBuilder;
  }

  const result = await server.submitTransaction(signed);
  return {
    txHash:      result.hash,
    ledger:      result.ledger,
    memo:        memoText,
    amountXLM,
    timestamp:   new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
  };
}

// ── Fetch settlement history for an account ────────────────────────────────
export async function fetchSettlements(publicKey, limit = 30) {
  try {
    const txs = await server.transactions()
      .forAccount(publicKey).limit(limit).order("desc").call();
    return txs.records
      .filter(tx => tx.memo_type === "text" && tx.memo?.includes("SPLIT"))
      .map(tx => ({
        txHash:    tx.hash,
        memo:      tx.memo,
        ledger:    tx.ledger_attr,
        createdAt: new Date(tx.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${tx.hash}`,
      }));
  } catch { return []; }
}
