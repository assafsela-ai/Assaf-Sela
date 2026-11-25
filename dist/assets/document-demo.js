const workflow = document.querySelector(".workflow");
const demo = workflow.querySelector(".document-demo");
const run = workflow.querySelector(".demo-run");
const review = demo.querySelector(".demo-review");
const extraction = demo.querySelector(".demo-extraction");
const form = demo.querySelector(".demo-review-form");
const correction = form.querySelector("input");
const confirm = form.querySelector(".demo-confirm");
const feedback = form.querySelector(".demo-error");
const correctionHint = form.querySelector(".demo-hint");
const success = form.querySelector(".demo-success");
const fields = Object.fromEntries(
  [...demo.querySelectorAll("[data-sample-field]")].map((field) => [
    field.dataset.sampleField,
    field.textContent.trim(),
  ])
);
// The fictional OCR result is prepared before display so it can size every panel.
const extracted = { ...fields, account: fields.account.replace("0", "O") };
for (const field of demo.querySelectorAll("[data-extracted-field]")) {
  field.textContent = extracted[field.dataset.extractedField];
}
form.querySelector("[data-original-account]").textContent = fields.account;
const modelAccount = form.querySelector("[data-model-account]");
const [beforeLetter, afterLetter] = extracted.account.split("O");
modelAccount.textContent = beforeLetter;
if (afterLetter !== undefined) {
  const mistakenLetter = document.createElement("mark");
  mistakenLetter.textContent = "O";
  modelAccount.append(mistakenLetter, afterLetter);
}
success.textContent = `Review complete. Account number ${fields.account} confirmed.`;

function openStep(step, heading) {
  const control = workflow.querySelector(`input[value="${step}"]`);
  if (!control.checked) {
    control.checked = true;
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  heading.focus();
}

function clearError() {
  correction.setAttribute("aria-invalid", "false");
  correction.setAttribute("aria-describedby", correctionHint.id);
  feedback.textContent = "";
}

function correctionError(value) {
  if (/[Oo]/.test(value)) return "Replace the letter O with 0 (zero).";
  if (!/^[0-9]{6}$/.test(value)) return "Enter the six digits shown on the bill.";
  return "That number doesn’t match. Copy the account number from the bill.";
}

run.addEventListener("click", () => {
  correction.value = "";
  correction.readOnly = false;
  confirm.hidden = false;
  success.hidden = true;
  clearError();
  extraction.hidden = false;
  form.hidden = false;
  for (const placeholder of demo.querySelectorAll(".demo-empty")) placeholder.hidden = true;
  run.textContent = "Run again";
  openStep("model", demo.querySelector("#extraction-title"));
});

review.addEventListener("click", () => {
  openStep("review", demo.querySelector("#review-title"));
});

correction.addEventListener("input", clearError);
form.noValidate = true;
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (correction.readOnly) return;

  const value = correction.value.trim();
  if (value !== fields.account) {
    correction.setAttribute("aria-invalid", "true");
    correction.setAttribute("aria-describedby", `${feedback.id} ${correctionHint.id}`);
    feedback.textContent = correctionError(value);
    correction.focus();
    return;
  }

  clearError();
  correction.value = value;
  correction.readOnly = true;
  confirm.hidden = true;
  success.hidden = false;
  success.focus();
});

run.hidden = false;
