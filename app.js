// --- Get references to HTML elements ---
const videoElement = document.getElementById("camera-feed");
const cameraContainer = document.getElementById("camera-container");
const desktopView = document.getElementById("desktop-view");
const canvas = document.getElementById("capture-canvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const loader = document.getElementById("loader");
const resultBox = document.getElementById("result-box");
const resultWordInput = document.getElementById("result-word-input");
const resultInstructions = document.getElementById("result-instructions");
const definitionContainer = document.getElementById("definition-container");
const definitionText = document.getElementById("definition-text");
const closeResultBtn = document.getElementById("close-result-btn");
const lookupBtn = document.getElementById("lookup-btn");

// --- State Variables ---
let cropBox = null,
  uiContainer = null,
  isDragging = false,
  dragStartX,
  dragStartY,
  activeHandle = null;
let isCaptureModeActive = false;
const dictionaryCache = {};

// --- Initialization ---
console.log("Lexilens is ready to fetch dictionary files on demand.");

// --- Core Functions ---
// *** MODIFIED with DEBUGGING ALERTS ***
async function lookupWord(word) {
  if (!word) return null;

  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
  const firstLetter = cleanWord.charAt(0);
  if (!firstLetter.match(/[a-z]/)) return null;

  // --- DEBUG ALERT 2: Check if file needs fetching ---
  if (!dictionaryCache[firstLetter]) {
    alert(
      `DEBUG: Dictionary for letter '${firstLetter}' is not cached. Attempting to fetch dict/${firstLetter}.json...`
    );
    try {
      const response = await fetch(`dict/${firstLetter}.json`);
      if (!response.ok) throw new Error(`File not found: ${response.status}`);
      dictionaryCache[firstLetter] = await response.json();
      // --- DEBUG ALERT 3: Successful fetch ---
      alert(`DEBUG: Successfully fetched and cached dict/${firstLetter}.json`);
    } catch (error) {
      alert(
        `DEBUG: FETCH FAILED for dict/${firstLetter}.json. Error: ${error.message}`
      );
      throw error;
    }
  } else {
    // --- DEBUG ALERT 4: File is already cached ---
    alert(
      `DEBUG: Dictionary for letter '${firstLetter}' was already in the cache.`
    );
  }

  // --- DEBUG ALERT 5: The Final Lookup ---
  const definition = dictionaryCache[firstLetter][cleanWord];
  if (definition) {
    alert(
      `DEBUG: Word "${cleanWord}" FOUND in the '${firstLetter}' dictionary!`
    );
  } else {
    alert(
      `DEBUG: Word "${cleanWord}" was NOT FOUND in the '${firstLetter}' dictionary.`
    );
  }

  return definition || null;
}

async function recognizeText(image) {
  let worker = null;
  try {
    worker = await Tesseract.createWorker("eng", 1, {
      workerPath: "lib/worker.min.js",
      langPath: "lib/",
      corePath:
        "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
      logger: (m) =>
        console.log(
          m.status === "recognizing text"
            ? `Progress: ${(m.progress * 100).toFixed(0)}%`
            : null
        ),
    });
    const { data } = await worker.recognize(image);
    await worker.terminate();
    return data;
  } catch (error) {
    console.error("OCR Error:", error);
    if (worker) await worker.terminate();
    return null;
  }
}

// --- UI and Event Handlers ---
function showLoader(visible) {
  overlay.classList.toggle("visible", visible);
  loader.classList.toggle("hidden", !visible);
  resultBox.classList.toggle("hidden", true);
}
function showResult(recognizedWord) {
  resultWordInput.value = recognizedWord;
  resultInstructions.innerText =
    "Edit the word above if needed, then press 'Look Up'.";
  resultInstructions.classList.remove("hidden");
  definitionContainer.classList.add("hidden");
  overlay.classList.add("visible");
  loader.classList.add("hidden");
  resultBox.classList.remove("hidden");
}

async function handleConfirm() {
  const rect = cropBox.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    resetToCameraView();
    return;
  }
  showLoader(true);
  const parentRect = cameraContainer.getBoundingClientRect();
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
  tempCanvas.width = rect.width;
  tempCanvas.height = rect.height;
  tempCtx.drawImage(
    canvas,
    rect.left - parentRect.top,
    rect.top - parentRect.top,
    rect.width,
    rect.height,
    0,
    0,
    rect.width,
    rect.height
  );
  const result = await recognizeText(tempCanvas);
  const recognizedText = result ? result.text.trim() : "";
  showResult(recognizedText);
  cleanupUI();
}

// *** MODIFIED with DEBUGGING ALERTS ***
async function handleLookup() {
  const word = resultWordInput.value.trim();

  // --- DEBUG ALERT 1: Initial state ---
  const cleanWordForDebug = word.toLowerCase().replace(/[^a-z]/g, "");
  alert(
    `DEBUG: Starting lookup.\n\nRaw word: "${word}"\nCleaned word: "${cleanWordForDebug}"`
  );

  if (!word) {
    resultInstructions.innerText = "Please enter a word to look up.";
    return;
  }

  resultInstructions.innerText = `Looking up "${word}"...`;
  lookupBtn.disabled = true;

  try {
    const definition = await lookupWord(word);
    if (definition) {
      definitionText.innerText = definition;
      definitionContainer.classList.remove("hidden");
      resultInstructions.classList.add("hidden");
    } else {
      resultInstructions.innerText = `Definition not found for "${word}".`;
      resultInstructions.classList.remove("hidden");
      definitionContainer.classList.add("hidden");
    }
  } catch (error) {
    console.error(error);
    resultInstructions.innerText =
      "Error: Could not load dictionary. Please check connection.";
  } finally {
    lookupBtn.disabled = false;
  }
}

