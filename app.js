const PANTRY_STORAGE_KEY = "ecoSnap.pantry.v1";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PROXY_IMAGE_BYTES = 4 * 1024 * 1024;
const AI_PROXY_URL = "/api/analyze";
const AI_CONFIGURED = Boolean(AI_PROXY_URL.trim());

const DEFAULT_PANTRY = [
  { name: "Leche", emoji: "🥛" },
  { name: "Huevos", emoji: "🥚" },
  { name: "Arroz", emoji: "🍚" },
  { name: "Pasta", emoji: "🍝" },
  { name: "Tomates", emoji: "🍅" },
  { name: "Cebollas", emoji: "🧅" },
];

const MATERIAL_GUIDES = {
  plastic: {
    label: "Plástico",
    tag: "Plástico · demo",
    tip: "Una botella limpia puede servir para regar plantas por goteo.",
    message: "Vacíalo y enjuágalo. Si tu municipio lo solicita, separa la tapa antes de llevarlo al contenedor de envases.",
  },
  carton: {
    label: "Cartón",
    tag: "Cartón · demo",
    tip: "Una caja seca puede guardar semillas, cables o notas de cocina.",
    message: "Vacía el envase y déjalo escurrir. Los cartones para bebidas se recogen de forma distinta según la zona: revisa la guía municipal.",
  },
  metal: {
    label: "Metal",
    tag: "Metal · demo",
    tip: "Una lata limpia puede convertirse en un organizador de utensilios.",
    message: "Retira los restos y enjuágala. Déjala secar antes de separarla; comprueba el contenedor indicado en tu localidad.",
  },
  mixed: {
    label: "Por revisar",
    tag: "Foto local · demo",
    tip: "Antes de reutilizar, lava y seca bien cualquier envase.",
    message: "La imagen está en vista previa. El proxy OpenRouter analizará la foto cuando pulses el botón.",
  },
  glass: {
    label: "Vidrio",
    tip: "Un frasco limpio puede servir para guardar especias o semillas.",
  },
  organic: {
    label: "Restos orgánicos",
    tip: "Los restos de frutas y verduras pueden ir al compost si tu servicio local lo permite.",
  },
};

const DAILY_WASTE_FACTS = [
  {
    value: "2,56 mil millones",
    description: "de toneladas de residuos sólidos municipales se generaron en el mundo en 2022.",
    source: "Fuente: Banco Mundial · What a Waste 3.0",
    url: "https://www.worldbank.org/en/publication/what-a-waste",
  },
  {
    value: "3,86 mil millones",
    description: "de toneladas al año podrían generarse en 2050 si continúa la tendencia actual, proyecta el Banco Mundial.",
    source: "Fuente: Banco Mundial · What a Waste 3.0",
    url: "https://www.worldbank.org/en/publication/what-a-waste",
  },
  {
    value: "62 millones",
    description: "de toneladas de residuos electrónicos se generaron en el mundo en 2022.",
    source: "Fuente: Global E-waste Monitor 2024 · ITU y UNITAR",
    url: "https://ewastemonitor.info/the-global-e-waste-monitor-2024/",
  },
  {
    value: "22,3 %",
    description: "de los residuos electrónicos de 2022 se documentaron como recolectados y reciclados correctamente.",
    source: "Fuente: Global E-waste Monitor 2024 · ITU y UNITAR",
    url: "https://ewastemonitor.info/the-global-e-waste-monitor-2024/",
  },
];

