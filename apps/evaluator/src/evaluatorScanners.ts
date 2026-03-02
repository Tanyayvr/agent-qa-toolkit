import { createActionRiskScanner } from "./scanners/actionRiskScanner";
import { createEntropyScanner } from "./scanners/entropyScanner";
import { createExfiltrationScanner } from "./scanners/exfiltrationScanner";
import { createOutputQualityScanner } from "./scanners/outputQualityScanner";
import { createPiiScanner } from "./scanners/piiScanner";
import { createPromptInjectionScanner } from "./scanners/promptInjectionScanner";
import type { SecurityScanner } from "./securityScanner";

export function buildSecurityScanners(enableEntropyScanner: boolean): SecurityScanner[] {
  const scanners: SecurityScanner[] = [];
  if (enableEntropyScanner) {
    scanners.push(createEntropyScanner());
  }
  scanners.push(createPiiScanner());
  scanners.push(createPromptInjectionScanner());
  scanners.push(createActionRiskScanner());
  scanners.push(createExfiltrationScanner());
  scanners.push(createOutputQualityScanner());
  return scanners;
}
