# Nym Mixnet Research - Integration for Kohaku Wallet

**Date:** October 17, 2025, 00:03 AM
**Deadline:** 3:30 AM (~3.5 hours remaining)

---

## Executive Summary

**Do you need to run your own network requester?**
- **NO** - You can use public exit gateways (network requesters)
- LunarDAO operates 15 public gateways
- Other public gateways available via Harbour Master

**Setup is straightforward:**
```bash
./nym-socks5-client init --id kohaku --provider gateway1.lunardao.net
./nym-socks5-client run --id kohaku
# Now localhost:1080 routes through Nym mixnet
```

---

## 1. Nym Architecture Evolution

### Original Architecture (Pre-2023)

**Separate Components:**
- Mix nodes (3 layers)
- Entry gateways
- Exit gateways
- **Network Requesters** (separate binary, separate VPS)

**Problem:** Complex infrastructure, required multiple services

### Project Smoosh (2023-2024)

**Goal:** "Smoosh" all components into single `nym-node` binary

**Phase 1 (Completed):**
- Combined Gateway + Network Requester
- Network requester now embedded in Exit Gateway

**Phase 2 (Current):**
- Single `nym-node` binary can run as:
  - Mix node
  - Entry gateway
  - Exit gateway (with embedded network requester + IP router)

**Result:**
> "The nym-network-requester is now part of a nym-node running in Exit Gateway mode."

### Current State (2025)

**Architecture:**
```
User Application (e.g., Kohaku wallet)
    ↓
nym-socks5-client (localhost:1080)
    ↓
Entry Gateway
    ↓
3 Mix Layers (80 nodes each = 512,000 possible paths)
    ↓
Exit Gateway (embedded network requester + IP router)
    ↓
Internet (RPC provider, etc.)
```

**Key Change:** Exit gateway now has:
- Embedded network requester
- IP packet router
- Direct internet routing

---

## 2. Provider Address System

### What is a Provider?

The **provider** is the **Exit Gateway** that will:
1. Receive your encrypted packets from the mixnet
2. Decrypt the final layer
3. Route your request to the internet
4. Return the response back through the mixnet

### Provider Address Format

**Two types of addresses:**

**1. Domain-based (LunarDAO):**
```bash
gateway1.lunardao.net
gateway2.lunardao.net
# ... up to gateway15.lunardao.net
```

**2. Nym identity format (raw):**
```
Entztfv6Uaz2hpYHQJ6JKoaCTpDL5dja18SuQWVJAmmx.Cvhn9rBJw5Ay9wgHcbgCnVg89MPSV5s2muPV2YF1BXYu@Fo4f4SQLdoyoGkFae5TpVhRV...
```
- Format: `[NODE_ID].[ENCRYPTION_KEY]@[GATEWAY_ADDRESS]`
- Very long base58-encoded string

### Finding Provider Addresses

**Option 1: Use LunarDAO Gateways (Recommended)**
- https://wiki.lunardao.net/gateways.html
- 15 public gateways: `gateway1.lunardao.net` through `gateway15.lunardao.net`
- Tested and documented
- Support non-standard ports

**Option 2: Nym Harbour Master**
- https://harbourmaster.nymtech.net/
- Real-time dashboard of all network nodes
- Shows exit gateway status, performance, uptime
- Lists provider addresses
- (Dynamic React app - need to visit directly)

**Option 3: Run Your Own**
- Requires VPS
- Run `nym-node` in exit gateway mode
- More control, but unnecessary for testing/demo

---

## 3. Practical Setup for Kohaku

### Step 1: Download nym-socks5-client

```bash
# Get latest release from:
# https://github.com/nymtech/nym/releases

# Make executable
chmod +x nym-socks5-client
```

### Step 2: Initialize with Provider

```bash
# Using LunarDAO gateway
./nym-socks5-client init --id kohaku-wallet --provider gateway1.lunardao.net

# Or use a different provider from Harbour Master
# ./nym-socks5-client init --id kohaku-wallet --provider [NYM_PROVIDER_ADDRESS]
```

**What this does:**
- Creates config in `~/.nym/socks5-clients/kohaku-wallet/`
- Registers with entry gateway
- Establishes route to exit gateway (provider)
- Generates Sphinx routing keys

### Step 3: Run the Client

```bash
./nym-socks5-client run --id kohaku-wallet
```