const elements = {
  pantryList: document.querySelector("#pantryList"),
  itemCount: document.querySelector("#itemCount"),
  emptyPantry: document.querySelector("#emptyPantry"),
  pantryForm: document.querySelector("#addPantryForm"),
  pantryInput: document.querySelector("#pantryInput"),
  pantryError: document.querySelector("#pantryError"),
  pantrySaveState: document.querySelector("#pantrySaveState"),
  storageNotice: document.querySelector("#storageNotice"),
  exampleOptions: [...document.querySelectorAll(".example-option")],
  imageInput: document.querySelector("#imageInput"),
  imagePreview: document.querySelector("#imagePreview"),
  previewPlaceholder: document.querySelector("#previewPlaceholder"),
  previewLabel: document.querySelector("#previewLabel"),
  uploadError: document.querySelector("#uploadError"),
  askButton: document.querySelector("#askButton"),
  aiMessage: document.querySelector("#aiMessage"),
  messageCopy: document.querySelector("#messageCopy"),
  materialTags: document.querySelector("#materialTags"),
  privacyHint: document.querySelector("#privacyHint"),
  askButtonLabel: document.querySelector("#askButtonLabel"),
  aiStatusText: document.querySelector("#aiStatusText"),
  aiStatusBadge: document.querySelector(".demo-badge"),
  messageMode: document.querySelector(".message-mode"),
  loggedCount: document.querySelector("#loggedCount"),
  loggedMaterials: document.querySelector("#loggedMaterials"),
  loggedEmpty: document.querySelector("#loggedEmpty"),
  reuseTip: document.querySelector("#reuseTip"),
  dailyWasteDate: document.querySelector("#dailyWasteDate"),
  dailyWasteValue: document.querySelector("#dailyWasteValue"),
  dailyWasteDescription: document.querySelector("#dailyWasteDescription"),
  dailyWasteSource: document.querySelector("#dailyWasteSource"),
};

elements.aiStatusText.textContent = AI_CONFIGURED ? "OpenRouter · análisis en servidor" : "Demo · proxy no configurado";
elements.aiStatusBadge.classList.toggle("is-demo", !AI_CONFIGURED);

let dailyWasteTimer = 0;

function renderDailyWasteFact(now = new Date()) {
  const calendarDay = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  const fact = DAILY_WASTE_FACTS[calendarDay % DAILY_WASTE_FACTS.length];
  const nextLocalDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  elements.dailyWasteDate.dateTime = dateTime;
  elements.dailyWasteDate.textContent = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  elements.dailyWasteValue.textContent = fact.value;
  elements.dailyWasteDescription.textContent = fact.description;
  elements.dailyWasteSource.textContent = fact.source;
  elements.dailyWasteSource.href = fact.url;

  window.clearTimeout(dailyWasteTimer);
  dailyWasteTimer = window.setTimeout(
    () => renderDailyWasteFact(),
    Math.max(1000, nextLocalDay.getTime() - now.getTime() + 50),
  );
}

renderDailyWasteFact();
window.addEventListener("focus", () => renderDailyWasteFact());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderDailyWasteFact();
});

const demoSelectionData = {
  breakfast: {
    label: "Desayuno",
    materials: ["carton", "glass", "organic"],
    message: "En esta escena puedes separar el cartón de bebida vacío, reutilizar el frasco y llevar las cáscaras al compost si tu zona lo acepta.",
    preview: ".scene-breakfast svg",
    tip: "Enjuaga el cartón y seca el frasco antes de separarlos.",
  },
  kitchen: {
    label: "La cocina",
    materials: ["plastic", "metal", "carton"],
    message: "La foto de ejemplo reúne una botella, una lata y una caja. Vacía y enjuaga los envases; separa cada material según la guía de tu municipio.",
    preview: ".scene-kitchen svg",
    tip: "Aplana la caja y enjuaga los envases antes de reciclarlos.",
  },
  leftovers: {
    label: "Después de comer",
    materials: ["carton", "metal", "organic"],
    message: "Aquí hay restos de comida y varios envases. Separa los restos orgánicos y limpia los recipientes; la recogida del cartón con restos depende de tu zona.",
    preview: ".scene-leftovers svg",
    tip: "Retira los restos de comida antes de separar los recipientes.",
  },
};

let pantry = loadPantry();
let activeSelection = null;
let previewObjectUrl = null;
let typingTimer = 0;
const materialLog = new Map();
let analysisCount = 0;

function createPantryItems(items) {
  return items.map(({ name, emoji }, index) => ({
    id: `pantry-${Date.now()}-${index}`,
    name,
    emoji,
    consumed: false,
  }));
}

function isValidPantry(items) {
  return Array.isArray(items) && items.every((item) =>
    item
    && typeof item.id === "string"
    && typeof item.name === "string"
    && item.name.trim().length > 0
    && typeof item.emoji === "string"
    && typeof item.consumed === "boolean"
  );
}

