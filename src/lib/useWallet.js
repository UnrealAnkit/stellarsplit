import { useState, useEffect, useCallback } from "react";
import { checkFreighter, connectFreighter, getBalance } from "../lib/stellar";

export function useWallet() {
  const [state, setState] = useState({ installed:false, connected:false, publicKey:null, balance:null, loading:false, error:null });

  useEffect(() => {
    checkFreighter().then(installed => setState(s => ({ ...s, installed })));
  }, []);

  useEffect(() => {
    if (state.publicKey) getBalance(state.publicKey).then(balance => setState(s => ({ ...s, balance })));
  }, [state.publicKey]);

  const connect = useCallback(async () => {
    setState(s => ({ ...s, loading:true, error:null }));
    try {
      const publicKey = await connectFreighter();
      const balance   = await getBalance(publicKey);
      setState(s => ({ ...s, connected:true, publicKey, balance, loading:false }));
    } catch(e) {
      setState(s => ({ ...s, loading:false, error:e.message }));
    }
  }, []);

  const disconnect = useCallback(() => setState(s => ({ ...s, connected:false, publicKey:null, balance:null })), []);
  const refreshBalance = useCallback(async () => {
    if (!state.publicKey) return;
    const balance = await getBalance(state.publicKey);
    setState(s => ({ ...s, balance }));
  }, [state.publicKey]);

  return { ...state, connect, disconnect, refreshBalance };
}