**Output:**
```
[INFO] Starting Nym Socks5 Client
[INFO] Listening on 127.0.0.1:1080
[INFO] Connected to mixnet
[INFO] Ready to route traffic through provider: gateway1.lunardao.net
```

### Step 4: Configure Kohaku to Use It

**In PrivacyProxyService.ts:**

```typescript
// Nym configuration (same as Tor - just different port)
const config = {
  mode: 'nym',
  nymSocksHost: '127.0.0.1',
  nymSocksPort: 1080  // nym-socks5-client default
}
```

**Already implemented!** The `handleProxyRequest()` function in `PrivacyProxyService.ts` already supports Nym:

```typescript
if (this.config.mode === 'nym') {
  return {
    type: 'socks',
    host: this.config.nymSocksHost,  // 127.0.0.1
    port: this.config.nymSocksPort   // 1080
  }
}
```

---

## 4. Nym vs Tor: Architectural Differences

### Tor (Onion Routing)

**Properties:**
- 3 hops: Guard → Middle → Exit
- Timing preserved (low latency)
- ~7000 relays, ~1000 exit nodes
- Circuit reuse for session
- Vulnerable to timing attacks

**Strengths:**
- Fast (200-500ms overhead)
- Mature, well-tested
- Large network

**Weaknesses:**
- Timing correlation possible
- End-to-end timing attacks
- Website fingerprinting
- Limited anonymity set per circuit

### Nym (Mixnet)

**Properties:**
- 3 mix layers: Layer 1 → Layer 2 → Layer 3
- Timing destroyed (high latency variance)
- ~240 mix nodes (80 per layer)
- Poisson mixing delay
- Cover traffic

**Strengths:**
- Resistant to timing attacks
- Destroys correlation (Poisson delays)
- 512,000 possible paths (80³)
- Sphinx packet format (bitwise unlinkability)
- Forward secrecy

**Weaknesses:**
- Slower (1-5 second overhead)
- Smaller network (but growing)
- Higher resource usage (cover traffic)

### Key Technical Difference: Poisson Mixing

**Tor:** Packet exits immediately (fixed ~300ms per hop)
```
t_entry + ~900ms ≈ t_exit (predictable)
```

**Nym:** Packet delayed by exponential distribution
```
delay = random.expovariate(λ=0.5)  # Mean 2s, high variance
P(T > s+t | T > s) = P(T > t)  # Memoryless
```

**Result:** Knowing when packet entered tells you NOTHING about when it exits!

---

## 5. Evolution Insights from Zcash Community

### From Zcash Forum Discussions

**Integration Challenges Identified:**

1. **TCP Abstraction Level**
   - Question: Should integrate at TCP layer or lower?
   - Nym SDK originally required localhost port (TcpProxy)
   - Added overhead: byte shuffling, codec layers

2. **Planned SDK Improvements**
   - Direct byte piping (no localhost port)
   - Remove unnecessary bytecodec shuffling
   - Better multiplexing support

3. **Documentation Gaps**
   - Needed: Flow diagrams of proxy architecture
   - How framing works (Sphinx packets)
   - Service provider setup

**Current Status:**
- Nym integration still evolving
- SDK improvements ongoing
- Good for research/demo, not production yet

### Policy Evolution: Allow List → Deny List

**Old Model (2022):**
- Network requesters had **allow lists**
- Could only connect to: Telegram, Matrix, Keybase, Electrum
- Very restrictive

**Current Model (2024+):**
- Exit gateways use **deny lists**
- Can connect to anything except banned domains
- Much more flexible

**For Kohaku:**
- RPC endpoints (Infura, Alchemy, etc.) should work fine
- No special allow-list needed

---

## 6. Practical Considerations for Demo

### Latency Expectations

**Baseline (Direct):**
- RPC call: 50-200ms

**With Tor:**
- RPC call: 250-700ms (add ~200-500ms)

**With Nym:**
- RPC call: 1000-5000ms (add ~1-5 seconds)

**Why?**
- 3 mix layers × delay per layer
- Poisson mixing (intentional delay)
- Cover traffic overhead
- Sphinx packet processing

### When to Use Which?

**Tor - Good for:**
- Balance checks (frequent, latency-sensitive)
- Read operations
- General browsing
- Transaction status polling

**Nym - Good for:**
- High-value transactions (MEV protection)
- Privacy-critical operations
- State surveillance resistance
- When timing correlation is a threat