function loadPantry() {
  try {
    const saved = window.localStorage.getItem(PANTRY_STORAGE_KEY);
    if (saved === null) {
      const items = createPantryItems(DEFAULT_PANTRY);
      window.localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(items));
      return items;
    }

    const parsed = JSON.parse(saved);
    if (!isValidPantry(parsed)) {
      throw new Error("Los datos guardados no tienen el formato esperado.");
    }
    return parsed;
  } catch (error) {
    showStorageError(`No se pudo leer o guardar tu lista (${error.message}). Puedes seguir usándola durante esta visita.`);
    return createPantryItems(DEFAULT_PANTRY);
  }
}

function persistPantry() {
  try {
    window.localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(pantry));
    elements.storageNotice.hidden = true;
    elements.pantrySaveState.textContent = "Tu lista se guarda en este navegador.";
    return true;
  } catch (error) {
    showStorageError(`No se pudo guardar tu lista (${error.message}). Tus cambios siguen disponibles mientras esta página permanezca abierta.`);
    elements.pantrySaveState.textContent = "Cambios guardados solo durante esta visita.";
    return false;
  }
}

function showStorageError(message) {
  elements.storageNotice.textContent = message;
  elements.storageNotice.hidden = false;
}

function renderPantry() {
  elements.pantryList.replaceChildren();
  elements.itemCount.textContent = String(pantry.length);
  elements.emptyPantry.hidden = pantry.length > 0;
  elements.pantryList.hidden = pantry.length === 0;

  pantry.forEach((item) => {
    const row = document.createElement("li");
    row.className = "pantry-item";

    const emoji = document.createElement("span");
    emoji.className = "food-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = item.emoji;

    const label = document.createElement("label");
    label.className = `food-name${item.consumed ? " is-consumed" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.className = "pantry-check";
    checkbox.type = "checkbox";
    checkbox.checked = item.consumed;
    checkbox.setAttribute("aria-label", `Marcar ${item.name} como ${item.consumed ? "pendiente" : "consumido"}`);
    checkbox.addEventListener("change", () => {
      item.consumed = checkbox.checked;
      persistPantry();
      renderPantry();
    });
    label.append(checkbox, document.createTextNode(item.name));

    const removeButton = document.createElement("button");
    removeButton.className = "icon-action";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Eliminar ${item.name}`);
    removeButton.innerHTML = '<svg aria-hidden="true"><use href="#icon-trash"></use></svg>';
    removeButton.addEventListener("click", () => {
      pantry = pantry.filter((entry) => entry.id !== item.id);
      persistPantry();
      renderPantry();
    });

    row.append(emoji, label, removeButton);
    elements.pantryList.append(row);
  });
}

function setFormError(message) {
  elements.pantryError.textContent = message;
  elements.pantryError.hidden = !message;
}

