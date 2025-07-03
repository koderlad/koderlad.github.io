// --- Get references to HTML elements (no changes) ---
const videoElement = document.getElementById("camera-feed");
const cameraContainer = document.getElementById("camera-container");
const desktopView = document.getElementById("desktop-view");
const canvas = document.getElementById("capture-canvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const loader = document.getElementById("loader");
const resultBox = document.getElementById("result-box");
const resultWordEl = document.getElementById("result-word");
const resultDefinitionEl = document.getElementById("result-definition");
const closeResultBtn = document.getElementById("close-result-btn");

// --- State Variables (no changes) ---
let cropBox = null,
  uiContainer = null,
  isDragging = false,
  dragStartX,
  dragStartY,
  activeHandle = null;
let dictionary = null;
let tesseractWorker = null;
let isInitialized = false;

// --- Initialization (no changes) ---
async function initialize() {
  await Promise.all([createTesseractWorker(), loadDictionary()]);
  isInitialized = true;
  console.log("Lexilens is ready!");
}
async function createTesseractWorker() {
  tesseractWorker = await Tesseract.createWorker("eng", 1, {
    workerPath: "lib/worker.min.js",
    langPath: "lib/",
    corePath:
      "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
    logger: (m) => console.log(m),
  });
  console.log("Tesseract worker created from local files.");
}
async function loadDictionary() {
  try {
    const response = await fetch("dictionary.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    dictionary = await response.json();
    console.log("Dictionary loaded.");
  } catch (e) {
    console.error("Failed to load dictionary:", e);
    alert("Error: Could not load the dictionary file.");
  }
}

// --- Word Lookup (no changes) ---
function lookupWord(word) {
  if (!dictionary) return "Dictionary not loaded.";
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
  return dictionary[cleanWord] || "Definition not found.";
}

// --- OCR Function (no changes from previous debugging version, but will now receive a valid image) ---
async function recognizeText(image) {
  try {
    const { data } = await tesseractWorker.recognize(image);
    return data;
  } catch (error) {
    console.error("OCR Error:", error);
    alert("OCR process failed. See console for details."); // Keep an alert for unexpected errors
    return null;
  }
}

// --- UI and Event Handlers ---
function showLoader(visible) {
  overlay.classList.toggle("visible", visible);
  loader.classList.toggle("hidden", !visible);
  resultBox.classList.toggle("hidden", true);
}
function showResult(recognizedWord, definition) {
  resultWordEl.innerText = recognizedWord;
  resultDefinitionEl.innerText = definition;
  overlay.classList.add("visible");
  loader.classList.add("hidden");
  resultBox.classList.remove("hidden");
}

// *** MODIFIED FUNCTION: THE FINAL, CORRECT IMPLEMENTATION ***
async function handleConfirm() {
  if (!isInitialized) {
    alert("Please wait a moment for the app to initialize.");
    return;
  }
  const rect = cropBox.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    cleanupUI();
    videoElement.play();
    return;
  }

  showLoader(true);

  // --- The New, Robust Method ---
  // 1. Get the coordinates and dimensions of the crop box.
  const parentRect = cameraContainer.getBoundingClientRect();
  const cropX = rect.left - parentRect.left;
  const cropY = rect.top - parentRect.top;
  const cropWidth = rect.width;
  const cropHeight = rect.height;

  // 2. Create a new, temporary canvas in memory.
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true }); // Optimization for reading data
  tempCanvas.width = cropWidth;
  tempCanvas.height = cropHeight;

  // 3. Draw *only the cropped part* of the main canvas onto the temporary canvas.
  // This effectively "slices" the image.
  tempCtx.drawImage(
    canvas, // The source canvas
    cropX,
    cropY,
    cropWidth,
    cropHeight, // Source rectangle (sx, sy, sWidth, sHeight)
    0,
    0,
    cropWidth,
    cropHeight // Destination rectangle (dx, dy, dWidth, dHeight)
  );
  // --- End of New Method ---

  // 4. Send the NEW canvas element to Tesseract. This is much more reliable.
  const result = await recognizeText(tempCanvas);

  if (result && result.text.trim()) {
    const recognizedWord = result.text.trim();
    const definition = lookupWord(recognizedWord);
    showResult(recognizedWord, definition);
  } else {
    showResult(
      "Not Found",
      "Could not read the text. Try for a clearer image and more precise cropping."
    );
  }

  cleanupUI();
}

closeResultBtn.onclick = () => {
  showLoader(false);
  videoElement.play();
};

// --- Main Application Logic & Unchanged Functions ---
if (isMobile()) {
  initialize();
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
function handleCaptureClick(event) {
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
  confirmBtn.onclick = handleConfirm;
  const cancelBtn = document.createElement("button");
  cancelBtn.id = "cancel-btn";
  cancelBtn.className = "action-button";
  cancelBtn.onclick = () => {
    cleanupUI();
    videoElement.play();
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
  document.removeEventListener("touchmove", drag);
  document.addEventListener("mouseup", endDrag);
  document.addEventListener("touchend", endDrag);
}
