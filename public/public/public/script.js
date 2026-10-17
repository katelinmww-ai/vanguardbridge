const taskForm = document.querySelector("#task-form");
const problemInput = document.querySelector("#problem");
const characterCount = document.querySelector("#character-count");
const generateButton = document.querySelector("#generate-button");
const buttonLabel = document.querySelector("#button-label");
const buttonIcon = document.querySelector("#button-icon");
const formStatus = document.querySelector("#form-status");
const resultsSection = document.querySelector("#task-results");
const generatedTask = document.querySelector("#generated-task");
const copyButton = document.querySelector("#copy-task");

document.querySelector("#current-year").textContent =
  new Date().getFullYear();

const mobileMenuButton = document.querySelector("#mobile-menu");
const navLinks = document.querySelector(".nav-links");

mobileMenuButton.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
  mobileMenuButton.textContent = isOpen ? "✕" : "☰";
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    mobileMenuButton.setAttribute("aria-expanded", "false");
    mobileMenuButton.textContent = "☰";
  });
});

problemInput.addEventListener("input", () => {
  characterCount.textContent = `${problemInput.value.length} / 3000`;
});

function setStatus(message, type = "") {
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`.trim();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(amount) + " VND";
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;
}

function createList(items, ordered = false) {
  const list = document.createElement(ordered ? "ol" : "ul");

  items.forEach((item) => {
    list.appendChild(createElement("li", "", item));
  });

  return list;
}

function renderTask(task) {
  generatedTask.replaceChildren();

  const meta = createElement("div", "task-meta");
  meta.appendChild(createElement("span", "task-tag", task.industry || "Business challenge"));
  meta.appendChild(createElement("span", "task-tag", `${task.estimatedHours} estimated hours`));
  meta.appendChild(createElement("span", "task-tag", formatCurrency(task.rewardVND)));

  generatedTask.appendChild(meta);
  generatedTask.appendChild(createElement("h3", "", task.title));
  generatedTask.appendChild(createElement("p", "task-summary", task.summary));

  const columns = createElement("div", "task-columns");

  const deliverablesColumn = document.createElement("div");
  deliverablesColumn.appendChild(createElement("h4", "", "Expected Deliverables"));
  deliverablesColumn.appendChild(createList(task.deliverables));

  const criteriaColumn = document.createElement("div");
  criteriaColumn.appendChild(createElement("h4", "", "Evaluation Criteria"));
  criteriaColumn.appendChild(createList(task.criteria));

  columns.append(deliverablesColumn, criteriaColumn);
  generatedTask.appendChild(columns);

  if (Array.isArray(task.firstSteps) && task.firstSteps.length) {
    const firstSteps = document.createElement("div");
    firstSteps.className = "task-columns";

    const stepsContent = document.createElement("div");
    stepsContent.appendChild(createElement("h4", "", "Suggested First Steps"));
    stepsContent.appendChild(createList(task.firstSteps, true));

    firstSteps.appendChild(stepsContent);
    generatedTask.appendChild(firstSteps);
  }

  if (task.aiNote) {
    generatedTask.appendChild(
      createElement("p", "task-notice", `AI note: ${task.aiNote}`)
    );
  }

  resultsSection.hidden = false;
}

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(taskForm);

  const payload = {
    company: String(formData.get("company") || "").trim(),
    industry: String(formData.get("industry") || "").trim(),
    problem: String(formData.get("problem") || "").trim(),
    reward: Number(formData.get("reward"))
  };

  if (payload.problem.length < 20) {
    setStatus("Please describe the business problem in at least 20 characters.", "error");
    problemInput.focus();
    return;
  }

  if (!payload.industry) {
    setStatus("Please select a business area.", "error");
    return;
  }

  if (!Number.isFinite(payload.reward) || payload.reward < 0) {
    setStatus("Please enter a valid task reward.", "error");
    return;
  }

  generateButton.disabled = true;
  buttonLabel.textContent = "AI is designing your task...";
  buttonIcon.textContent = "◌";
  setStatus("Connecting to the AI task designer. This may take a few seconds.");
  resultsSection.hidden = true;

  try {
    const response = await fetch("/api/generate-task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || `The AI service returned an error (${response.status}).`
      );
    }

    if (
      !data.title ||
      !data.summary ||
      !Array.isArray(data.deliverables) ||
      !Array.isArray(data.criteria) ||
      !Number.isFinite(data.estimatedHours) ||
      !Number.isFinite(data.rewardVND)
    ) {
      throw new Error("The AI returned an incomplete task. Please try again.");
    }

    renderTask(data);
    setStatus("Task generated successfully. Review the draft before publishing.", "success");
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("Task generation error:", error);

    setStatus(
      error.message ||
        "Unable to connect to the AI service. Check the server and try again.",
      "error"
    );
  } finally {
    generateButton.disabled = false;
    buttonLabel.textContent = "Generate Task with AI";
    buttonIcon.textContent = "✳";
  }
});

copyButton.addEventListener("click", async () => {
  const taskTitle = generatedTask.querySelector("h3")?.textContent || "";
  const taskSummary = generatedTask.querySelector(".task-summary")?.textContent || "";
  const columns = [...generatedTask.querySelectorAll(".task-columns")];

  const sections = [
    `TASK: ${taskTitle}`,
    "",
    taskSummary
  ];

  columns.forEach((column) => {
    const heading = column.querySelector("h4")?.textContent || "";
    const items = [...column.querySelectorAll("li")].map(
      (item, index) => `${index + 1}. ${item.textContent}`
    );

    if (heading && items.length) {
      sections.push("", heading, ...items);
    }
  });

  const taskNotice = generatedTask.querySelector(".task-notice");

  if (taskNotice) {
    sections.push("", taskNotice.textContent);
  }

  try {
    await navigator.clipboard.writeText(sections.join("\n"));
    copyButton.textContent = "Copied!";
    window.setTimeout(() => {
      copyButton.textContent = "Copy Task";
    }, 1800);
  } catch (error) {
    console.error("Clipboard error:", error);
    copyButton.textContent = "Copy unavailable";
    window.setTimeout(() => {
      copyButton.textContent = "Copy Task";
    }, 1800);
  }
});
