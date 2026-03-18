(function () {
  const storagePrefix = "eu-ai-builder-state-v1";

  function downloadFile(filename, type, body) {
    const blob = new Blob([body], { type: type });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  function badgeClass(level) {
    if (level === "HIGH RISK") return "high";
    if (level === "LIMITED RISK") return "limited";
    return "minimal";
  }

  function buildClassification(state, copy) {
    const highRiskTypes = new Set(["hr", "credit", "healthcare", "education"]);
    const limitedTypes = new Set(["customer-service"]);
    const inEuScope =
      state.deployedInEu === true ||
      state.usedByEuResidents === true ||
      (Array.isArray(state.memberStates) && state.memberStates.length > 0);

    let level = copy.classifications.minimal;
    let rationale = copy.rationale.minimal;
    let articles = ["Article 12", "Article 14"];

    if (highRiskTypes.has(state.systemType) && inEuScope) {
      level = copy.classifications.high;
      rationale = copy.rationale.high;
      articles = ["Articles 9, 10, 11, 12, 13, 14, 15", "Annex IV"];
    } else if (limitedTypes.has(state.systemType) && inEuScope) {
      level = copy.classifications.limited;
      rationale = copy.rationale.limited;
      articles = ["Articles 12, 14", "Transparency obligations"];
    } else if (state.autonomousDecisions === true && inEuScope) {
      level = copy.classifications.high;
      rationale = copy.rationale.autonomous;
      articles = ["Articles 9, 10, 11, 12, 13, 14, 15", "Annex IV"];
    }

    return { level: level, rationale: rationale, articles: articles };
  }

  function makePackageHtml(state, summary, copy) {
    const sections = [
      {
        title: copy.packageSections.profile,
        body: `
          <p><strong>${copy.fields.systemType}</strong>: ${state.systemTypeLabel || "-"}</p>
          <p><strong>${copy.fields.memberStates}</strong>: ${(state.memberStates || []).join(", ") || "-"}</p>
          <p><strong>${copy.fields.usedByEuResidents}</strong>: ${state.usedByEuResidents ? copy.yes : copy.no}</p>
          <p><strong>${copy.fields.autonomousDecisions}</strong>: ${state.autonomousDecisions ? copy.yes : copy.no}</p>
        `,
      },
      {
        title: copy.packageSections.risk,
        body: `
          <p><strong>${copy.stepTitles.step2}</strong>: ${summary.level}</p>
          <p>${summary.rationale}</p>
          <p><strong>${copy.requiredArticles}</strong>: ${summary.articles.join(", ")}</p>
        `,
      },
      {
        title: copy.packageSections.article9,
        body: `
          <p><strong>${copy.fields.risks}</strong></p>
          <p>${(state.risks || "").replace(/\n/g, "<br>") || copy.placeholderText}</p>
          <p><strong>${copy.fields.mitigations}</strong></p>
          <p>${(state.mitigations || "").replace(/\n/g, "<br>") || copy.placeholderText}</p>
        `,
      },
      {
        title: copy.packageSections.oversight,
        body: `
          <p><strong>${copy.fields.logging}</strong></p>
          <p>${(state.logging || "").replace(/\n/g, "<br>") || copy.placeholderText}</p>
          <p><strong>${copy.fields.oversight}</strong></p>
          <p>${(state.oversight || "").replace(/\n/g, "<br>") || copy.placeholderText}</p>
        `,
      },
      {
        title: copy.packageSections.evidence,
        body: `
          <p>${copy.evidencePlaceholder}</p>
          <ul>
            <li><a href="${copy.links.pricing}">${copy.getEvidence}</a></li>
            <li><a href="${copy.links.proof}">${copy.openProof}</a></li>
          </ul>
        `,
      },
    ];

    return `<!doctype html>
<html lang="${copy.locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${copy.packageTitle}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 40px auto; max-width: 860px; color: #0f172a; line-height: 1.6; }
    h1, h2 { font-family: "Space Grotesk", Inter, sans-serif; letter-spacing: -0.03em; }
    section { border: 1px solid #dbe5f1; border-radius: 16px; padding: 20px; margin: 0 0 20px; }
    .notice { background: #eff6ff; border-color: #bfdbfe; }
    a { color: #1b4fd8; }
  </style>
</head>
<body>
  <h1>${copy.packageTitle}</h1>
  <section class="notice">
    <p>${copy.packageDisclaimer}</p>
  </section>
  ${sections
    .map(
      (section) => `
    <section>
      <h2>${section.title}</h2>
      ${section.body}
    </section>`
    )
    .join("")}
</body>
</html>`;
  }

  function initBuilder(root) {
    const configNode = document.getElementById("builder-config");
    if (!configNode) return;
    const config = JSON.parse(configNode.textContent || "{}");
    const copy = config.copy || {};
    const storageKey = `${storagePrefix}:${copy.locale || "en"}`;
    const persisted = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    const state = Object.assign(
      {
        step: 1,
        systemType: "",
        systemTypeLabel: "",
        memberStates: [],
        usedByEuResidents: false,
        deployedInEu: false,
        autonomousDecisions: false,
        risks: "",
        mitigations: "",
        logging: "",
        oversight: "",
      },
      persisted
    );

    const progressBar = root.querySelector(".builder-progress-bar");
    const stepCounter = root.querySelector("[data-builder-step-counter]");
    const stepTitle = root.querySelector("[data-builder-step-title]");
    const stepBody = root.querySelector("[data-builder-step-body]");
    const summaryBox = root.querySelector("[data-builder-summary]");
    const prevButton = root.querySelector("[data-builder-prev]");
    const nextButton = root.querySelector("[data-builder-next]");
    const downloadJsonButton = root.querySelector("[data-builder-download-json]");
    const openPackageButton = root.querySelector("[data-builder-open-package]");

    function save() {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    }

    function setCheckboxValues(name) {
      const checked = Array.from(stepBody.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
      state.memberStates = checked;
      state.deployedInEu = checked.length > 0;
    }

    function updateSummary() {
      const summary = buildClassification(state, copy);
      const evidence = config.evidenceSummary || {};
      summaryBox.innerHTML = `
        <div class="builder-panel">
          <p class="eyebrow">${copy.summaryEyebrow}</p>
          <h3>${copy.summaryTitle}</h3>
          <p class="risk-chip ${badgeClass(summary.level)}">${summary.level}</p>
          <p class="muted">${summary.rationale}</p>
          <ul class="check-list">
            ${summary.articles.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </div>
        <div class="evidence-card">
          <div>
            <p class="eyebrow">${copy.evidenceEyebrow}</p>
            <h3>${copy.evidenceTitle}</h3>
          </div>
          <div class="metric-grid">
            <div class="metric"><span>${copy.metrics.approvals}</span><strong>${evidence.approvals ?? 1}</strong></div>
            <div class="metric"><span>${copy.metrics.blocks}</span><strong>${evidence.blocks ?? 1}</strong></div>
            <div class="metric"><span>${copy.metrics.runs}</span><strong>${evidence.runsInWindow ?? 2}</strong></div>
            <div class="metric"><span>${copy.metrics.execution}</span><strong>${evidence.executionQuality ?? "healthy"}</strong></div>
          </div>
          <div class="button-row">
            <a class="button" href="${copy.links.pricing}" data-track-event="builder_generate_evidence">${copy.getEvidence}</a>
            <a class="button-ghost" href="${copy.links.proof}" target="_blank" rel="noreferrer">${copy.openProof}</a>
          </div>
        </div>
      `;
    }

    function bindStepInputs() {
      stepBody.querySelectorAll("input, textarea, select").forEach((field) => {
        field.addEventListener("change", function () {
          if (field.type === "checkbox" && field.name === "memberStates") {
            setCheckboxValues("memberStates");
          } else if (field.type === "checkbox") {
            state[field.name] = field.checked;
          } else if (field.type === "radio") {
            state[field.name] = field.value === "yes";
          } else {
            state[field.name] = field.value;
            if (field.name === "systemType") {
              state.systemTypeLabel = field.options[field.selectedIndex] ? field.options[field.selectedIndex].text : "";
            }
          }
          save();
          updateSummary();
        });
      });
    }

    function renderStep1() {
      stepBody.innerHTML = `
        <div class="builder-panel">
          <div class="form-grid">
            <div class="field">
              <label for="systemType">${copy.fields.systemType}</label>
              <select class="select" id="systemType" name="systemType">
                <option value="">${copy.selectPlaceholder}</option>
                ${copy.systemTypes
                  .map(
                    (option) => `<option value="${option.value}" ${state.systemType === option.value ? "selected" : ""}>${option.label}</option>`
                  )
                  .join("")}
              </select>
            </div>
            <fieldset class="field">
              <legend>${copy.fields.memberStates}</legend>
              <div class="checkbox-list">
                ${copy.memberStates
                  .map(
                    (value) => `
                  <label class="checkbox-row">
                    <input type="checkbox" name="memberStates" value="${value}" ${state.memberStates.includes(value) ? "checked" : ""} />
                    <span>${value}</span>
                  </label>`
                  )
                  .join("")}
              </div>
            </fieldset>
            <fieldset class="field">
              <legend>${copy.fields.usedByEuResidents}</legend>
              <div class="radio-list">
                <label class="radio-row"><input type="radio" name="usedByEuResidents" value="yes" ${state.usedByEuResidents ? "checked" : ""} /> <span>${copy.yes}</span></label>
                <label class="radio-row"><input type="radio" name="usedByEuResidents" value="no" ${state.usedByEuResidents ? "" : "checked"} /> <span>${copy.no}</span></label>
              </div>
            </fieldset>
            <fieldset class="field">
              <legend>${copy.fields.autonomousDecisions}</legend>
              <div class="radio-list">
                <label class="radio-row"><input type="radio" name="autonomousDecisions" value="yes" ${state.autonomousDecisions ? "checked" : ""} /> <span>${copy.yes}</span></label>
                <label class="radio-row"><input type="radio" name="autonomousDecisions" value="no" ${state.autonomousDecisions ? "" : "checked"} /> <span>${copy.no}</span></label>
              </div>
            </fieldset>
          </div>
        </div>
      `;
      bindStepInputs();
    }

    function renderStep2() {
      const summary = buildClassification(state, copy);
      stepBody.innerHTML = `
        <div class="builder-panel">
          <p class="eyebrow">${copy.stepTitles.step2}</p>
          <h3>${summary.level}</h3>
          <p class="muted">${summary.rationale}</p>
          <div class="button-row">
            ${summary.articles
              .map((item) => `<span class="pill">${item}</span>`)
              .join("")}
          </div>
          <p class="lang-note">${copy.disclaimer}</p>
        </div>
      `;
    }

    function renderStep3() {
      stepBody.innerHTML = `
        <div class="builder-panel">
          <div class="form-grid">
            <div class="field">
              <label for="risks">${copy.fields.risks}</label>
              <textarea class="textarea" id="risks" name="risks" placeholder="${copy.placeholders.risks}">${state.risks || ""}</textarea>
            </div>
            <div class="field">
              <label for="mitigations">${copy.fields.mitigations}</label>
              <textarea class="textarea" id="mitigations" name="mitigations" placeholder="${copy.placeholders.mitigations}">${state.mitigations || ""}</textarea>
            </div>
          </div>
        </div>
        <div class="evidence-card">
          <p class="eyebrow">${copy.ctaRiskEyebrow}</p>
          <h3>${copy.ctaRiskTitle}</h3>
          <p>${copy.ctaRiskBody}</p>
          <ul class="check-list">
            ${copy.ctaRiskPoints.map((point) => `<li>${point}</li>`).join("")}
          </ul>
          <div class="button-row">
            <a class="button" href="${copy.links.pricing}" data-track-event="builder_risk_generate">${copy.getEvidence}</a>
            <a class="button-ghost" href="${copy.links.proof}" target="_blank" rel="noreferrer">${copy.openProof}</a>
          </div>
        </div>
      `;
      bindStepInputs();
    }

    function renderStep4() {
      stepBody.innerHTML = `
        <div class="builder-panel">
          <div class="form-grid">
            <div class="field">
              <label for="logging">${copy.fields.logging}</label>
              <textarea class="textarea" id="logging" name="logging" placeholder="${copy.placeholders.logging}">${state.logging || ""}</textarea>
            </div>
            <div class="field">
              <label for="oversight">${copy.fields.oversight}</label>
              <textarea class="textarea" id="oversight" name="oversight" placeholder="${copy.placeholders.oversight}">${state.oversight || ""}</textarea>
            </div>
          </div>
        </div>
        <div class="evidence-card">
          <p class="eyebrow">${copy.ctaOversightEyebrow}</p>
          <h3>${copy.ctaOversightTitle}</h3>
          <p>${copy.ctaOversightBody}</p>
          <div class="button-row">
            <a class="button" href="${copy.links.pricing}" data-track-event="builder_oversight_generate">${copy.getEvidence}</a>
            <a class="button-ghost" href="${copy.links.docs}">${copy.openDocs}</a>
          </div>
        </div>
      `;
      bindStepInputs();
    }

    function renderStep5() {
      const summary = buildClassification(state, copy);
      stepBody.innerHTML = `
        <div class="builder-panel builder-export-card">
          <p class="eyebrow">${copy.stepTitles.step5}</p>
          <h3>${copy.packageTitle}</h3>
          <ul class="check-list">
            ${copy.packageChecklist.done.map((item) => `<li>${item}</li>`).join("")}
          </ul>
          <ul class="check-list">
            ${copy.packageChecklist.todo.map((item) => `<li>${item}</li>`).join("")}
          </ul>
          <p class="lang-note">${copy.exportHint}</p>
        </div>
        <div class="builder-nav">
          <button class="button-soft" type="button" data-builder-download-json>${copy.downloadJson}</button>
          <button class="button-ghost" type="button" data-builder-open-package>${copy.openPrintable}</button>
          <a class="button" href="${copy.links.pricing}" data-track-event="builder_get_evidence">${copy.getEvidence}</a>
        </div>
      `;

      const jsonButton = stepBody.querySelector("[data-builder-download-json]");
      const packageButton = stepBody.querySelector("[data-builder-open-package]");
      if (jsonButton) {
        jsonButton.addEventListener("click", function () {
          const payload = {
            generated_at: new Date().toISOString(),
            profile: state,
            classification: summary,
          };
          downloadFile("eu-ai-act-documentation-package.json", "application/json", JSON.stringify(payload, null, 2));
        });
      }
      if (packageButton) {
        packageButton.addEventListener("click", function () {
          const html = makePackageHtml(state, summary, copy);
          const popup = window.open("", "_blank");
          if (popup) {
            popup.document.write(html);
            popup.document.close();
          }
        });
      }
    }

    function render() {
      const total = 5;
      if (stepCounter) {
        stepCounter.textContent = `${copy.stepLabel} ${state.step} ${copy.ofLabel} ${total}`;
      }
      if (progressBar) {
        progressBar.style.width = `${(state.step / total) * 100}%`;
      }
      if (stepTitle) {
        stepTitle.textContent = copy.stepTitles[`step${state.step}`];
      }
      if (prevButton) prevButton.disabled = state.step === 1;
      if (nextButton) nextButton.textContent = state.step === total ? copy.finishLabel : copy.nextLabel;

      if (state.step === 1) renderStep1();
      else if (state.step === 2) renderStep2();
      else if (state.step === 3) renderStep3();
      else if (state.step === 4) renderStep4();
      else renderStep5();

      updateSummary();
      save();
    }

    if (prevButton) {
      prevButton.addEventListener("click", function () {
        state.step = Math.max(1, state.step - 1);
        render();
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        if (state.step < 5) {
          state.step += 1;
          render();
        }
      });
    }

    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    const root = document.getElementById("builder-root");
    if (root) initBuilder(root);
  });
})();
