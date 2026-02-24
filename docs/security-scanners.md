# Security Scanners

This toolkit ships a layered scanner set that covers all registered signal kinds.
Scanners are **stateless** and run per-case on the agent response.

## Scanner list

### 1) Entropy scanner (optional)
- **Kinds**: `token_exfil_indicator`
- **Signals**: key patterns + high-entropy token-like strings
- **Enable**: `--entropyScanner`

### 2) PII/Secret scanner
- **Kinds**: `pii_in_output`, `secret_in_output`
- **Inputs**: `final_output`, `tool_result.payload_summary`
- **Detections**: email, phone, SSN, credit card (Luhn), passport, INN, secret-like tokens

### 3) Prompt injection scanner
- **Kinds**: `prompt_injection_marker`, `context_poisoning`
- **Inputs**: `final_output`, tool payloads
- **Detections**: common injection markers (`ignore previous`, `SYSTEM:`, `[INST]`, etc.)

### 4) Action risk scanner
- **Kinds**: `high_risk_action`, `permission_change`, `excessive_permissions`, `unsafe_code_execution`
- **Inputs**: `tool_call` events
- **Detections**: risky tool patterns (`delete_*`, `grant_*`, `exec`, `sudo_*`, etc.)

### 5) Exfiltration scanner
- **Kinds**: `untrusted_url_input`, `unexpected_outbound`, `data_exfiltration`
- **Inputs**: `tool_call` args
- **Detections**: outbound URLs, non-allowlisted domains, sensitive query params

### 6) Output quality scanner
- **Kinds**: `hallucination_in_output`, `model_refusal`, `bias_detected`, `compliance_violation`
- **Inputs**: `final_output`, tool results
- **Detections**: refusal patterns, hallucination heuristics, placeholder bias/compliance rules

## Notes
- `runner_failure_detected` is emitted inline by evaluator when `runner_failure` is present.
- `unknown` is reserved for external scanners / plugins.
- All scanners cap results (`maxSignals`) and mask sensitive samples.
