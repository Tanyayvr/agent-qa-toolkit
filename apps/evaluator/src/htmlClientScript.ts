import { type ReportCopy } from "./reportI18n";

export function renderReportClientScript(copy: ReportCopy): string {
  const messages = JSON.stringify({
    noSavedFiltersBlocked: copy.noSavedFiltersBlocked,
    noSavedFilters: copy.noSavedFilters,
    savedFilterPrefix: copy.savedFilterPrefix,
    removeButton: copy.removeButton,
    pageEmpty: copy.pageEmpty,
    pageRendering: copy.pageRendering,
    showingCount: copy.showingCount,
    pageCounter: copy.pageCounter,
    largeReportMode: copy.largeReportMode,
    rowsRendering: copy.rowsRendering,
    copiedButton: copy.copiedButton,
    copyFilterLinkButton: copy.copyFilterLinkButton,
    copyPrompt: copy.copyPrompt,
    savePrompt: copy.savePrompt,
  });

  return String.raw`    (function() {
      var ui = ` + messages + String.raw`;
      var el = document.getElementById("embedded-manifest-index");
      if (!el) return;
      var raw = el.textContent || "";
      var idx = null;
      try { idx = JSON.parse(raw); } catch (e) { idx = null; }
      var map = new Map();
      if (idx && Array.isArray(idx.items)) {
        for (var i = 0; i < idx.items.length; i++) {
          var it = idx.items[i];
          if (it && it.manifest_key && it.rel_path) map.set(String(it.manifest_key), String(it.rel_path));
        }
        var links = document.querySelectorAll("a[data-manifest-key]");
        for (var j = 0; j < links.length; j++) {
          var a = links[j];
          var key = a.getAttribute("data-manifest-key");
          if (!key) continue;
          var href = map.get(key);
          if (href) {
            a.setAttribute("href", href);
          } else {
            a.classList.add("muted");
            a.removeAttribute("href");
          }
        }
      }

      var filterText = document.getElementById("filterText");
      var filterSuite = document.getElementById("filterSuite");
      var filterDiff = document.getElementById("filterDiff");
      var filterSort = document.getElementById("filterSort");
      var filterRisk = document.getElementById("filterRisk");
      var filterGate = document.getElementById("filterGate");
      var filterStatus = document.getElementById("filterStatus");
      var copyFilterLink = document.getElementById("copyFilterLink");
      var resetFilters = document.getElementById("resetFilters");
      var saveFilters = document.getElementById("saveFilters");
      var savedFilters = document.getElementById("savedFilters");
      var filterCount = document.getElementById("filterCount");
      var casesBody = document.getElementById("casesBody");
      var pagePrev = document.getElementById("pagePrev");
      var pageNext = document.getElementById("pageNext");
      var pageSize = document.getElementById("pageSize");
      var pageInfo = document.getElementById("pageInfo");
      var rowsDataEl = document.getElementById("rows-data");
      var rowsData = [];
      try {
        rowsData = rowsDataEl && rowsDataEl.textContent ? JSON.parse(rowsDataEl.textContent) : [];
      } catch (e) {
        rowsData = [];
      }
      if (!Array.isArray(rowsData)) rowsData = [];
      var currentPage = 1;
      var manifestMap = map;
      var renderJobId = 0;
      var textFilterDebounceTimer = null;
      var LARGE_REPORT_ROWS = 1500;
      var RENDER_CHUNK_SIZE = 20;
      if (pageSize && rowsData.length >= LARGE_REPORT_ROWS && pageSize.value !== "25") {
        pageSize.value = "25";
      }

      function format(template, values) {
        return String(template || "").replace(/\{([a-z_]+)\}/g, function(_, key) {
          return Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : "";
        });
      }

      function getFilters() {
        return {
          text: filterText && filterText.value || "",
          suite: filterSuite && filterSuite.value || "",
          diff: filterDiff && filterDiff.value || "",
          sort: filterSort && filterSort.value || "case_id",
          risk: filterRisk && filterRisk.value || "",
          gate: filterGate && filterGate.value || "",
          status: filterStatus && filterStatus.value || ""
        };
      }

      function setFilters(f) {
        if (!f) return;
        if (filterText) filterText.value = f.text || "";
        if (filterSuite) filterSuite.value = f.suite || "";
        if (filterDiff) filterDiff.value = f.diff || "";
        if (filterSort) filterSort.value = f.sort || "case_id";
        if (filterRisk) filterRisk.value = f.risk || "";
        if (filterGate) filterGate.value = f.gate || "";
        if (filterStatus) filterStatus.value = f.status || "";
      }

      function parseHash() {
        var rawHash = window.location.hash || "";
        if (!rawHash || rawHash.length < 2) return null;
        var qs = rawHash.startsWith("#?") ? rawHash.slice(2) : rawHash.slice(1);
        var params = new URLSearchParams(qs);
        return {
          text: params.get("text") || "",
          suite: params.get("suite") || "",
          diff: params.get("diff") || "",
          sort: params.get("sort") || "case_id",
          risk: params.get("risk") || "",
          gate: params.get("gate") || "",
          status: params.get("status") || ""
        };
      }

      function updateHash(f) {
        var params = new URLSearchParams();
        if (f.text) params.set("text", f.text);
        if (f.suite) params.set("suite", f.suite);
        if (f.diff) params.set("diff", f.diff);
        if (f.sort && f.sort !== "case_id") params.set("sort", f.sort);
        if (f.risk) params.set("risk", f.risk);
        if (f.gate) params.set("gate", f.gate);
        if (f.status) params.set("status", f.status);
        var next = params.toString();
        window.location.hash = next ? "?" + next : "";
      }

      function loadSavedFilters() {
        if (!savedFilters) return;
        savedFilters.innerHTML = "";
        var rawSaved = null;
        try { rawSaved = window.localStorage.getItem("pvip_saved_filters"); } catch (e) { rawSaved = null; }
        if (!rawSaved) {
          var empty = document.createElement("div");
          empty.className = "muted";
          empty.textContent = ui.noSavedFiltersBlocked;
          savedFilters.appendChild(empty);
          return;
        }
        var list = [];
        try { list = JSON.parse(rawSaved) || []; } catch (e) { list = []; }
        if (!Array.isArray(list) || list.length === 0) {
          var empty2 = document.createElement("div");
          empty2.className = "muted";
          empty2.textContent = ui.noSavedFilters;
          savedFilters.appendChild(empty2);
          return;
        }
        list.forEach(function(it, idx) {
          var row = document.createElement("div");
          row.className = "savedItem";
          var btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = it.name || (ui.savedFilterPrefix + " " + (idx + 1));
          btn.onclick = function() {
            setFilters(it.filters || {});
            applyFilters({ preservePage: false });
          };
          var del = document.createElement("button");
          del.className = "btn";
          del.textContent = ui.removeButton;
          del.onclick = function() {
            var next = list.slice();
            next.splice(idx, 1);
            try { window.localStorage.setItem("pvip_saved_filters", JSON.stringify(next)); } catch (e) {}
            loadSavedFilters();
          };
          var name = document.createElement("div");
          name.className = "name";
          name.textContent = it.name || "";
          row.appendChild(btn);
          row.appendChild(del);
          row.appendChild(name);
          savedFilters.appendChild(row);
        });
      }

      function sortRows(entries, f) {
        var arr = entries.slice();
        var orderRisk = { low: 0, medium: 1, high: 2 };
        var orderGate = { none: 0, require_approval: 1, block: 2 };
        var orderDiff = { regression: 0, improvement: 1, same: 2 };
        arr.sort(function (a, b) {
          var aCase = String(a.case_id || "");
          var bCase = String(b.case_id || "");
          var aSuite = String(a.suite || "");
          var bSuite = String(b.suite || "");
          var aRisk = String(a.risk || "");
          var bRisk = String(b.risk || "");
          var aGate = String(a.gate || "");
          var bGate = String(b.gate || "");
          var aDiff = String(a.diff || "");
          var bDiff = String(b.diff || "");
          var aTs = Number(a.ts || 0);
          var bTs = Number(b.ts || 0);
          switch (f.sort) {
            case "risk":
              return (orderRisk[aRisk] ?? 9) - (orderRisk[bRisk] ?? 9) || aCase.localeCompare(bCase);
            case "gate":
              return (orderGate[aGate] ?? 9) - (orderGate[bGate] ?? 9) || aCase.localeCompare(bCase);
            case "diff":
              return (orderDiff[aDiff] ?? 9) - (orderDiff[bDiff] ?? 9) || aCase.localeCompare(bCase);
            case "suite":
              return aSuite.localeCompare(bSuite) || aCase.localeCompare(bCase);
            case "time_desc":
              return bTs - aTs || aCase.localeCompare(bCase);
            case "time_asc":
              return aTs - bTs || aCase.localeCompare(bCase);
            default:
              return aCase.localeCompare(bCase);
          }
        });
        return arr;
      }

      function hydrateManifestLinks() {
        if (!manifestMap || manifestMap.size === 0) return;
        var links = document.querySelectorAll("a[data-manifest-key]");
        for (var j = 0; j < links.length; j++) {
          var a = links[j];
          var key = a.getAttribute("data-manifest-key");
          if (!key) continue;
          var href = manifestMap.get(key);
          if (href) {
            a.setAttribute("href", href);
          } else {
            a.classList.add("muted");
            a.removeAttribute("href");
          }
        }
      }

      function renderPage(sorted, totalFiltered) {
        var size = pageSize ? Number(pageSize.value || 50) : 50;
        if (!Number.isFinite(size) || size <= 0) size = 50;
        var totalPages = Math.max(1, Math.ceil(sorted.length / size));
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        var start = (currentPage - 1) * size;
        var pageRows = sorted.slice(start, start + size);

        if (pageInfo) {
          if (totalFiltered === 0) pageInfo.textContent = ui.pageEmpty;
          else pageInfo.textContent = format(ui.pageRendering, { count: pageRows.length });
        }
        if (!casesBody) return;
        renderJobId += 1;
        var thisJob = renderJobId;

        if (pageRows.length === 0) {
          casesBody.innerHTML = "";
          hydrateManifestLinks();
          if (pageInfo) pageInfo.textContent = ui.pageEmpty;
          return;
        }

        casesBody.innerHTML = '<tr><td colspan="10" class="muted">' + ui.rowsRendering + '</td></tr>';
        var index = 0;

        function renderChunk() {
          if (thisJob !== renderJobId) return;
          if (index === 0) casesBody.innerHTML = "";
          var end = Math.min(index + RENDER_CHUNK_SIZE, pageRows.length);
          if (pageInfo) {
            var largeHint = pageRows.length >= LARGE_REPORT_ROWS ? " · " + ui.largeReportMode : "";
            pageInfo.textContent = format(ui.pageCounter, { current: currentPage, total: totalPages }) + largeHint;
          }
          var chunkHtml = "";
          while (index < end) {
            chunkHtml += pageRows[index].row_html || "";
            index += 1;
          }
          casesBody.insertAdjacentHTML("beforeend", chunkHtml);
          hydrateManifestLinks();
          if (index < pageRows.length) {
            window.requestAnimationFrame(renderChunk);
          }
        }

        window.requestAnimationFrame(renderChunk);
      }

      function applyFilters(options) {
        options = options || {};
        var preservePage = options.preservePage === true;
        var f = getFilters();
        updateHash(f);
        var needle = String(f.text || "").trim().toLowerCase();
        var filtered = rowsData.filter(function (entry) {
          if (needle) {
            var hay = String(entry.case_id || "") + " " + String(entry.title || "");
            if (hay.toLowerCase().indexOf(needle) === -1) return false;
          }
          if (f.suite && entry.suite !== f.suite) return false;
          if (f.diff && entry.diff !== f.diff) return false;
          if (f.risk && entry.risk !== f.risk) return false;
          if (f.gate && entry.gate !== f.gate) return false;
          if (f.status && entry.status !== f.status) return false;
          return true;
        });
        var sorted = sortRows(filtered, f);
        if (!preservePage) currentPage = 1;
        renderPage(sorted, filtered.length);
        if (filterCount) {
          filterCount.textContent = format(ui.showingCount, { filtered: filtered.length, total: rowsData.length });
        }
        syncSuiteTabs();
      }

      if (filterText) {
        filterText.addEventListener("input", function () {
          if (textFilterDebounceTimer) window.clearTimeout(textFilterDebounceTimer);
          textFilterDebounceTimer = window.setTimeout(function () {
            applyFilters({ preservePage: false });
          }, 120);
        });
      }
      if (filterSuite) filterSuite.addEventListener("change", function () { applyFilters({ preservePage: false }); });
      if (filterDiff) filterDiff.addEventListener("change", function () { applyFilters({ preservePage: false }); });
      if (filterSort) filterSort.addEventListener("change", function () { applyFilters({ preservePage: false }); });
      if (filterRisk) filterRisk.addEventListener("change", function () { applyFilters({ preservePage: false }); });
      if (filterGate) filterGate.addEventListener("change", function () { applyFilters({ preservePage: false }); });
      if (filterStatus) filterStatus.addEventListener("change", function () { applyFilters({ preservePage: false }); });
      if (pageSize) {
        pageSize.addEventListener("change", function () {
          currentPage = 1;
          applyFilters({ preservePage: true });
        });
      }
      if (pagePrev) {
        pagePrev.addEventListener("click", function () {
          currentPage -= 1;
          applyFilters({ preservePage: true });
        });
      }
      if (pageNext) {
        pageNext.addEventListener("click", function () {
          currentPage += 1;
          applyFilters({ preservePage: true });
        });
      }

      var suiteButtons = document.querySelectorAll(".suiteBtn");
      for (var k = 0; k < suiteButtons.length; k++) {
        suiteButtons[k].addEventListener("click", function (e) {
          var btn = e.currentTarget;
          var value = btn && btn.getAttribute("data-suite");
          if (filterSuite) filterSuite.value = value || "";
          applyFilters({ preservePage: false });
        });
      }

      function syncSuiteTabs() {
        if (!suiteButtons) return;
        var suite = filterSuite ? filterSuite.value || "" : "";
        for (var m = 0; m < suiteButtons.length; m++) {
          var btn = suiteButtons[m];
          var value = btn.getAttribute("data-suite") || "";
          if (value === suite) btn.classList.add("active");
          else btn.classList.remove("active");
        }
      }

      if (copyFilterLink) {
        copyFilterLink.addEventListener("click", function () {
          var link = window.location.href;
          navigator.clipboard.writeText(link).then(function () {
            copyFilterLink.textContent = ui.copiedButton;
            setTimeout(function () { copyFilterLink.textContent = ui.copyFilterLinkButton; }, 1200);
          }).catch(function () {
            window.prompt(ui.copyPrompt, link);
          });
        });
      }

      if (saveFilters) {
        saveFilters.addEventListener("click", function () {
          var name = window.prompt(ui.savePrompt) || "";
          var f = getFilters();
          var rawSaved = null;
          try { rawSaved = window.localStorage.getItem("pvip_saved_filters"); } catch (e) { rawSaved = null; }
          var list = [];
          try { list = rawSaved ? JSON.parse(rawSaved) || [] : []; } catch (e) { list = []; }
          if (!Array.isArray(list)) list = [];
          list.push({ name: name.trim() || (ui.savedFilterPrefix + " " + (list.length + 1)), filters: f });
          try { window.localStorage.setItem("pvip_saved_filters", JSON.stringify(list)); } catch (e) {}
          loadSavedFilters();
        });
      }

      if (resetFilters) {
        resetFilters.addEventListener("click", function () {
          setFilters({ text: "", suite: "", diff: "", sort: "case_id", risk: "", gate: "", status: "" });
          updateHash({ text: "", suite: "", diff: "", sort: "case_id", risk: "", gate: "", status: "" });
          applyFilters({ preservePage: false });
        });
      }

      try {
        window.localStorage.setItem("__aq_probe__", "1");
        window.localStorage.removeItem("__aq_probe__");
      } catch (e) {
        var warn = document.getElementById("localStorageWarning");
        if (warn) warn.style.display = "block";
      }

      setFilters(parseHash() || {});
      loadSavedFilters();
      applyFilters({ preservePage: false });
    })();`;
}