**Hybrid Approach (Recommended):**
```typescript
function selectPrivacyMode(requestType: string): PrivacyMode {
  if (requestType === 'sendTransaction') {
    return 'nym'  // Max privacy for transactions
  }
  if (requestType === 'getBalance') {
    return 'tor'  // Fast, good enough
  }
  return 'direct'  // Price feeds, public data
}
```

### Testing Plan (3 hours remaining)

**Phase 1: Setup (30 min)**
1. Download nym-socks5-client
2. Init with LunarDAO gateway
3. Test connectivity: `curl --socks5 localhost:1080 https://check.torproject.org/api/ip`

**Phase 2: Integration (1 hour)**
1. Already done! PrivacyProxyService.ts supports Nym
2. Add UI toggle: Direct / Tor / Nym
3. Wire up mode switching

**Phase 3: Benchmarking (1 hour)**
1. Measure latency distributions
2. Test RPC calls (eth_getBalance, eth_sendRawTransaction)
3. Document timing differences

**Phase 4: Documentation (30 min)**
1. Screenshot circuit details (Tor)
2. Record latency measurements
3. Write up comparison

---

## 7. Provider Selection Strategy

### For Demo (Recommended)

**Use LunarDAO Gateway 1:**
```bash
./nym-socks5-client init --id kohaku-demo --provider gateway1.lunardao.net
```

**Why?**
- Publicly documented
- Known to work
- Support non-standard ports
- Community-run (DarkFi/LunarDAO)

### For Production

**Considerations:**
1. **Trust Model**
   - Provider sees destination (not source)
   - Can log/block requests
   - Choose trustworthy operators

2. **Geolocation**
   - Exit gateway location = apparent source country
   - Consider legal jurisdiction

3. **Performance**
   - Check Harbour Master for uptime/latency
   - Test multiple providers

4. **Redundancy**
   - Support multiple providers
   - Automatic failover

**Future:** Run own exit gateway for full control

---

## 8. Key Nym Concepts

### Sphinx Packets

**Properties:**
- Bitwise unlinkability (different bits at each hop)
- Forward secrecy (past packets safe if key compromised)
- Integrity protection (detect tampered packets)

**Structure:**
```rust
struct SphinxPacket {
    header: SphinxHeader {
        alpha: GroupElement,    // Shared secret
        beta: [u8],             // Routing info (encrypted)
        gamma: [u8; 16],        // MAC
    },
    payload: [u8; PAYLOAD_SIZE],
}
```

**Each hop:**
1. Applies blinding factor: `α₂ = b · α₁`
2. Re-encrypts routing: `β₂ = reencrypt(β₁)`
3. Recomputes MAC: `γ₂ = HMAC(s, α₂||β₂)`

**Result:** P₁ and P₂ share NO common bits!

### Cover Traffic

**Continuous dummy packets:**
- Sent even when idle
- Rate: ~0.2 packets/second
- Cost: ~35 GB/day bandwidth
- Benefit: Can't tell user is active vs idle

**For Kohaku:**
- nym-socks5-client handles this automatically
- User doesn't need to manage cover traffic
- Happens in background

### SURBs (Single-Use Reply Blocks)

**For RPC request/response:**
```
User → [Mixnet] → RPC Provider
     ← [SURB path] ←
```

**Provider can respond without knowing user location!**

---

## 9. Quick Start Commands

### Test Nym Connectivity

```bash
# 1. Init client
./nym-socks5-client init --id test --provider gateway1.lunardao.net

# 2. Run client (in background)
./nym-socks5-client run --id test &

# 3. Wait for "Ready" message (~30 seconds for mixnet connection)

# 4. Test SOCKS5 proxy
curl --socks5 localhost:1080 https://icanhazip.com

# 5. Should return exit gateway IP (not your real IP)
```

### Test with RPC

```bash
# Ethereum RPC call through Nym
curl --socks5 localhost:1080 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://mainnet.infura.io/v3/YOUR_KEY
```

---

## 10. Open Questions & Future Work

### Research Questions

1. **Circuit Isolation**
   - Can nym-socks5-client create isolated circuits?
   - Or single circuit for all traffic?
   - Tor has `NEWNYM` signal - Nym equivalent?

2. **Exit Gateway Policies**
   - Do LunarDAO gateways allow all RPC endpoints?
   - Any port restrictions?
   - Rate limiting?