function resetToCameraView() {
  overlay.classList.remove("visible");
  cleanupUI();
  videoElement.play();
}

// --- Main Application Logic & UI Creation ---
if (isMobile()) {
  startCamera();
  cameraContainer.addEventListener("click", handleCaptureClick);
} else {
  cameraContainer.style.display = "none";
  desktopView.style.display = "flex";
}
function isMobile() {
  return (
    ("ontouchstart" in window || navigator.maxTouchPoints > 0) &&
    /Mobi|Android|iPhone/i.test(navigator.userAgent)
  );
}
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    videoElement.srcObject = stream;
    videoElement.onloadedmetadata = () => {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
    };
  } catch (err) {
    console.error("Error accessing camera: ", err);
    alert("Could not access camera.");
  }
}
lookupBtn.onclick = (event) => {
  event.stopPropagation();
  handleLookup();
};
closeResultBtn.onclick = (event) => {
  event.stopPropagation();
  resetToCameraView();
};
function handleCaptureClick(event) {
  if (isCaptureModeActive) return;
  isCaptureModeActive = true;
  event.preventDefault();
  videoElement.pause();
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  canvas.style.display = "block";
  const rect = cameraContainer.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  createCropBox(x, y);
  createActionButtons();
}
function createCropBox(x, y) {
  cropBox = document.createElement("div");
  cropBox.id = "crop-box";
  const initialSize = 150;
  cropBox.style.left = `${x - initialSize / 2}px`;
  cropBox.style.top = `${y - initialSize / 2}px`;
  cropBox.style.width = `${initialSize}px`;
  cropBox.style.height = `${initialSize / 2}px`;
  const handles = ["top-left", "top-right", "bottom-left", "bottom-right"];
  handles.forEach((h) => {
    const handle = document.createElement("div");
    handle.className = `handle ${h}`;
    handle.dataset.handle = h;
    cropBox.appendChild(handle);
  });
  cameraContainer.appendChild(cropBox);
  cropBox.addEventListener("mousedown", startDrag);
  cropBox.addEventListener("touchstart", startDrag, { passive: false });
}
function createActionButtons() {
  uiContainer = document.createElement("div");
  uiContainer.id = "ui-container";
  const confirmBtn = document.createElement("button");
  confirmBtn.id = "confirm-btn";
  confirmBtn.className = "action-button";
  confirmBtn.innerText = "✅ Confirm";
  confirmBtn.onclick = (event) => {
    event.stopPropagation();
    handleConfirm();
  };
  const cancelBtn = document.createElement("button");
  cancelBtn.id = "cancel-btn";
  cancelBtn.className = "action-button";
  cancelBtn.innerText = "❌ Cancel";
  cancelBtn.onclick = (event) => {
    event.stopPropagation();
    resetToCameraView();
  };
  uiContainer.appendChild(cancelBtn);
  uiContainer.appendChild(confirmBtn);
  cameraContainer.appendChild(uiContainer);
}
function cleanupUI() {
  if (cropBox) cropBox.remove();
  if (uiContainer) uiContainer.remove();
  cropBox = null;
  uiContainer = null;
  canvas.style.display = "none";
  isCaptureModeActive = false;
}
function startDrag(e) {
  e.preventDefault();
  e.stopPropagation();
  isDragging = true;
  activeHandle = e.target.classList.contains("handle")
    ? e.target.dataset.handle
    : "body";
  const event = e.touches ? e.touches[0] : e;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  document.addEventListener("mousemove", drag);
  document.addEventListener("touchmove", drag, { passive: false });
  document.addEventListener("mouseup", endDrag);
  document.addEventListener("touchend", endDrag);
}
function drag(e) {
  if (!isDragging) return;
  e.preventDefault();
  const event = e.touches ? e.touches[0] : e;
  const deltaX = event.clientX - dragStartX;
  const deltaY = event.clientY - dragStartY;
  const rect = cropBox.getBoundingClientRect();
  const parentRect = cameraContainer.getBoundingClientRect();
  let top = rect.top - parentRect.top;
  let left = rect.left - parentRect.left;
  let width = rect.width;
  let height = rect.height;
  switch (activeHandle) {
    case "body":
      left += deltaX;
      top += deltaY;
      break;
    case "top-left":
      top += deltaY;
      left += deltaX;
      width -= deltaX;
      height -= deltaY;
      break;
    case "top-right":
      top += deltaY;
      width += deltaX;
      height -= deltaY;
      break;
    case "bottom-left":
      left += deltaX;
      width -= deltaX;
      height += deltaY;
      break;
    case "bottom-right":
      width += deltaX;
      height += deltaY;
      break;
  }
  cropBox.style.top = `${top}px`;
  cropBox.style.left = `${left}px`;
  cropBox.style.width = `${width}px`;
  cropBox.style.height = `${height}px`;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
}
function endDrag() {
  isDragging = false;
  activeHandle = null;
  document.removeEventListener("mousemove", drag);
  document.addEventListener("touchmove", drag);
  document.addEventListener("mouseup", endDrag);
  document.addEventListener("touchend", endDrag);
}