elements.pantryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.pantryInput.value.trim();
  if (!name) {
    setFormError("Escribe el nombre de un alimento para añadirlo.");
    elements.pantryInput.focus();
    return;
  }

  const duplicate = pantry.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (duplicate) {
    setFormError(`${name} ya está en tu lista.`);
    elements.pantryInput.select();
    return;
  }

  pantry.push({
    id: `pantry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    emoji: "🥬",
    consumed: false,
  });
  persistPantry();
  renderPantry();
  elements.pantryInput.value = "";
  setFormError("");
  elements.pantryInput.focus();
});

elements.pantryInput.addEventListener("input", () => setFormError(""));

function clearPreviousPreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
}

function displayPreview(source, label, selection) {
  clearPreviousPreview();
  if (source instanceof Blob) {
    previewObjectUrl = URL.createObjectURL(source);
    elements.imagePreview.src = previewObjectUrl;
  } else {
    elements.imagePreview.src = source;
  }
  elements.imagePreview.hidden = false;
  elements.previewPlaceholder.hidden = true;
  elements.previewLabel.textContent = label;
  elements.previewLabel.hidden = false;
  elements.askButton.disabled = false;
  activeSelection = selection;
  elements.askButtonLabel.textContent = AI_CONFIGURED && selection.kind === "upload"
    ? "ASK The AI · Analizar foto"
    : selection.kind === "example" ? "Ver ideas para esta foto" : "Ver guía demo para esta foto";
  elements.privacyHint.textContent = selection.kind === "example"
    ? "Foto de ejemplo: sus ideas son predefinidas y ninguna imagen se envía a la IA."
    : AI_CONFIGURED
      ? "La foto se enviará al proxy OpenRouter cuando pulses el botón."
      : "El proxy OpenRouter analizará la foto cuando pulses el botón.";
  elements.uploadError.hidden = true;
  elements.uploadError.textContent = "";
  elements.messageCopy.classList.remove("is-error");
}

elements.exampleOptions.forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.example;
    const data = demoSelectionData[id];
    if (!data) return;

    elements.exampleOptions.forEach((option) => {
      option.setAttribute("aria-pressed", String(option === button));
    });
    elements.imageInput.value = "";
    const previewSvg = document.querySelector(data.preview).cloneNode(true);
    previewSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgMarkup = previewSvg.outerHTML;
    const preview = new Blob([svgMarkup], { type: "image/svg+xml" });
    displayPreview(preview, data.label, { kind: "example", id, ...data });
  });
});

function setUploadError(message) {
  elements.uploadError.textContent = message;
  elements.uploadError.hidden = !message;
}

elements.imageInput.addEventListener("change", () => {
  const [file] = elements.imageInput.files || [];
  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    setUploadError("Ese archivo no parece una imagen. Elige un JPG, PNG o WebP.");
    elements.imageInput.value = "";
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    setUploadError("La imagen pesa más de 8 MB. Elige una foto más pequeña.");
    elements.imageInput.value = "";
    return;
  }

  elements.exampleOptions.forEach((option) => option.setAttribute("aria-pressed", "false"));
  const selection = { kind: "upload", file };
  displayPreview(file, file.name, selection);
  elements.imagePreview.onerror = () => {
    setUploadError("No se pudo mostrar esta imagen. Prueba con otro JPG, PNG o WebP.");
    activeSelection = null;
    elements.askButton.disabled = true;
  };
});

function getDemoReply(selection) {
  if (selection.kind === "example") {
    const example = demoSelectionData[selection.id];
    return {
      materials: example.materials,
      message: example.message,
      tip: example.tip,
      source: "demo",
      note: `Ideas de la foto de ejemplo «${example.label}».`,
    };
  }

  return {
    materials: ["mixed"],
    message: MATERIAL_GUIDES.mixed.message,
    tip: MATERIAL_GUIDES.mixed.tip,
    source: "demo",
    note: "Modo demo activo.",
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(new Error("No se pudo leer la imagen. Elige otro archivo e inténtalo de nuevo.")));
    reader.readAsDataURL(file);
  });
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo preparar la foto. Prueba con otra imagen."));
    }, "image/jpeg", quality);
  });
}

async function prepareImageForProxy(file) {
  if (file.size <= MAX_PROXY_IMAGE_BYTES) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("No se pudo comprimir esta foto para enviarla. Prueba con un JPG, PNG o WebP.");
  }

  try {
    const canvas = document.createElement("canvas");
    const maxDimension = Math.max(bitmap.width, bitmap.height);
    let scale = Math.min(1, 2048 / maxDimension);
    const qualities = [0.86, 0.76, 0.66, 0.56, 0.48];

    for (const quality of qualities) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo preparar esta foto en el navegador.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const compressed = await canvasToJpegBlob(canvas, quality);
      if (compressed.size <= MAX_PROXY_IMAGE_BYTES) return compressed;
      scale *= 0.82;
    }

    throw new Error("La foto no se pudo reducir lo suficiente para enviarla a Netlify.");
  } finally {
    bitmap.close();
  }
}

async function getOpenRouterReply(selection) {
  if (!AI_CONFIGURED || selection.kind !== "upload") {
    throw new Error("El proxy OpenRouter necesita una foto subida y el endpoint configurado.");
  }

  const imageForProxy = await prepareImageForProxy(selection.file);
  const imageDataUrl = await readFileAsDataUrl(imageForProxy);
  const mimeType = imageForProxy.type || selection.file.type;
  const response = await fetch(AI_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl, mimeType }),
  });

  if (!response.ok) {
    throw new Error("No se pudo completar el análisis con OpenRouter (HTTP " + response.status + "). Revisa la configuración del proxy e inténtalo de nuevo.");
  }

  const result = await response.json();
  if (typeof result.message !== "string" || !result.message.trim() || result.message.length > 1200) {
    throw new Error("El proxy devolvió una respuesta inesperada. Comprueba su configuración.");
  }

  const requestedMaterials = Array.isArray(result.materials) ? result.materials : [];
  const materials = [...new Set(requestedMaterials.filter((material) => Object.hasOwn(MATERIAL_GUIDES, material)))];
  if (materials.length === 0) {
    throw new Error("El proxy no devolvió materiales reconocidos. Inténtalo de nuevo.");
  }

  return {
    materials,
    message: result.message.trim(),
    tip: typeof result.tip === "string" && result.tip.trim() ? result.tip.trim() : MATERIAL_GUIDES[materials[0]].tip,
    source: "service",
    note: "Respuesta recibida desde el proxy OpenRouter.",
  };
}

function setMessageError(message) {
  clearTimeout(typingTimer);
  elements.aiMessage.classList.remove("is-loading");
  elements.aiMessage.setAttribute("aria-busy", "false");
  elements.messageCopy.classList.add("is-error");
  elements.messageCopy.textContent = message;
  elements.askButton.disabled = !activeSelection;
}

function typeMessage(text) {
  return new Promise((resolve) => {
    clearTimeout(typingTimer);
    elements.messageCopy.textContent = "";
    let index = 0;
    const step = () => {
      if (index >= text.length) {
        resolve();
        return;
      }
      const nextWord = text.indexOf(" ", index + 1);
      const end = nextWord === -1 ? text.length : nextWord;
      elements.messageCopy.textContent = text.slice(0, end);
      index = end;
      typingTimer = window.setTimeout(step, 28);
    };
    step();
  });
}

function addAnalysisToLog(reply) {
  analysisCount += 1;
  reply.materials.forEach((material) => {
    materialLog.set(material, (materialLog.get(material) || 0) + 1);
  });
  elements.loggedCount.textContent = String(analysisCount);
  elements.loggedEmpty.hidden = materialLog.size > 0;

  [...elements.loggedMaterials.querySelectorAll(".logged-chip")].forEach((chip) => chip.remove());
  materialLog.forEach((count, material) => {
    const chip = document.createElement("span");
    chip.className = "logged-chip";
    chip.textContent = `${MATERIAL_GUIDES[material].label} · ${count}`;
    elements.loggedMaterials.append(chip);
  });

  elements.reuseTip.textContent = `Tip: ${reply.tip || MATERIAL_GUIDES[reply.materials[0]].tip}`;
  elements.materialTags.replaceChildren();
  reply.materials.forEach((material) => {
    const tag = document.createElement("span");
    tag.className = "material-tag";
    tag.textContent = `${MATERIAL_GUIDES[material].label} · ${reply.source === "service" ? "OpenRouter IA" : "demo"}`;
    elements.materialTags.append(tag);
  });
  elements.materialTags.hidden = false;
}

elements.askButton.addEventListener("click", async () => {
  if (!activeSelection || elements.askButton.disabled) return;
  const selection = activeSelection;
  const useOpenRouter = Boolean(AI_CONFIGURED && selection.kind === "upload");
  elements.askButton.disabled = true;
  elements.aiMessage.setAttribute("aria-busy", "true");
  elements.aiMessage.classList.add("is-loading");
  elements.messageCopy.classList.remove("is-error");
  elements.messageCopy.textContent = useOpenRouter ? "Analizando tu foto con OpenRouter IA…" : "Preparando ideas para esta foto…";
  elements.messageMode.textContent = useOpenRouter ? "OPENROUTER IA" : "DEMO";
  elements.materialTags.hidden = true;

  try {
    const reply = useOpenRouter
      ? await getOpenRouterReply(selection)
      : await new Promise((resolve) => window.setTimeout(() => resolve(getDemoReply(selection)), 280));
    const fullMessage = reply.note ? `${reply.message} ${reply.note}` : reply.message;
    await typeMessage(fullMessage);
    addAnalysisToLog(reply);
    elements.aiMessage.classList.remove("is-loading");
    elements.aiMessage.setAttribute("aria-busy", "false");
    elements.askButton.disabled = !activeSelection;
  } catch (error) {
    setMessageError(error.message);
  }
});

renderPantry();

const initialExample = elements.exampleOptions.find((option) => option.dataset.example === "breakfast");
initialExample?.click();