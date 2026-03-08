/**
 * useSplit.js
 * All bill-splitting logic: create bills, add members, calculate shares, track settlements
 */

import { useState, useCallback } from "react";

export function useSplit() {
  const [bills, setBills]       = useState([]);
  const [settlements, setSettlements] = useState([]); // on-chain settlements

  // ── Create a new bill ────────────────────────────────────────────────────
  const createBill = useCallback(({ title, totalXLM, paidBy, members }) => {
    const share = (parseFloat(totalXLM) / members.length).toFixed(7);
    const id    = `BILL-${Date.now()}`;
    const bill  = {
      id,
      title,
      totalXLM: parseFloat(totalXLM).toFixed(4),
      paidBy,   // { name, publicKey }
      members,  // [{ name, publicKey }]
      share,    // each person owes this amount
      createdAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      // track who has settled
      settled: {},  // { publicKey: txHash }
    };
    setBills(p => [bill, ...p]);
    return bill;
  }, []);

  // ── Mark a member as settled (after on-chain TX) ────────────────────────
  const markSettled = useCallback((billId, memberPublicKey, txHash) => {
    setBills(p => p.map(b =>
      b.id === billId
        ? { ...b, settled: { ...b.settled, [memberPublicKey]: txHash } }
        : b
    ));
    setSettlements(p => [{ billId, memberPublicKey, txHash, timestamp: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) }, ...p]);
  }, []);

  // ── Delete a bill ────────────────────────────────────────────────────────
  const deleteBill = useCallback((billId) => {
    setBills(p => p.filter(b => b.id !== billId));
  }, []);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    totalBills:       bills.length,
    totalXLM:         bills.reduce((s, b) => s + parseFloat(b.totalXLM), 0).toFixed(4),
    pendingPayments:  bills.reduce((s, b) => s + (b.members.length - Object.keys(b.settled).length - 1), 0), // -1 for payer
    settledTx:        settlements.length,
  };

  return { bills, settlements, stats, createBill, markSettled, deleteBill };
}
