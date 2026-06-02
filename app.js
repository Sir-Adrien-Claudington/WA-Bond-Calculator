// NO API KEYS, TOKENS OR CREDENTIALS BELONG IN THIS FILE
//
// WA Rental Bond Claim Calculator
// Static, in-browser only. No backend, no storage, no transmission.
// All calculation logic is encapsulated in an IIFE to keep it out of global scope.

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // STATUTORY RULES (frozen so they cannot be mutated at runtime via console)
  // Source: Residential Tenancies Act 1987 (WA) as amended by the
  // Residential Tenancies Amendment Act 2024 (WA).
  // ---------------------------------------------------------------------------
  const WA_BOND_RULES = Object.freeze({
    // Maximum security bond = 4 weeks' rent for standard residential tenancies.
    // Residential Tenancies Act 1987 (WA) s 29 (bond limit).
    MAX_BOND_WEEKS_OF_RENT: 4,

    // Pet bond capped at $350 total per tenancy, applicable to fumigation
    // or pet-related damage. Residential Tenancies Act 1987 (WA) as amended
    // by the Residential Tenancies Amendment Act 2024 (WA).
    PET_BOND_CAP: 350,

    // Bond must be lodged with the Bond Administrator within 14 days of receipt.
    // Residential Tenancies Act 1987 (WA) s 29 (lodgement obligation).
    BOND_LODGEMENT_DEADLINE_DAYS: 14,

    // Application for Disposal of Security Bond is made on Form 6.
    DISPOSAL_FORM: "Form 6",

    // Days per week, used to convert unpaid-rent weeks+days into a dollar figure.
    DAYS_PER_WEEK: 7,

    LEGISLATION: "Residential Tenancies Act 1987 (WA)",
    AMENDMENT: "Residential Tenancies Amendment Act 2024 (WA)",
    DISPUTE_BODY: "State Administrative Tribunal of Western Australia (SAT)"
  });

  // Session export limits — frozen so they cannot be relaxed via the console.
  const EXPORT_LIMITS = Object.freeze({
    MAX_PER_SESSION: 10,
    COOLDOWN_MS: 8000
  });

  // ---------------------------------------------------------------------------
  // VALIDATION HELPERS (pure functions)
  // ---------------------------------------------------------------------------

  // Returns true only for finite, non-negative numbers. Rejects NaN, negatives,
  // and non-numeric values. Used for every dollar/number input.
  function isValidNonNegativeNumber(value) {
    return typeof value === "number" && isFinite(value) && value >= 0;
  }

  // Parses a raw string into a number, rejecting anything that contains
  // characters not expected in a plain dollar amount (digits and one dot).
  // Returns null if invalid so callers can surface an error.
  function parseDollarInput(rawValue) {
    if (typeof rawValue !== "string") {
      return null;
    }
    const trimmed = rawValue.trim();
    if (trimmed === "") {
      return 0;
    }
    // Reject anything other than digits and a single decimal point.
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      return null;
    }
    const parsed = Number(trimmed);
    return isValidNonNegativeNumber(parsed) ? parsed : null;
  }

  // Parses an integer field (weeks, days). Returns null on invalid input.
  function parseIntegerInput(rawValue) {
    if (typeof rawValue !== "string") {
      return null;
    }
    const trimmed = rawValue.trim();
    if (trimmed === "") {
      return 0;
    }
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const parsed = Number(trimmed);
    return isValidNonNegativeNumber(parsed) ? parsed : null;
  }

  // Detects HTML tags, script tags, or unexpected special characters in a
  // free-text description. Returns true if the text is safe to render.
  function isSafeDescription(text) {
    if (typeof text !== "string") {
      return false;
    }
    // Reject angle brackets and other markup-significant characters outright.
    return !/[<>{}$`\\]|script|javascript:/i.test(text);
  }

  // ---------------------------------------------------------------------------
  // CALCULATION FUNCTIONS (pure, no side effects)
  // ---------------------------------------------------------------------------

  // Maximum allowable bond under WA law: weekly rent x 4.
  // Residential Tenancies Act 1987 (WA) s 29.
  function calculateMaximumBond(weeklyRent) {
    return weeklyRent * WA_BOND_RULES.MAX_BOND_WEEKS_OF_RENT;
  }

  // Converts unpaid rent expressed as weeks + days into a dollar amount,
  // pro-rating partial weeks by the daily rate (weekly rent / 7).
  function calculateUnpaidRent(weeklyRent, weeks, days) {
    const dailyRate = weeklyRent / WA_BOND_RULES.DAYS_PER_WEEK;
    return (weeks * weeklyRent) + (days * dailyRate);
  }

  // Sums all itemised deductions into a single total claim figure.
  function calculateTotalClaim(deductions) {
    return (
      deductions.unpaidRent +
      deductions.cleaning +
      deductions.damage +
      deductions.keys +
      deductions.other +
      deductions.petBond
    );
  }

  // Determines the financial outcome: surplus returned to tenant, or shortfall
  // the landlord must pursue via SAT.
  function calculateOutcome(totalClaim, bondHeld) {
    const difference = bondHeld - totalClaim;
    if (difference >= 0) {
      return { type: "surplus", amount: difference };
    }
    return { type: "shortfall", amount: Math.abs(difference) };
  }

  // ---------------------------------------------------------------------------
  // DOM REFERENCES
  // ---------------------------------------------------------------------------
  const form = document.getElementById("wabcc-form");
  const outputSection = document.getElementById("wabcc-output");
  const bondWarning = document.getElementById("wabcc-bond-warning");
  const petWarning = document.getElementById("wabcc-pet-warning");
  const otherDescriptionField = document.getElementById("wabcc-other-description");

  // ---------------------------------------------------------------------------
  // SESSION STATE (all in closure — not accessible from the global scope)
  // ---------------------------------------------------------------------------
  let exportCount = 0;
  let lastExportTime = 0;
  let lastCalculatedData = null;

  // ---------------------------------------------------------------------------
  // CURRENCY FORMATTING
  // ---------------------------------------------------------------------------
  function formatCurrency(amount) {
    return "$" + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // ---------------------------------------------------------------------------
  // LIVE INPUT WARNINGS (bond cap and pet bond cap)
  // ---------------------------------------------------------------------------

  // Warns inline if the bond held exceeds 4 weeks' rent (WA s 29).
  function updateBondWarning() {
    const weeklyRent = parseDollarInput(document.getElementById("wabcc-weekly-rent").value);
    const bondHeld = parseDollarInput(document.getElementById("wabcc-bond-held").value);
    if (weeklyRent === null || bondHeld === null || weeklyRent === 0) {
      bondWarning.textContent = "";
      return;
    }
    const maxBond = calculateMaximumBond(weeklyRent);
    if (bondHeld > maxBond) {
      bondWarning.textContent =
        "Warning: bond held (" + formatCurrency(bondHeld) +
        ") exceeds the WA maximum of 4 weeks' rent (" + formatCurrency(maxBond) +
        "). Under the Residential Tenancies Act 1987 (WA) s 29 a landlord may not require more than 4 weeks' rent as bond.";
    } else {
      bondWarning.textContent = "";
    }
  }

  // Warns inline if pet bond exceeds the $260 statutory cap.
  function updatePetWarning() {
    const petBond = parseDollarInput(document.getElementById("wabcc-pet-bond").value);
    if (petBond === null) {
      petWarning.textContent = "";
      return;
    }
    if (petBond > WA_BOND_RULES.PET_BOND_CAP) {
      petWarning.textContent =
        "Warning: pet bond is capped at " + formatCurrency(WA_BOND_RULES.PET_BOND_CAP) +
        " total under WA law and may only be applied to fumigation or pet-related damage costs. The excess is not claimable.";
    } else {
      petWarning.textContent = "";
    }
  }

  // ---------------------------------------------------------------------------
  // FORM COLLECTION + VALIDATION
  // ---------------------------------------------------------------------------

  // Reads every field, validates it, and returns either { ok: true, data }
  // or { ok: false, errors: [...] }. No side effects on the DOM.
  function collectAndValidate() {
    const errors = [];

    const userTypeInput = document.querySelector('input[name="wabcc-user-type"]:checked');
    const userType = userTypeInput ? userTypeInput.value : null;
    if (userType !== "landlord" && userType !== "tenant") {
      errors.push("Please select whether you are a landlord or a tenant.");
    }

    const weeklyRent = parseDollarInput(document.getElementById("wabcc-weekly-rent").value);
    if (weeklyRent === null) {
      errors.push("Weekly rent must be a valid non-negative dollar amount.");
    } else if (weeklyRent === 0) {
      errors.push("Weekly rent must be greater than zero.");
    }

    const bondHeld = parseDollarInput(document.getElementById("wabcc-bond-held").value);
    if (bondHeld === null) {
      errors.push("Bond held must be a valid non-negative dollar amount.");
    }

    const unpaidWeeks = parseIntegerInput(document.getElementById("wabcc-unpaid-weeks").value);
    if (unpaidWeeks === null) {
      errors.push("Unpaid rent weeks must be a whole non-negative number.");
    }

    const unpaidDays = parseIntegerInput(document.getElementById("wabcc-unpaid-days").value);
    if (unpaidDays === null) {
      errors.push("Unpaid rent days must be a whole non-negative number.");
    } else if (unpaidDays !== null && unpaidDays > 6) {
      errors.push("Unpaid rent days must be between 0 and 6 (use weeks for 7+ days).");
    }

    const cleaning = parseDollarInput(document.getElementById("wabcc-cleaning").value);
    if (cleaning === null) {
      errors.push("Cleaning must be a valid non-negative dollar amount.");
    }

    const damage = parseDollarInput(document.getElementById("wabcc-damage").value);
    if (damage === null) {
      errors.push("Damage must be a valid non-negative dollar amount.");
    }

    const keys = parseDollarInput(document.getElementById("wabcc-keys").value);
    if (keys === null) {
      errors.push("Replacement of keys/remotes/access devices must be a valid non-negative dollar amount.");
    }

    const other = parseDollarInput(document.getElementById("wabcc-other").value);
    if (other === null) {
      errors.push("Other deduction must be a valid non-negative dollar amount.");
    }

    const otherDescription = otherDescriptionField.value.trim();
    if (other !== null && other > 0 && otherDescription === "") {
      errors.push("A description is required when an 'Other' deduction is entered.");
    }
    if (otherDescription !== "" && !isSafeDescription(otherDescription)) {
      errors.push("The 'Other' description contains characters that are not allowed.");
    }

    let petBond = parseDollarInput(document.getElementById("wabcc-pet-bond").value);
    if (petBond === null) {
      errors.push("Pet bond must be a valid non-negative dollar amount.");
    } else if (petBond > WA_BOND_RULES.PET_BOND_CAP) {
      // Cap the claimable pet bond at the statutory maximum.
      petBond = WA_BOND_RULES.PET_BOND_CAP;
    }

    if (errors.length > 0) {
      return { ok: false, errors: errors };
    }

    const unpaidRent = calculateUnpaidRent(weeklyRent, unpaidWeeks, unpaidDays);

    return {
      ok: true,
      data: {
        userType: userType,
        weeklyRent: weeklyRent,
        bondHeld: bondHeld,
        otherDescription: otherDescription,
        deductions: {
          unpaidRent: unpaidRent,
          cleaning: cleaning,
          damage: damage,
          keys: keys,
          other: other,
          petBond: petBond
        }
      }
    };
  }

  // ---------------------------------------------------------------------------
  // SAFE DOM RENDERING (textContent only, never innerHTML)
  // ---------------------------------------------------------------------------

  // Builds a single labelled line element safely using textContent.
  function buildLine(labelText, valueText) {
    const row = document.createElement("div");
    row.className = "wabcc-result-row";
    const label = document.createElement("span");
    label.className = "wabcc-result-label";
    label.textContent = labelText;
    const value = document.createElement("span");
    value.className = "wabcc-result-value";
    value.textContent = valueText;
    row.appendChild(label);
    row.appendChild(value);
    return row;
  }

  function buildHeading(text) {
    const heading = document.createElement("h3");
    heading.className = "wabcc-result-heading";
    heading.textContent = text;
    return heading;
  }

  function buildParagraph(text) {
    const paragraph = document.createElement("p");
    paragraph.className = "wabcc-result-paragraph";
    paragraph.textContent = text;
    return paragraph;
  }

  // Renders the "What happens next" guidance, tailored to landlord vs tenant.
  // References Form 6 and SAT per WA disposal process.
  function buildNextSteps(userType, outcome) {
    const wrapper = document.createElement("div");
    wrapper.className = "wabcc-next-steps";
    wrapper.appendChild(buildHeading("What happens next"));

    if (userType === "landlord") {
      wrapper.appendChild(buildParagraph(
        "As the landlord, to claim against the bond you must lodge a " +
        WA_BOND_RULES.DISPOSAL_FORM + " (Application for Disposal of Security Bond) with the Bond Administrator. " +
        "All claimed deductions must be supported by evidence (receipts, quotes, condition reports, photos)."
      ));
      if (outcome.type === "shortfall") {
        wrapper.appendChild(buildParagraph(
          "Your claim exceeds the bond held by " + formatCurrency(outcome.amount) +
          ". The bond cannot cover this excess. To recover the shortfall you must apply separately to the " +
          WA_BOND_RULES.DISPUTE_BODY + "."
        ));
      } else {
        wrapper.appendChild(buildParagraph(
          "After your claimed deductions, " + formatCurrency(outcome.amount) +
          " must be returned to the tenant. If the tenant disputes your claim, the matter is decided by the " +
          WA_BOND_RULES.DISPUTE_BODY + "."
        ));
      }
    } else {
      wrapper.appendChild(buildParagraph(
        "As the tenant, the landlord must lodge a " + WA_BOND_RULES.DISPOSAL_FORM +
        " to dispose of the bond. You may agree to the proposed deductions or dispute them."
      ));
      if (outcome.type === "shortfall") {
        wrapper.appendChild(buildParagraph(
          "The claimed deductions exceed the bond by " + formatCurrency(outcome.amount) +
          ". The landlord can only retain up to the bond amount from the bond itself, and must pursue any further amount through the " +
          WA_BOND_RULES.DISPUTE_BODY + ". You are entitled to dispute the claim there."
        ));
      } else {
        wrapper.appendChild(buildParagraph(
          "Based on these figures you should receive " + formatCurrency(outcome.amount) +
          " back. If you disagree with any deduction, you can dispute it through the " +
          WA_BOND_RULES.DISPUTE_BODY + "."
        ));
      }
    }
    return wrapper;
  }

  // Renders the full output section from validated data. Clears prior output
  // first, then appends freshly built, safe elements.
  function renderOutput(data) {
    const totalClaim = calculateTotalClaim(data.deductions);
    const outcome = calculateOutcome(totalClaim, data.bondHeld);
    const maxBond = calculateMaximumBond(data.weeklyRent);

    // Clear previous output safely.
    while (outputSection.firstChild) {
      outputSection.removeChild(outputSection.firstChild);
    }

    outputSection.appendChild(buildHeading("Itemised deduction breakdown"));
    outputSection.appendChild(buildLine("Unpaid rent", formatCurrency(data.deductions.unpaidRent)));
    outputSection.appendChild(buildLine("Cleaning", formatCurrency(data.deductions.cleaning)));
    outputSection.appendChild(buildLine("Damage (excluding fair wear and tear)", formatCurrency(data.deductions.damage)));
    outputSection.appendChild(buildLine("Keys / remotes / access devices", formatCurrency(data.deductions.keys)));
    const otherLabel = data.deductions.other > 0
      ? "Other: " + data.otherDescription
      : "Other";
    outputSection.appendChild(buildLine(otherLabel, formatCurrency(data.deductions.other)));
    outputSection.appendChild(buildLine("Pet bond (fumigation / pet-related damage)", formatCurrency(data.deductions.petBond)));

    outputSection.appendChild(buildHeading("Summary"));
    outputSection.appendChild(buildLine("Total claimed", formatCurrency(totalClaim)));
    outputSection.appendChild(buildLine("Bond held", formatCurrency(data.bondHeld)));
    outputSection.appendChild(buildLine("Maximum lawful bond (4 weeks' rent)", formatCurrency(maxBond)));

    if (data.bondHeld > maxBond) {
      outputSection.appendChild(buildParagraph(
        "Note: the bond held exceeds the lawful maximum of 4 weeks' rent under the " +
        WA_BOND_RULES.LEGISLATION + " s 29."
      ));
    }

    if (outcome.type === "surplus") {
      const surplusRow = buildLine("Surplus returned to tenant", formatCurrency(outcome.amount));
      surplusRow.classList.add("wabcc-result-surplus");
      outputSection.appendChild(surplusRow);
    } else {
      const shortfallRow = buildLine("Shortfall owed by tenant", formatCurrency(outcome.amount));
      shortfallRow.classList.add("wabcc-result-shortfall");
      outputSection.appendChild(shortfallRow);
      outputSection.appendChild(buildParagraph(
        "The total claim exceeds the bond held. The bond cannot cover the shortfall of " +
        formatCurrency(outcome.amount) + ". The landlord must pursue the excess through the " +
        WA_BOND_RULES.DISPUTE_BODY + "."
      ));
    }

    outputSection.appendChild(buildNextSteps(data.userType, outcome));
    lastCalculatedData = { userData: data, totalClaim: totalClaim, outcome: outcome };
    showExportButton();
    outputSection.style.setProperty("display", "block", "important");
  }

  // Renders a validation error list safely.
  function renderErrors(errors) {
    lastCalculatedData = null;
    hideExportButton();
    while (outputSection.firstChild) {
      outputSection.removeChild(outputSection.firstChild);
    }
    outputSection.appendChild(buildHeading("Please fix the following before calculating"));
    const list = document.createElement("ul");
    list.className = "wabcc-error-list";
    errors.forEach(function (message) {
      const item = document.createElement("li");
      item.textContent = message;
      list.appendChild(item);
    });
    outputSection.appendChild(list);
    outputSection.style.setProperty("display", "block", "important");
  }

  // ---------------------------------------------------------------------------
  // PDF EXPORT — session limiter, button management, generation
  // ---------------------------------------------------------------------------

  // Updates the export button label and enabled state based on session counters.
  function updateExportButtonState() {
    const btn = document.getElementById("wabcc-export-btn");
    if (!btn) {
      return;
    }
    const remaining = EXPORT_LIMITS.MAX_PER_SESSION - exportCount;
    const msSinceLast = Date.now() - lastExportTime;

    if (exportCount >= EXPORT_LIMITS.MAX_PER_SESSION) {
      btn.disabled = true;
      btn.textContent = "Export limit reached for this session";
      return;
    }
    if (msSinceLast < EXPORT_LIMITS.COOLDOWN_MS) {
      const secondsLeft = Math.ceil((EXPORT_LIMITS.COOLDOWN_MS - msSinceLast) / 1000);
      btn.disabled = true;
      btn.textContent = "Please wait " + secondsLeft + "s before exporting again…";
      setTimeout(updateExportButtonState, 1000);
      return;
    }
    btn.disabled = false;
    btn.textContent = "Export as PDF (" + remaining + " remaining this session)";
  }

  // Creates the export button on first call, re-uses it on subsequent renders.
  function showExportButton() {
    let btn = document.getElementById("wabcc-export-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "wabcc-export-btn";
      btn.className = "wabcc-export-btn";
      btn.type = "button";
      btn.addEventListener("click", handleExportClick);
      outputSection.appendChild(btn);
    }
    btn.style.removeProperty("display");
    updateExportButtonState();
  }

  // Hides the export button without removing it from the DOM.
  function hideExportButton() {
    const btn = document.getElementById("wabcc-export-btn");
    if (btn) {
      btn.style.display = "none";
    }
  }

  // Builds and downloads a PDF of the calculation result entirely in the browser.
  // No data is sent anywhere — jsPDF triggers a direct client-side download.
  // Enforces session export limit and per-export cooldown before generating.
  function generatePdf() {
    if (!lastCalculatedData) {
      return;
    }
    if (exportCount >= EXPORT_LIMITS.MAX_PER_SESSION) {
      updateExportButtonState();
      return;
    }
    if (Date.now() - lastExportTime < EXPORT_LIMITS.COOLDOWN_MS) {
      updateExportButtonState();
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      return;
    }

    const { userData, totalClaim, outcome } = lastCalculatedData;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let cy = 20;

    const exportDate = new Date().toLocaleDateString("en-AU", {
      day: "2-digit", month: "long", year: "numeric"
    });

    function breakPage(spaceNeeded) {
      if (cy + spaceNeeded > 275) {
        doc.addPage();
        cy = 20;
      }
    }

    function addHeading(text) {
      breakPage(12);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 58, 107);
      doc.text(text, margin, cy);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      cy += 7;
    }

    function addRow(labelText, valueText, bold) {
      const labelLines = doc.splitTextToSize(labelText, contentWidth - 35);
      breakPage(labelLines.length * 5 + 4);
      doc.setFontSize(10);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(labelLines, margin, cy);
      doc.text(valueText, pageWidth - margin, cy, { align: "right" });
      doc.setFont("helvetica", "normal");
      cy += labelLines.length * 5 + 2;
    }

    function addNote(text) {
      const lines = doc.splitTextToSize(text, contentWidth);
      breakPage(lines.length * 4.5 + 3);
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      doc.text(lines, margin, cy);
      doc.setTextColor(0, 0, 0);
      cy += lines.length * 4.5 + 2;
    }

    // Title block
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 58, 107);
    doc.text("WA Rental Bond Claim Calculator", margin, cy);
    doc.setTextColor(0, 0, 0);
    cy += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(WA_BOND_RULES.LEGISLATION + " · " + WA_BOND_RULES.AMENDMENT, margin, cy);
    cy += 5;
    doc.text(
      "Generated: " + exportDate + "  |  Role: " + (userData.userType === "landlord" ? "Landlord" : "Tenant"),
      margin, cy
    );
    cy += 5;
    doc.setFontSize(8);
    doc.setTextColor(30, 100, 50);
    doc.text(
      "This document was generated entirely in your browser. No data was stored or transmitted.",
      margin, cy, { maxWidth: contentWidth }
    );
    doc.setTextColor(0, 0, 0);
    cy += 9;

    // Itemised deductions
    addHeading("Itemised Deduction Breakdown");
    addRow("Unpaid rent", formatCurrency(userData.deductions.unpaidRent));
    addRow("Cleaning", formatCurrency(userData.deductions.cleaning));
    addRow("Damage (excl. fair wear and tear)", formatCurrency(userData.deductions.damage));
    addRow("Keys / remotes / access devices", formatCurrency(userData.deductions.keys));
    const otherPdfLabel = userData.deductions.other > 0 && userData.otherDescription
      ? "Other: " + userData.otherDescription
      : "Other";
    addRow(otherPdfLabel, formatCurrency(userData.deductions.other));
    addRow("Pet bond (fumigation / pet-related damage)", formatCurrency(userData.deductions.petBond));
    cy += 3;

    // Summary
    addHeading("Summary");
    addRow("Total claimed", formatCurrency(totalClaim));
    addRow("Bond held", formatCurrency(userData.bondHeld));
    addRow("Maximum lawful bond (4 weeks’ rent)", formatCurrency(calculateMaximumBond(userData.weeklyRent)));
    cy += 2;

    if (outcome.type === "surplus") {
      doc.setTextColor(30, 100, 50);
      addRow("Surplus returned to tenant", formatCurrency(outcome.amount), true);
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setTextColor(180, 40, 30);
      addRow("Shortfall owed by tenant", formatCurrency(outcome.amount), true);
      doc.setTextColor(0, 0, 0);
      addNote(
        "The total claim exceeds the bond held. The landlord may retain up to the bond amount only. " +
        "The shortfall of " + formatCurrency(outcome.amount) + " must be pursued through the " +
        WA_BOND_RULES.DISPUTE_BODY + "."
      );
    }

    if (userData.bondHeld > calculateMaximumBond(userData.weeklyRent)) {
      cy += 2;
      addNote(
        "Note: the bond held exceeds the maximum of 4 weeks’ rent under " +
        WA_BOND_RULES.LEGISLATION + " s 29."
      );
    }
    cy += 4;

    // What happens next
    addHeading("What Happens Next");
    if (userData.userType === "landlord") {
      addNote(
        "To claim against the bond, lodge " + WA_BOND_RULES.DISPOSAL_FORM +
        " (Application for Disposal of Security Bond) with the Bond Administrator. " +
        "All deductions must be supported by evidence (receipts, condition reports, photos)."
      );
      if (outcome.type === "shortfall") {
        addNote(
          "Your claim exceeds the bond held. To recover the shortfall of " +
          formatCurrency(outcome.amount) + ", apply to the " + WA_BOND_RULES.DISPUTE_BODY + "."
        );
      } else {
        addNote(
          "After your deductions, " + formatCurrency(outcome.amount) + " must be returned to the tenant. " +
          "If the tenant disputes your claim, the matter is decided by the " + WA_BOND_RULES.DISPUTE_BODY + "."
        );
      }
    } else {
      addNote(
        "The landlord must lodge " + WA_BOND_RULES.DISPOSAL_FORM +
        " to dispose of the bond. You may agree to the proposed deductions or dispute them."
      );
      if (outcome.type === "shortfall") {
        addNote(
          "The landlord can only retain up to the bond amount. The remaining shortfall must be pursued through the " +
          WA_BOND_RULES.DISPUTE_BODY + ". You are entitled to dispute any part of the claim there."
        );
      } else {
        addNote(
          "Based on these figures you should receive " + formatCurrency(outcome.amount) + " back. " +
          "If you disagree with any deduction, dispute it through the " + WA_BOND_RULES.DISPUTE_BODY + "."
        );
      }
    }
    cy += 4;

    // Disclaimer
    breakPage(22);
    doc.setDrawColor(180, 50, 50);
    doc.setLineWidth(0.4);
    doc.line(margin, cy, pageWidth - margin, cy);
    cy += 4;

    doc.setFontSize(7.5);
    doc.setTextColor(100, 40, 40);
    const disclaimerText =
      "DISCLAIMER: This tool provides a general estimate only and does not constitute legal advice. " +
      "For disputes, contact Consumer Protection WA or the " + WA_BOND_RULES.DISPUTE_BODY + ". " +
      "Rules are based on the " + WA_BOND_RULES.LEGISLATION + " and the " + WA_BOND_RULES.AMENDMENT + ". " +
      "The bond must have been lodged with the WA Bond Administrator within " +
      WA_BOND_RULES.BOND_LODGEMENT_DEADLINE_DAYS + " days of receipt. " +
      "Generated " + exportDate + ". Verify current legislation before relying on this document.";
    const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth);
    breakPage(disclaimerLines.length * 4 + 4);
    doc.text(disclaimerLines, margin, cy);
    doc.setTextColor(0, 0, 0);

    const fileName = "WA-Bond-Claim-" + exportDate.replace(/ /g, "-").replace(/,/g, "") + ".pdf";
    doc.save(fileName);

    exportCount++;
    lastExportTime = Date.now();
    updateExportButtonState();
  }

  function handleExportClick() {
    generatePdf();
  }

  // ---------------------------------------------------------------------------
  // EVENT WIRING (no inline handlers — CSP blocks those)
  // ---------------------------------------------------------------------------
  function handleSubmit(event) {
    event.preventDefault();
    const result = collectAndValidate();
    if (result.ok) {
      renderOutput(result.data);
    } else {
      renderErrors(result.errors);
    }
  }

  form.addEventListener("submit", handleSubmit);
  document.getElementById("wabcc-weekly-rent").addEventListener("input", updateBondWarning);
  document.getElementById("wabcc-bond-held").addEventListener("input", updateBondWarning);
  document.getElementById("wabcc-pet-bond").addEventListener("input", updatePetWarning);

  // ---------------------------------------------------------------------------
  // TAMPER RESISTANCE: MutationObserver restores hidden disclaimer/output
  // ---------------------------------------------------------------------------

  // Watches the disclaimer and output for style/attribute tampering and
  // restores visibility if someone hides them via DevTools.
  function guardElementVisibility(element, enforcedDisplay) {
    const observer = new MutationObserver(function () {
      const computed = window.getComputedStyle(element);
      if (computed.visibility === "hidden" || computed.opacity === "0" || computed.display === "none") {
        // Only re-show the output if it currently holds results.
        if (element.id === "wabcc-output" && !element.firstChild) {
          return;
        }
        element.style.setProperty("visibility", "visible", "important");
        element.style.setProperty("opacity", "1", "important");
        element.style.setProperty("display", enforcedDisplay, "important");
      }
    });
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["style", "class", "hidden"]
    });
  }

  const disclaimerElement = document.getElementById("wabcc-disclaimer");
  if (disclaimerElement) {
    guardElementVisibility(disclaimerElement, "block");
  }
  if (outputSection) {
    guardElementVisibility(outputSection, "block");
  }
})();
