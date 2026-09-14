"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CONTRACT_ADDRESS,
  assertSuccessfulReturn,
  connectWallet,
  getReadClient,
  getWalletClient,
  waitForDecision,
  waitForReceipt,
} from "../lib/genlayer";

type Milestone = {
  milestone_id: string; creator: string; contributor: string; title: string;
  requirements: string; evidence_url: string; reward: string; deadline: string;
  status: string; decision: string; summary: string; evidence: string; submitted_at: string;
};

function shorten(value: string) {
  return value ? `${value.slice(0, 8)}...${value.slice(-6)}` : "";
}

export default function Home() {
  const [account,setAccount]=useState("");
  const [milestoneId,setMilestoneId]=useState("");
  const [title,setTitle]=useState("");
  const [requirements,setRequirements]=useState("Repository contains the requested implementation\nREADME documents how to use the implementation");
  const [evidenceUrl,setEvidenceUrl]=useState("https://github.com/Mansoordk/flightguard-genlayer");
  const [reward,setReward]=useState("100 USDC metadata");
  const [deadline,setDeadline]=useState("");
  const [lookupId,setLookupId]=useState("");
  const [milestone,setMilestone]=useState<Milestone|null>(null);
  const [tx,setTx]=useState<{hash:string;status:string;message:string}|null>(null);
  const [error,setError]=useState("");

  useEffect(()=> {
    const date=new Date(Date.now()+24*60*60*1000);
    setDeadline(new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16));
  },[]);

  async function handleConnect(){
    try { setError(""); const r=await connectWallet(); setAccount(r.address); }
    catch(e){ setError(e instanceof Error?e.message:String(e)); }
  }

  async function sendTransaction(functionName:string,args:unknown[],message:string){
    if(!account) throw new Error("Connect a Studionet wallet first.");
    const client=getWalletClient(account as `0x${string}`);
    const hash=await client.writeContract({
      address:CONTRACT_ADDRESS as `0x${string}`, functionName, args,
    });
    setTx({hash:String(hash),status:"SUBMITTED",message:"Transaction submitted. Waiting for GenLayer consensus..."});
    const readClient=getReadClient();
    await waitForDecision(readClient,hash as `0x${string}`,(status)=>setTx({hash:String(hash),status,message:`GenLayer lifecycle status: ${status}`}));
    const receipt=await waitForReceipt(readClient,hash as `0x${string}`);
    assertSuccessfulReturn(receipt);
    setTx({hash:String(hash),status:"FINALIZED",message});
    return receipt;
  }

  async function handleCreate(e:FormEvent){
    e.preventDefault();
    try {
      setError("");
      const receipt=await sendTransaction("create_milestone",[
        account,title,requirements,evidenceUrl,reward,new Date(deadline).toISOString()
      ],"Milestone created and finalized.");
      if(typeof receipt.return_value==="string"){
        setMilestoneId(receipt.return_value); setLookupId(receipt.return_value);
      }
    } catch(e){setError(e instanceof Error?e.message:String(e));}
  }

  async function handleSubmit(e:FormEvent){
    e.preventDefault();
    try {setError(""); await sendTransaction("submit_milestone",[milestoneId],"Milestone submitted for verification.");}
    catch(e){setError(e instanceof Error?e.message:String(e));}
  }

  async function handleEvaluate(e:FormEvent){
    e.preventDefault();
    try {setError(""); await sendTransaction("evaluate_milestone",[milestoneId],"Evaluation finalized.");}
    catch(e){setError(e instanceof Error?e.message:String(e));}
  }

  async function handleLookup(e:FormEvent){
    e.preventDefault();
    try {
      setError("");
      const result=await getReadClient().readContract({
        address:CONTRACT_ADDRESS as `0x${string}`,
        functionName:"get_milestone",args:[lookupId],
      });
      setMilestone(result as Milestone);
    } catch(e){setError(e instanceof Error?e.message:String(e));}
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <div className="eyebrow">GENLAYER STUDIONET · CHAIN 61999</div>
          <h1>DeliverCheck</h1>
          <p className="lead">A trust-minimized milestone verifier that lets GenLayer validators inspect GitHub evidence and independently corroborate the result.</p>
        </div>
        <div className="wallet-card">
          <span>Wallet</span>
          <strong>{account?shorten(account):"Not connected"}</strong>
          <button onClick={handleConnect}>{account?"Reconnect Studionet":"Connect Studionet Wallet"}</button>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}

      <section className="flow">
        <div><b>1</b><span>Create</span></div><div><b>2</b><span>Submit</span></div>
        <div><b>3</b><span>Evaluate</span></div><div><b>4</b><span>Corroborate</span></div>
      </section>

      <div className="grid">
        <section className="panel">
          <div className="panel-heading"><span className="number">01</span><div><h2>Create milestone</h2><p>Define what must be delivered and where the evidence lives.</p></div></div>
          <form onSubmit={handleCreate}>
            <label>Contributor wallet<input value={account} onChange={e=>setAccount(e.target.value)} placeholder="0x..." required /></label>
            <label>Milestone title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ship the API integration" required /></label>
            <label>Acceptance criteria<textarea value={requirements} onChange={e=>setRequirements(e.target.value)} rows={5} required /><small>Use one criterion per line.</small></label>
            <label>GitHub evidence URL<input value={evidenceUrl} onChange={e=>setEvidenceUrl(e.target.value)} placeholder="https://github.com/..." required /></label>
            <div className="two">
              <label>Reward metadata<input value={reward} onChange={e=>setReward(e.target.value)} /></label>
              <label>Deadline<input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)} required /></label>
            </div>
            <button className="primary" type="submit">Create milestone</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading"><span className="number">02</span><div><h2>Submit & evaluate</h2><p>Only the assigned contributor can submit the milestone.</p></div></div>
          <label>Milestone ID<input value={milestoneId} onChange={e=>setMilestoneId(e.target.value)} placeholder="0" /></label>
          <div className="button-row"><button onClick={handleSubmit} className="secondary">Submit milestone</button><button onClick={handleEvaluate} className="primary">Evaluate evidence</button></div>
          <div className="info-box"><strong>Trust model</strong><p>Evidence is restricted to GitHub URLs. The evaluation reads the evidence nondeterministically, returns structured JSON, and then independently reruns the verification. A mismatch becomes UNDETERMINED instead of silently accepting one result.</p></div>
          <div className="status-list"><span>OPEN</span><span>SUBMITTED</span><span>APPROVED</span><span>REJECTED</span><span>UNDETERMINED</span><span>EXPIRED</span></div>
        </section>
      </div>

      <section className="panel lookup">
        <div className="panel-heading"><span className="number">03</span><div><h2>Read on-chain state</h2><p>Query the Intelligent Contract directly.</p></div></div>
        <form onSubmit={handleLookup} className="lookup-form"><input value={lookupId} onChange={e=>setLookupId(e.target.value)} placeholder="Milestone ID" required /><button className="secondary" type="submit">Read milestone</button></form>
        {milestone && <div className="result">
          <div className="result-top"><div><span className="muted">Milestone #{milestone.milestone_id}</span><h3>{milestone.title}</h3></div><span className={`badge ${milestone.status.toLowerCase()}`}>{milestone.status}</span></div>
          <div className="facts">
            <div><span>Decision</span><strong>{milestone.decision}</strong></div>
            <div><span>Deadline</span><strong>{milestone.deadline}</strong></div>
            <div><span>Contributor</span><strong>{shorten(milestone.contributor)}</strong></div>
            <div><span>Reward</span><strong>{milestone.reward||"—"}</strong></div>
          </div>
          {milestone.summary && <div className="evidence"><h4>Validator summary</h4><p>{milestone.summary}</p></div>}
          {milestone.evidence && <div className="evidence"><h4>Evidence</h4><p>{milestone.evidence}</p></div>}
        </div>}
      </section>

      {tx && <section className="panel transaction"><div><span className="muted">Transaction lifecycle</span><h2>{tx.status}</h2><p>{tx.message}</p></div><code>{tx.hash}</code></section>}
      <footer>DeliverCheck · GenLayer Studionet · Chain 61999 · Reward is metadata only; this version does not transfer funds.</footer>
    </main>
  );
}