3. **Anonymity Set**
   - Current mix node distribution?
   - Active users on network?
   - Effective anonymity set size?

4. **Incentive Mechanism**
   - How are mix nodes/gateways compensated?
   - NYM token economics?
   - Sustainability model?

### Integration Improvements

1. **Auto Provider Selection**
   - Query Harbour Master API
   - Select fastest/most reliable provider
   - Automatic failover

2. **Performance Optimization**
   - Persistent nym-socks5-client connection
   - Connection pooling
   - Request batching?

3. **User Experience**
   - Show Nym circuit details (like Tor status badge)
   - Latency indicator
   - "Waiting for mixnet..." loading state

4. **Hybrid Routing**
   - Request sensitivity classification
   - Automatic Tor vs Nym selection
   - Fallback to direct on failure

---

## 11. References

### Official Nym Resources

- **Docs:** https://nym.com/docs/developers/clients/socks5
- **GitHub:** https://github.com/nymtech/nym
- **Harbour Master:** https://harbourmaster.nymtech.net/
- **Blog - Network Requesters:** https://nym.com/blog/tech-deepdive-network-requesters

### Community Resources

- **LunarDAO Gateways:** https://wiki.lunardao.net/gateways.html
- **DarkFi Nym Guide:** https://darkrenaissance.github.io/darkfi/misc/nodes/nym-guide.html
- **Zcash Forum (Nym integration):**
  - https://forum.zcashcommunity.com/t/revised-nym-for-zcash-network-level-privacy/46688
  - https://forum.zcashcommunity.com/t/the-nym-mixnet-for-network-privacy-for-zcash/46324

### Academic

- **Loopix:** Anonymity system with Poisson mixing
- **Sphinx:** Compact and provably secure mix format
- **Nym Whitepaper:** https://nymtech.net/nym-whitepaper.pdf

---

## 12. Immediate Next Steps (Priority Order)

### 1. Download & Test nym-socks5-client (15 min)

```bash
cd /home/bhaskar/dev/kohaku-extension
wget https://github.com/nymtech/nym/releases/download/nym-binaries-v2024.12-farinelli/nym-socks5-client
chmod +x nym-socks5-client
./nym-socks5-client init --id kohaku --provider gateway1.lunardao.net
./nym-socks5-client run --id kohaku &
```

### 2. Test Connectivity (5 min)

```bash
# Should show exit gateway IP
curl --socks5 localhost:1080 https://icanhazip.com

# Test with real RPC (use your Infura/Alchemy key)
curl --socks5 localhost:1080 -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://mainnet.infura.io/v3/YOUR_KEY
```

### 3. Add Nym UI Toggle (30 min)

**PrivacySettingsScreen.tsx:**
- Already has Tor toggle
- Add third option: "Nym Mixnet"
- Show latency warning: "Slower (~1-5s), Maximum Privacy"

### 4. Measure Latency (30 min)

**Create benchmark script:**
```typescript
// benchmark-privacy.ts
async function benchmarkMode(mode: 'direct' | 'tor' | 'nym') {
  const times: number[] = []

  for (let i = 0; i < 10; i++) {
    const start = Date.now()
    await makeRPCCall(mode)
    const elapsed = Date.now() - start
    times.push(elapsed)
  }

  return {
    p50: median(times),
    p95: percentile(times, 0.95),
    p99: percentile(times, 0.99)
  }
}
```

### 5. Document Findings (30 min)

**Create comparison table:**
```
| Metric           | Direct | Tor      | Nym       |
|------------------|--------|----------|-----------|
| Latency (P50)    | 100ms  | 400ms    | 2000ms    |
| Latency (P95)    | 200ms  | 700ms    | 4500ms    |
| IP Hidden        | No     | Yes      | Yes       |
| Timing Attack    | N/A    | Vulnerable| Resistant |
| Use Case         | Public | General  | Critical  |
```

---

**TIME REMAINING: ~3 hours**

**PRIORITY: Test nym-socks5-client connectivity first (15 min), then decide if full integration is feasible.**

If nym-socks5-client works immediately → integrate fully
If setup issues → document architecture, show Tor working, explain Nym benefits theoretically

**The code is already there!** PrivacyProxyService.ts supports Nym. Just need to:
1. Run nym-socks5-client
2. Toggle mode to 'nym' in UI
3. Measure latency differences
