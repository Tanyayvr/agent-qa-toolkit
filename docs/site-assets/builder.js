(function () {
  const storagePrefix = "eu-ai-builder-state-v2";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

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

  function makeLegacyPackageHtml(state, summary, copy) {
    const sections = [
      {
        title: copy.packageSections.profile,
        body: `
          <p><strong>${escapeHtml(copy.fields.systemType)}</strong>: ${escapeHtml(state.systemTypeLabel || "-")}</p>
          <p><strong>${escapeHtml(copy.fields.memberStates)}</strong>: ${escapeHtml((state.memberStates || []).join(", ") || "-")}</p>
          <p><strong>${escapeHtml(copy.fields.usedByEuResidents)}</strong>: ${state.usedByEuResidents ? escapeHtml(copy.yes) : escapeHtml(copy.no)}</p>
          <p><strong>${escapeHtml(copy.fields.autonomousDecisions)}</strong>: ${state.autonomousDecisions ? escapeHtml(copy.yes) : escapeHtml(copy.no)}</p>
        `,
      },
      {
        title: copy.packageSections.risk,
        body: `
          <p><strong>${escapeHtml(copy.stepTitles.step2)}</strong>: ${escapeHtml(summary.level)}</p>
          <p>${escapeHtml(summary.rationale)}</p>
          <p><strong>${escapeHtml(copy.requiredArticles)}</strong>: ${escapeHtml(summary.articles.join(", "))}</p>
        `,
      },
      {
        title: copy.packageSections.article9,
        body: `
          <p><strong>${escapeHtml(copy.fields.risks)}</strong></p>
          <p>${escapeHtml(state.risks || copy.placeholderText).replace(/\n/g, "<br>")}</p>
          <p><strong>${escapeHtml(copy.fields.mitigations)}</strong></p>
          <p>${escapeHtml(state.mitigations || copy.placeholderText).replace(/\n/g, "<br>")}</p>
        `,
      },
      {
        title: copy.packageSections.oversight,
        body: `
          <p><strong>${escapeHtml(copy.fields.logging)}</strong></p>
          <p>${escapeHtml(state.logging || copy.placeholderText).replace(/\n/g, "<br>")}</p>
          <p><strong>${escapeHtml(copy.fields.oversight)}</strong></p>
          <p>${escapeHtml(state.oversight || copy.placeholderText).replace(/\n/g, "<br>")}</p>
        `,
      },
      {
        title: copy.packageSections.evidence,
        body: `
          <p>${escapeHtml(copy.evidencePlaceholder)}</p>
          <ul>
            <li><a href="${escapeHtml(copy.links.pricing)}">${escapeHtml(copy.getEvidence)}</a></li>
            <li><a href="${escapeHtml(copy.links.proof)}">${escapeHtml(copy.openProof)}</a></li>
          </ul>
        `,
      },
    ];

    return `<!doctype html>
<html lang="${escapeHtml(copy.locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(copy.packageTitle)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 40px auto; max-width: 860px; color: #0f172a; line-height: 1.6; }
    h1, h2 { font-family: "Space Grotesk", Inter, sans-serif; letter-spacing: -0.03em; }
    section { border: 1px solid #dbe5f1; border-radius: 16px; padding: 20px; margin: 0 0 20px; }
    .notice { background: #eff6ff; border-color: #bfdbfe; }
    a { color: #1b4fd8; }
  </style>
</head>
<body>
  <h1>${escapeHtml(copy.packageTitle)}</h1>
  <section class="notice">
    <p>${escapeHtml(copy.packageDisclaimer)}</p>
  </section>
  ${sections
    .map(
      (section) => `
    <section>
      <h2>${escapeHtml(section.title)}</h2>
      ${section.body}
    </section>`
    )
    .join("")}
</body>
</html>`;
  }

  function collectLegalSources(copy) {
    const seen = new Map();
    (copy.legalSteps || []).forEach((step) => {
      step.fields.forEach((field) => {
        const id = `${field.sourceLabel}|${field.sourceHref}`;
        if (!seen.has(id)) seen.set(id, field);
      });
    });
    return Array.from(seen.values());
  }

  function collectTemplatePages(copy) {
    const seen = new Map();
    (copy.legalSteps || []).forEach((step) => {
      (step.fields || []).forEach((field) => {
        const id = field.sourceHref;
        if (!seen.has(id)) {
          seen.set(id, {
            href: field.sourceHref,
            title: field.sourcePageTitle || step.title,
            clauses: [],
          });
        }
        const page = seen.get(id);
        if (!page.clauses.includes(field.sourceLabel)) page.clauses.push(field.sourceLabel);
      });
    });
    return Array.from(seen.values());
  }

  function collectLegalSourcesForStep(step) {
    const seen = new Map();
    (step.fields || []).forEach((field) => {
      const id = `${field.sourceLabel}|${field.sourceHref}`;
      if (!seen.has(id)) seen.set(id, field);
    });
    return Array.from(seen.values());
  }

  function collectTemplatePagesForStep(step) {
    const seen = new Map();
    (step.fields || []).forEach((field) => {
      const id = field.sourceHref;
      if (!seen.has(id)) {
        seen.set(id, {
          href: field.sourceHref,
          title: field.sourcePageTitle || field.sourceLabel,
          clauses: [],
        });
      }
      const page = seen.get(id);
      if (!page.clauses.includes(field.sourceLabel)) page.clauses.push(field.sourceLabel);
    });
    return Array.from(seen.values());
  }

  function buildLegalDraftPayload(state, copy) {
    const builderHref =
      typeof window !== "undefined" && window.location ? window.location.href.split("#")[0].split("?")[0] : "";
    const sections = (copy.legalSteps || []).map((step, index) => {
      const fields = step.fields.map((field) => {
        const value = state.values[field.key] || "";
        return {
          key: field.key,
          label: field.label,
          group_title: field.groupTitle || "",
          group_lead: field.groupLead || "",
          source_label: field.sourceLabel,
          source_href: field.sourceHref,
          value: value,
          filled: value.trim().length > 0,
        };
      });
      const filledFields = fields.filter((field) => field.filled).length;
      const sourceRefs = [];
      fields.forEach((field) => {
        if (!sourceRefs.some((item) => item.label === field.source_label && item.href === field.source_href)) {
          sourceRefs.push({ label: field.source_label, href: field.source_href });
        }
      });
      return {
        id: step.id,
        step_number: index + 1,
        title: step.title,
        lead: step.lead || "",
        filled_fields: filledFields,
        total_fields: fields.length,
        empty_fields: fields
          .filter((field) => !field.filled)
          .map((field) => ({
            key: field.key,
            label: field.label,
            source_label: field.source_label,
            source_href: field.source_href,
          })),
        source_refs: sourceRefs,
        fields: fields,
      };
    });
    const totalFields = sections.reduce((sum, section) => sum + section.total_fields, 0);
    const filledFields = sections.reduce((sum, section) => sum + section.filled_fields, 0);

    return {
      schema_version: 1,
      artifact_type: "eu_ai_act_legal_draft",
      framework: "EU_AI_ACT",
      draft_scope: "provider_minimum_legal_path",
      generated_at: new Date().toISOString(),
      builder_href: builderHref,
      export_step_href: builderHref ? `${builderHref}?step=${sections.length + 1}` : "",
      locale: copy.locale,
      package_title: copy.packageTitle,
      package_disclaimer: copy.packageDisclaimer,
      completion_summary: {
        section_count: sections.length,
        total_fields: totalFields,
        filled_fields: filledFields,
        empty_fields: totalFields - filledFields,
        sections: sections.map((section) => ({
          id: section.id,
          title: section.title,
          filled_fields: section.filled_fields,
          total_fields: section.total_fields,
          empty_fields: section.empty_fields.length,
        })),
      },
      sources: collectTemplatePages(copy).map((page) => ({
        title: page.title,
        href: page.href,
        clauses: page.clauses,
      })),
      completed_sections_checklist: copy.packageChecklist.done || [],
      sections: sections,
      open_fields: sections.flatMap((section) =>
        section.empty_fields.map((field) => ({
          step_number: section.step_number,
          section_id: section.id,
          section_title: section.title,
          key: field.key,
          label: field.label,
          edit_href: builderHref ? `${builderHref}?step=${section.step_number}&field=${encodeURIComponent(field.key)}` : "",
        }))
      ),
    };
  }

  function makeLegalPackageHtml(state, copy) {
    const payload = buildLegalDraftPayload(state, copy);
    const sections = payload.sections.map((section) => {
      let currentGroup = "";
      const body = section.fields
        .map((field) => {
          const groupBlock =
            field.group_title && field.group_title !== currentGroup
              ? `<div style="margin: 22px 0 12px;"><h3 style="margin: 0 0 6px;">${escapeHtml(field.group_title)}</h3>${field.group_lead ? `<p style="margin: 0; color: #475569;">${escapeHtml(field.group_lead)}</p>` : ""}</div>`
              : "";
          currentGroup = field.group_title || currentGroup;
          return `
            ${groupBlock}
            <div style="margin: 0 0 18px;">
              <p><strong>${escapeHtml(field.label)}</strong></p>
              <p><em>${escapeHtml(copy.sourceLabel)}: <a href="${escapeHtml(field.source_href)}">${escapeHtml(field.source_label)}</a></em></p>
              <p>${escapeHtml((field.value || "").trim() || copy.noTextYet).replace(/\n/g, "<br>")}</p>
            </div>`;
        })
        .join("");
      return { title: section.title, body: body };
    });

    return `<!doctype html>
<html lang="${escapeHtml(copy.locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(copy.packageTitle)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 40px auto; max-width: 920px; color: #0f172a; line-height: 1.6; }
    h1, h2, h3 { font-family: "Space Grotesk", Inter, sans-serif; letter-spacing: -0.03em; }
    section { border: 1px solid #dbe5f1; border-radius: 16px; padding: 20px; margin: 0 0 20px; }
    .notice { background: #eff6ff; border-color: #bfdbfe; }
    a { color: #1b4fd8; }
  </style>
</head>
<body>
  <h1>${escapeHtml(copy.packageTitle)}</h1>
  <section class="notice">
    <p>${escapeHtml(copy.packageDisclaimer)}</p>
    <p><strong>${escapeHtml(String(payload.completion_summary.filled_fields))}</strong> / <strong>${escapeHtml(String(payload.completion_summary.total_fields))}</strong> ${escapeHtml(copy.filledLabel)}</p>
    <p>${escapeHtml(payload.generated_at)}</p>
    ${
      payload.export_step_href
        ? `<p><a href="${escapeHtml(payload.export_step_href)}">Return to the builder to revise this draft</a></p>`
        : ""
    }
  </section>
  ${sections
    .map(
      (section) => `
    <section>
      <h2>${escapeHtml(section.title)}</h2>
      ${section.body}
    </section>`
    )
    .join("")}
  <section>
    <h2>${escapeHtml(copy.summaryTitle)}</h2>
    <ul>
      ${payload.completion_summary.sections
        .map(
          (section) =>
            `<li>${escapeHtml(section.title)}: ${escapeHtml(String(section.filled_fields))} / ${escapeHtml(String(section.total_fields))} ${escapeHtml(copy.filledLabel)}; ${escapeHtml(String(section.empty_fields))} open</li>`
        )
        .join("")}
    </ul>
  </section>
  <section>
    <h2>Fields still to complete</h2>
    <ul>
      ${
        payload.open_fields.length
          ? payload.open_fields
              .map(
                (field) =>
                  field.edit_href
                    ? `<li><a href="${escapeHtml(field.edit_href)}">${escapeHtml(field.section_title)}: ${escapeHtml(field.label)}</a></li>`
                    : `<li>${escapeHtml(field.section_title)}: ${escapeHtml(field.label)}</li>`
              )
              .join("")
          : "<li>None.</li>"
      }
    </ul>
  </section>
  ${
    payload.export_step_href
      ? `<section>
    <p><a href="${escapeHtml(payload.export_step_href)}">Return to the builder to revise this draft</a></p>
  </section>`
      : ""
  }
</body>
</html>`;
  }

  function openLegalDraftPreview(state, copy) {
    const html = makeLegalPackageHtml(state, copy);
    const popup = window.open("", "_blank");
    if (popup) {
      popup.document.write(html);
      popup.document.close();
    }
  }

  function downloadLegalDraftJson(state, copy) {
    const payload = buildLegalDraftPayload(state, copy);
    downloadFile("eu-ai-act-legal-draft.json", "application/json", JSON.stringify(payload, null, 2));
  }

  function initLegalState(copy, persisted, requestedStep) {
    const persistedValues = persisted && persisted.values ? persisted.values : {};
    const values = {};
    (copy.legalSteps || []).forEach((step) => {
      step.fields.forEach((field) => {
        values[field.key] = typeof persistedValues[field.key] === "string" ? persistedValues[field.key] : "";
      });
    });
    const safeRequestedStep =
      Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= (copy.legalSteps || []).length + 1
        ? requestedStep
        : null;
    return {
      step:
        safeRequestedStep ??
        Math.min(Math.max(Number(persisted.step) || 1, 1), (copy.legalSteps || []).length + 1),
      values: values,
    };
  }

  function initBuilder(root) {
    const configNode = document.getElementById("builder-config");
    if (!configNode) return;
    const config = JSON.parse(configNode.textContent || "{}");
    const copy = config.copy || {};
    const isLegalMode = Array.isArray(copy.legalSteps) && copy.legalSteps.length > 0;
    const storageKey = `${storagePrefix}:${copy.locale || "en"}`;
    const persisted = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    const urlParams = new URLSearchParams(window.location.search);
    let requestedField = isLegalMode ? urlParams.get("field") || "" : "";
    const derivedStepFromField =
      isLegalMode && requestedField
        ? (copy.legalSteps || []).findIndex((step) => step.fields.some((field) => field.key === requestedField)) + 1
        : 0;
    const requestedStep = isLegalMode ? Number(urlParams.get("step")) || derivedStepFromField || 0 : 0;
    const state = isLegalMode
      ? initLegalState(copy, persisted, requestedStep)
      : Object.assign(
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
    const errorBox = root.querySelector("[data-builder-error]");
    const buttonHint = root.querySelector("[data-builder-button-hint]");
    const prevButton = root.querySelector("[data-builder-prev]");
    const nextButton = root.querySelector("[data-builder-next]");
    const exportJumpButton = root.querySelector("[data-builder-export-jump]");

    function save() {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    }

    function clearError() {
      if (!errorBox) return;
      errorBox.hidden = true;
      errorBox.textContent = "";
    }

    function showError(message) {
      if (!errorBox) return;
      errorBox.hidden = false;
      errorBox.textContent = message;
    }

    function updateNextStepState(total) {
      if (!nextButton) return;
      if (state.step === total) {
        nextButton.hidden = false;
        nextButton.disabled = !isLegalMode || !copy.links.nextStage;
        nextButton.textContent = copy.nextLabel;
        if (exportJumpButton) {
          exportJumpButton.hidden = false;
          exportJumpButton.disabled = false;
          exportJumpButton.textContent = copy.openPrintable || "Draft";
        }
        if (buttonHint) {
          buttonHint.hidden = true;
          buttonHint.textContent = "";
        }
        return;
      }

      nextButton.hidden = false;
      nextButton.disabled = false;
      nextButton.textContent = (copy.nextLabels && copy.nextLabels[`step${state.step}`]) || copy.nextLabel;
      if (exportJumpButton) {
        exportJumpButton.hidden = !isLegalMode;
        exportJumpButton.disabled = !isLegalMode;
        exportJumpButton.textContent = copy.jumpToExportLabel || "Draft";
      }

      if (isLegalMode) {
        if (buttonHint) {
          buttonHint.hidden = true;
          buttonHint.textContent = "";
        }
        return;
      }

      const step1Locked = state.step === 1 && !state.systemType;
      nextButton.disabled = step1Locked;
      if (buttonHint) {
        if (step1Locked && copy.buttonHints && copy.buttonHints.step1) {
          buttonHint.hidden = false;
          buttonHint.textContent = copy.buttonHints.step1;
        } else {
          buttonHint.hidden = true;
          buttonHint.textContent = "";
        }
      }
    }

    function setCheckboxValues(name) {
      const checked = Array.from(stepBody.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
      state.memberStates = checked;
      state.deployedInEu = checked.length > 0;
    }

    function updateLegacySummary() {
      const summary = buildClassification(state, copy);
      const evidence = config.evidenceSummary || {};
      summaryBox.innerHTML = `
        <div class="builder-panel">
          <p class="eyebrow">${escapeHtml(copy.summaryEyebrow)}</p>
          <h3>${escapeHtml(copy.summaryTitle)}</h3>
          <p class="risk-chip ${badgeClass(summary.level)}">${escapeHtml(summary.level)}</p>
          <p class="muted">${escapeHtml(summary.rationale)}</p>
          <ul class="check-list">
            ${summary.articles.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        <div class="evidence-card">
          <div>
            <p class="eyebrow">${escapeHtml(copy.evidenceEyebrow)}</p>
            <h3>${escapeHtml(copy.evidenceTitle)}</h3>
          </div>
          <div class="metric-grid">
            <div class="metric"><span>${escapeHtml(copy.metrics.approvals)}</span><strong>${escapeHtml(evidence.approvals ?? 1)}</strong></div>
            <div class="metric"><span>${escapeHtml(copy.metrics.blocks)}</span><strong>${escapeHtml(evidence.blocks ?? 1)}</strong></div>
            <div class="metric"><span>${escapeHtml(copy.metrics.runs)}</span><strong>${escapeHtml(evidence.runsInWindow ?? 2)}</strong></div>
            <div class="metric"><span>${escapeHtml(copy.metrics.execution)}</span><strong>${escapeHtml(evidence.executionQuality ?? "healthy")}</strong></div>
          </div>
          <div class="button-row">
            <a class="button" href="${escapeHtml(copy.links.pricing)}" data-track-event="builder_generate_evidence">${escapeHtml(copy.getEvidence)}</a>
            <a class="button-ghost" href="${escapeHtml(copy.links.proof)}" target="_blank" rel="noreferrer">${escapeHtml(copy.openProof)}</a>
          </div>
        </div>
      `;
    }

    function bindLegacyStepInputs() {
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
          updateLegacySummary();
          updateNextStepState(5);
          clearError();
        });
      });
    }

    function renderLegacyStep1() {
      stepBody.innerHTML = `
        <div class="builder-panel">
          ${copy.stepLeads && copy.stepLeads.step1 ? `<p class="lang-note">${escapeHtml(copy.stepLeads.step1)}</p>` : ""}
          <div class="form-grid">
            <div class="field">
              <label for="systemType">${escapeHtml(copy.fields.systemType)}</label>
              ${copy.fieldHelp && copy.fieldHelp.systemType ? `<p class="lang-note">${escapeHtml(copy.fieldHelp.systemType)}</p>` : ""}
              <select class="select" id="systemType" name="systemType">
                <option value="">${escapeHtml(copy.selectPlaceholder)}</option>
                ${copy.systemTypes
                  .map(
                    (option) => `<option value="${escapeHtml(option.value)}" ${state.systemType === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`
                  )
                  .join("")}
              </select>
            </div>
            <fieldset class="field">
              <legend>${escapeHtml(copy.fields.memberStates)}</legend>
              ${copy.fieldHelp && copy.fieldHelp.memberStates ? `<p class="lang-note">${escapeHtml(copy.fieldHelp.memberStates)}</p>` : ""}
              <div class="checkbox-list">
                ${copy.memberStates
                  .map(
                    (value) => `
                  <label class="checkbox-row">
                    <input type="checkbox" name="memberStates" value="${escapeHtml(value)}" ${state.memberStates.includes(value) ? "checked" : ""} />
                    <span>${escapeHtml(value)}</span>
                  </label>`
                  )
                  .join("")}
              </div>
            </fieldset>
            <fieldset class="field">
              <legend>${escapeHtml(copy.fields.usedByEuResidents)}</legend>
              ${copy.fieldHelp && copy.fieldHelp.usedByEuResidents ? `<p class="lang-note">${escapeHtml(copy.fieldHelp.usedByEuResidents)}</p>` : ""}
              <div class="radio-list">
                <label class="radio-row"><input type="radio" name="usedByEuResidents" value="yes" ${state.usedByEuResidents ? "checked" : ""} /> <span>${escapeHtml(copy.yes)}</span></label>
                <label class="radio-row"><input type="radio" name="usedByEuResidents" value="no" ${state.usedByEuResidents ? "" : "checked"} /> <span>${escapeHtml(copy.no)}</span></label>
              </div>
            </fieldset>
            <fieldset class="field">
              <legend>${escapeHtml(copy.fields.autonomousDecisions)}</legend>
              ${copy.fieldHelp && copy.fieldHelp.autonomousDecisions ? `<p class="lang-note">${escapeHtml(copy.fieldHelp.autonomousDecisions)}</p>` : ""}
              <div class="radio-list">
                <label class="radio-row"><input type="radio" name="autonomousDecisions" value="yes" ${state.autonomousDecisions ? "checked" : ""} /> <span>${escapeHtml(copy.yes)}</span></label>
                <label class="radio-row"><input type="radio" name="autonomousDecisions" value="no" ${state.autonomousDecisions ? "" : "checked"} /> <span>${escapeHtml(copy.no)}</span></label>
              </div>
            </fieldset>
          </div>
        </div>
      `;
      bindLegacyStepInputs();
    }

    function renderLegacyStep2() {
      const summary = buildClassification(state, copy);
      stepBody.innerHTML = `
        <div class="builder-panel">
          <p class="eyebrow">${escapeHtml(copy.stepTitles.step2)}</p>
          ${copy.stepLeads && copy.stepLeads.step2 ? `<p class="lang-note">${escapeHtml(copy.stepLeads.step2)}</p>` : ""}
          ${
            copy.step2Inputs && copy.step2Inputs.length
              ? `
          <div class="field">
            <p><strong>${escapeHtml(copy.step2InputsTitle)}</strong></p>
            <ul class="check-list">
              ${copy.step2Inputs.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>`
              : ""
          }
          <h3>${escapeHtml(summary.level)}</h3>
          <p class="muted">${escapeHtml(summary.rationale)}</p>
          <div class="button-row">
            ${summary.articles.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}
          </div>
          <p class="lang-note">${escapeHtml(copy.disclaimer)}</p>
        </div>
      `;
    }

    function renderLegacyStep3() {
      stepBody.innerHTML = `
        <div class="builder-panel">
          ${copy.stepLeads && copy.stepLeads.step3 ? `<p class="lang-note">${escapeHtml(copy.stepLeads.step3)}</p>` : ""}
          <div class="form-grid">
            <div class="field">
              <label for="risks">${escapeHtml(copy.fields.risks)}</label>
              ${copy.fieldHelp && copy.fieldHelp.risks ? `<p class="lang-note">${escapeHtml(copy.fieldHelp.risks)}</p>` : ""}
              <textarea class="textarea" id="risks" name="risks" placeholder="${escapeHtml(copy.placeholders.risks)}">${escapeHtml(state.risks || "")}</textarea>
            </div>
            <div class="field">
              <label for="mitigations">${escapeHtml(copy.fields.mitigations)}</label>
              ${copy.fieldHelp && copy.fieldHelp.mitigations ? `<p class="lang-note">${escapeHtml(copy.fieldHelp.mitigations)}</p>` : ""}
              <textarea class="textarea" id="mitigations" name="mitigations" placeholder="${escapeHtml(copy.placeholders.mitigations)}">${escapeHtml(state.mitigations || "")}</textarea>
            </div>
          </div>
        </div>
        <div class="evidence-card">
          <p class="eyebrow">${escapeHtml(copy.ctaRiskEyebrow)}</p>
          <h3>${escapeHtml(copy.ctaRiskTitle)}</h3>
          <p>${escapeHtml(copy.ctaRiskBody)}</p>
          <ul class="check-list">
            ${copy.ctaRiskPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
          </ul>
          <div class="button-row">
            <a class="button" href="${escapeHtml(copy.links.pricing)}" data-track-event="builder_risk_generate">${escapeHtml(copy.getEvidence)}</a>
            <a class="button-ghost" href="${escapeHtml(copy.links.proof)}" target="_blank" rel="noreferrer">${escapeHtml(copy.openProof)}</a>
          </div>
        </div>
      `;
      bindLegacyStepInputs();
    }

    function renderLegacyStep4() {
      stepBody.innerHTML = `
        <div class="builder-panel">
          ${copy.stepLeads && copy.stepLeads.step4 ? `<p class="lang-note">${escapeHtml(copy.stepLeads.step4)}</p>` : ""}
          <div class="form-grid">
            <div class="field">
              <label for="logging">${escapeHtml(copy.fields.logging)}</label>
              ${copy.fieldHelp && copy.fieldHelp.logging ? `<p class="lang-note">${escapeHtml(copy.fieldHelp.logging)}</p>` : ""}
              <textarea class="textarea" id="logging" name="logging" placeholder="${escapeHtml(copy.placeholders.logging)}">${escapeHtml(state.logging || "")}</textarea>
            </div>
            <div class="field">
              <label for="oversight">${escapeHtml(copy.fields.oversight)}</label>
              ${copy.fieldHelp && copy.fieldHelp.oversight ? `<p class="lang-note">${escapeHtml(copy.fieldHelp.oversight)}</p>` : ""}
              <textarea class="textarea" id="oversight" name="oversight" placeholder="${escapeHtml(copy.placeholders.oversight)}">${escapeHtml(state.oversight || "")}</textarea>
            </div>
          </div>
        </div>
        <div class="evidence-card">
          <p class="eyebrow">${escapeHtml(copy.ctaOversightEyebrow)}</p>
          <h3>${escapeHtml(copy.ctaOversightTitle)}</h3>
          <p>${escapeHtml(copy.ctaOversightBody)}</p>
          <div class="button-row">
            <a class="button" href="${escapeHtml(copy.links.pricing)}" data-track-event="builder_oversight_generate">${escapeHtml(copy.getEvidence)}</a>
            <a class="button-ghost" href="${escapeHtml(copy.links.docs)}">${escapeHtml(copy.openDocs)}</a>
          </div>
        </div>
      `;
      bindLegacyStepInputs();
    }

    function renderLegacyStep5() {
      const summary = buildClassification(state, copy);
      stepBody.innerHTML = `
        <div class="builder-panel builder-export-card">
          <p class="eyebrow">${escapeHtml(copy.stepTitles.step5)}</p>
          <h3>${escapeHtml(copy.packageTitle)}</h3>
          <ul class="check-list">
            ${copy.packageChecklist.done.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <ul class="check-list">
            ${copy.packageChecklist.todo.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <p class="lang-note">${escapeHtml(copy.exportHint)}</p>
        </div>
        <div class="builder-nav">
          <button class="button-soft" type="button" data-builder-download-json>${escapeHtml(copy.downloadJson)}</button>
          <button class="button-ghost" type="button" data-builder-open-package>${escapeHtml(copy.openPrintable)}</button>
          <a class="button" href="${escapeHtml(copy.links.pricing)}" data-track-event="builder_get_evidence">${escapeHtml(copy.getEvidence)}</a>
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
          const html = makeLegacyPackageHtml(state, summary, copy);
          const popup = window.open("", "_blank");
          if (popup) {
            popup.document.write(html);
            popup.document.close();
          }
        });
      }
    }

    function countFilledFields(step) {
      return step.fields.filter((field) => (state.values[field.key] || "").trim().length > 0).length;
    }

    function totalLegalFields() {
      return (copy.legalSteps || []).reduce((sum, step) => sum + step.fields.length, 0);
    }

    function totalStartedFields() {
      return (copy.legalSteps || []).reduce((sum, step) => sum + countFilledFields(step), 0);
    }

    function getSectionState(step) {
      const started = countFilledFields(step);
      if (!started) return copy.sectionStates.empty;
      if (started === step.fields.length) return copy.sectionStates.full;
      return copy.sectionStates.partial;
    }

    function updateLegalSummary() {
      const currentStep =
        state.step <= (copy.legalSteps || []).length ? copy.legalSteps[state.step - 1] : null;
      const sources = currentStep ? collectTemplatePagesForStep(currentStep) : [];
      const currentStarted = currentStep ? countFilledFields(currentStep) : 0;
      summaryBox.innerHTML = `
        <div class="builder-panel">
          <p class="eyebrow">${escapeHtml(copy.summaryEyebrow)}</p>
          <h3>${escapeHtml(copy.summaryTitle)}</h3>
          <p class="lang-note">${escapeHtml(copy.summaryHelp || "")}</p>
          <div class="metric-grid">
            <div class="metric"><span>${escapeHtml(copy.packageProgressLabel || "Whole package")}</span><strong>${escapeHtml(String(totalStartedFields()))} / ${escapeHtml(String(totalLegalFields()))} ${escapeHtml(copy.filledLabel)}</strong></div>
            <div class="metric"><span>${escapeHtml(copy.currentSectionLabel || "Current section")}</span><strong>${escapeHtml(String(currentStarted))} / ${escapeHtml(String(currentStep ? currentStep.fields.length : 0))} ${escapeHtml(copy.filledLabel)}</strong></div>
          </div>
          <p class="eyebrow section-tight">${escapeHtml(copy.sectionStatusTitle || "Section status")}</p>
          <ul class="check-list">
            ${(copy.legalSteps || [])
              .map(
                (step) =>
                  `<li><strong>${escapeHtml(step.title)}</strong>: ${escapeHtml(getSectionState(step))} (${escapeHtml(String(countFilledFields(step)))} / ${escapeHtml(String(step.fields.length))} ${escapeHtml(copy.filledLabel)})</li>`
              )
              .join("")}
          </ul>
        </div>
        <div class="evidence-card">
          <div>
            <p class="eyebrow">${escapeHtml(copy.evidenceEyebrow)}</p>
            <h3>${escapeHtml(copy.evidenceTitle)}</h3>
          </div>
          <p class="lang-note">${escapeHtml(copy.evidenceHelp || "")}</p>
          ${currentStep ? `<p class="lang-note"><strong>${escapeHtml(currentStep.title)}</strong></p>` : ""}
          <ul class="check-list">
            ${sources
              .map(
                (page) =>
                  `<li><a href="${escapeHtml(page.href)}">${escapeHtml(page.title)}</a><br><span class="lang-note">${escapeHtml(page.clauses.join(", "))}</span></li>`
              )
              .join("")}
          </ul>
          <div class="button-row">
            <a class="button-ghost" href="${escapeHtml(copy.links.docs)}">${escapeHtml(copy.openDocs)}</a>
          </div>
        </div>
      `;
    }

    function bindLegalStepInputs() {
      stepBody.querySelectorAll("textarea").forEach((field) => {
        field.addEventListener("input", function () {
          state.values[field.name] = field.value;
          save();
          updateLegalSummary();
          clearError();
        });
      });
    }

    function focusRequestedField() {
      if (!requestedField || !isLegalMode || state.step > (copy.legalSteps || []).length) return;
      const target = document.getElementById(requestedField);
      if (!target) return;
      const applyFocus = function () {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
        target.focus();
      };
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(applyFocus);
      } else {
        applyFocus();
      }
      requestedField = "";
      if (window.history && typeof window.history.replaceState === "function") {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("step");
        cleanUrl.searchParams.delete("field");
        window.history.replaceState({}, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
      }
    }

    function renderLegalStep(step) {
      stepBody.innerHTML = `
        <div class="builder-panel">
          ${step.lead ? `<p class="lang-note">${escapeHtml(step.lead)}</p>` : ""}
          <div class="form-grid">
            ${step.fields
              .map(
                (field) => `
              ${field.groupTitle ? `<div class="field" style="grid-column: 1 / -1;"><h3>${escapeHtml(field.groupTitle)}</h3>${field.groupLead ? `<p class="lang-note">${escapeHtml(field.groupLead)}</p>` : ""}</div>` : ""}
              <div class="field">
                <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
                <p class="lang-note">${escapeHtml(copy.sourceLabel)}: <a href="${escapeHtml(field.sourceHref)}">${escapeHtml(field.sourceLabel)}</a></p>
                ${field.help ? `<p class="lang-note">${escapeHtml(field.help)}</p>` : ""}
                <textarea class="textarea" id="${escapeHtml(field.key)}" name="${escapeHtml(field.key)}" placeholder="${escapeHtml(field.placeholder || copy.placeholderText)}">${escapeHtml(
                  state.values[field.key] || ""
                )}</textarea>
              </div>`
              )
              .join("")}
          </div>
        </div>
      `;
      bindLegalStepInputs();
    }

    function renderLegalExport() {
      const exportStepTitle = copy.stepTitles[`step${(copy.legalSteps || []).length + 1}`] || copy.nextLabel;
      stepBody.innerHTML = `
        <div class="builder-panel builder-export-card">
          <p class="eyebrow">${escapeHtml(exportStepTitle)}</p>
          <h3>${escapeHtml(copy.packageTitle)}</h3>
          <ul class="check-list">
            ${copy.packageChecklist.done.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <ul class="check-list">
            ${copy.packageChecklist.todo.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <p class="lang-note">${escapeHtml(copy.exportHint)}</p>
          ${copy.exportNextHint ? `<p class="lang-note">${escapeHtml(copy.exportNextHint)}</p>` : ""}
          <div class="builder-nav">
            <button class="button-soft" type="button" data-builder-download-legal-json>${escapeHtml(copy.downloadJson)}</button>
          </div>
        </div>
      `;

      const jsonButton = stepBody.querySelector("[data-builder-download-legal-json]");
      if (jsonButton) {
        jsonButton.addEventListener("click", function () {
          downloadLegalDraftJson(state, copy);
        });
      }
    }

    function render() {
      const total = isLegalMode ? (copy.legalSteps || []).length + 1 : 5;
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
      updateNextStepState(total);

      if (isLegalMode) {
        if (state.step <= (copy.legalSteps || []).length) {
          renderLegalStep(copy.legalSteps[state.step - 1]);
          focusRequestedField();
        } else {
          renderLegalExport();
        }
        updateLegalSummary();
        save();
        return;
      }

      if (state.step === 1) renderLegacyStep1();
      else if (state.step === 2) renderLegacyStep2();
      else if (state.step === 3) renderLegacyStep3();
      else if (state.step === 4) renderLegacyStep4();
      else renderLegacyStep5();

      updateLegacySummary();
      save();
    }

    if (prevButton) {
      prevButton.addEventListener("click", function () {
        state.step = Math.max(1, state.step - 1);
        clearError();
        render();
      });
    }

    if (exportJumpButton) {
      exportJumpButton.addEventListener("click", function () {
        if (!isLegalMode) return;
        if (state.step === (copy.legalSteps || []).length + 1) {
          openLegalDraftPreview(state, copy);
          return;
        }
        state.step = (copy.legalSteps || []).length + 1;
        clearError();
        render();
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        if (isLegalMode && state.step === (copy.legalSteps || []).length + 1) {
          if (copy.links.nextStage) window.location.assign(copy.links.nextStage);
          return;
        }
        if (!isLegalMode && state.step === 1 && !state.systemType) {
          showError(
            (copy.validationErrors && copy.validationErrors.step1SystemType) ||
              "Choose the closest system type first."
          );
          return;
        }
        if (state.step < (isLegalMode ? (copy.legalSteps || []).length + 1 : 5)) {
          state.step += 1;
          clearError();
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
