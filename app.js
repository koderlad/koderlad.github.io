// Get references to our HTML elements
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

// --- State Variables ---
let cropBox = null,
  uiContainer = null,
  isDragging = false,
  dragStartX,
  dragStartY,
  activeHandle = null;
let dictionary = null;
let tesseractWorker = null;

// --- Initialization ---
async function initialize() {
  // We create the worker and load the dictionary at the same time
  await Promise.all([createTesseractWorker(), loadDictionary()]);
  console.log("Lexilens is ready!");
}

async function createTesseractWorker() {
  tesseractWorker = await Tesseract.createWorker("eng", 1, {
    logger: (m) => console.log(m), // Logs progress in the console
  });
  console.log("Tesseract worker created.");
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

function lookupWord(word) {
  if (!dictionary) return "Dictionary not loaded.";
  return dictionary[word.toLowerCase()] || "Definition not found.";
}

// --- Main OCR Function ---
async function recognizeText(imageData) {
  try {
    const {
      data: { text },
    } = await tesseractWorker.recognize(imageData);
    return text.trim(); // Return the cleaned-up text
  } catch (error) {
    console.error("OCR Error:", error);
    return null;
  }
}

// --- UI and Event Handlers ---
function showLoader(visible) {
  overlay.classList.toggle("visible", visible);
  loader.classList.toggle("hidden", !visible);
  resultBox.classList.toggle("hidden", true); // Always hide result box when loader state changes
}

function showResult(word, definition) {
  resultWordEl.innerText = word;
  resultDefinitionEl.innerText = definition;
  overlay.classList.add("visible");
  loader.classList.add("hidden");
  resultBox.classList.remove("hidden");
}

async function handleConfirm() {
  showLoader(true);

  const rect = cropBox.getBoundingClientRect();
  const parentRect = cameraContainer.getBoundingClientRect();

  // Get the image data from the canvas for the cropped area
  const imageData = ctx.getImageData(
    rect.left - parentRect.left,
    rect.top - parentRect.top,
    rect.width,
    rect.height
  );

  // Perform OCR
  const recognizedWord = await recognizeText(imageData);
  console.log(`Recognized word: "${recognizedWord}"`);

  // Lookup definition
  if (recognizedWord) {
    const definition = lookupWord(recognizedWord);
    showResult(recognizedWord, definition);
  } else {
    showResult(
      "Error",
      "Could not recognize any text. Please try again with a clearer image."
    );
  }

  // Clean up the crop UI, but keep the result overlay visible
  if (cropBox) cropBox.remove();
  if (uiContainer) uiContainer.remove();
  cropBox = null;
  uiContainer = null;
  canvas.style.display = "none";
}

closeResultBtn.onclick = () => {
  showLoader(false); // This will hide the entire overlay
  videoElement.play(); // Resume the camera feed
};

// --- Device Detection, Camera Startup, and UI logic (mostly unchanged) ---
function isMobile() {
  /* ... unchanged ... */ return (
    ("ontouchstart" in window || navigator.maxTouchPoints > 0) &&
    /Mobi|Android|iPhone/i.test(navigator.userAgent)
  );
}
async function startCamera() {
  /* ... unchanged ... */
}
function cleanupUI() {
  /* ... unchanged ... */
}
function handleCaptureClick(event) {
  /* ... unchanged ... */
}
function createCropBox(x, y) {
  /* ... unchanged ... */
}
function createActionButtons() {
  /* ... unchanged ... */
}
function startDrag(e) {
  /* ... unchanged ... */
}
function drag(e) {
  /* ... unchanged ... */
}
function endDrag() {
  /* ... unchanged ... */
}

// --- Main Application Logic ---
if (isMobile()) {
  initialize(); // Start loading dictionary and Tesseract
  startCamera();
  cameraContainer.addEventListener("click", handleCaptureClick);
} else {
  cameraContainer.style.display = "none";
  desktopView.style.display = "flex";
}

// --- Unchanged function implementations (for brevity) ---
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
  cancelBtn.innerText = "❌ Cancel";
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
  document.removeEventListener("mouseup", endDrag);
  document.removeEventListener("touchend", endDrag);
}
