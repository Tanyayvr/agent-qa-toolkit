# Prompt Injection Threat Model (Internal)

## Scope
Tool‑using LLM agents with retrieval and external tool calls.

## Assets
- Sensitive data (PII, secrets, credentials)
- Tool privileges (create/delete, modify systems)
- Compliance‑grade evidence packs

## Attack Surfaces
1. **User input** (direct injection)
2. **Retrieved content** (indirect injection)
3. **Tool outputs** (poisoned tool responses)
4. **System prompts** (exfiltration attempts)
5. **Output channel** (data leakage)

## Threats
1. **Instruction override** (user/retrieved data hijacks model)
2. **Tool abuse** (unauthorized or dangerous actions)
3. **Data exfiltration** (secret leakage)
4. **Policy tampering** (prompt forces model to ignore rules)
5. **Context poisoning** (unsafe instructions via RAG)

## Mitigation Layers
Layer 1: Regex / heuristics  
Layer 2: Entropy + key pattern detection  
Layer 3: Local ML scanners (optional)  
Layer 4: Human approval on high‑risk actions  

## Residual Risks
No mitigation yields complete elimination; controls reduce blast radius and increase detection probability.
