// Get references to our HTML elements
const videoElement = document.getElementById("camera-feed");
const cameraContainer = document.getElementById("camera-container");
const desktopView = document.getElementById("desktop-view");
const canvas = document.getElementById("capture-canvas");
const ctx = canvas.getContext("2d");

// --- State Variables ---
let cropBox = null;
let uiContainer = null;
let isDragging = false;
let dragStartX, dragStartY;
let activeHandle = null;

// --- Device Detection and Camera Startup (no changes) ---
function isMobile() {
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /Mobi|Android|iPhone/i.test(navigator.userAgent);
  return hasTouch && isMobileUA;
}
async function startCamera() {
  try {
    const constraints = { video: { facingMode: "environment" }, audio: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    videoElement.onloadedmetadata = () => {
      // Set canvas dimensions once video is loaded
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
    };
  } catch (err) {
    console.error("Error accessing the camera: ", err);
    alert("Could not access the camera.");
  }
}

// --- UI Cleanup Function ---
function cleanupUI() {
  if (cropBox) cropBox.remove();
  if (uiContainer) uiContainer.remove();
  cropBox = null;
  uiContainer = null;
  canvas.style.display = "none";
  videoElement.play();
}

// --- Event Handlers ---
function handleCaptureClick(event) {
  event.preventDefault();

  // Freeze video and draw frame to canvas
  videoElement.pause();
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  canvas.style.display = "block";

  // Get tap coordinates
  const rect = cameraContainer.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Create UI elements
  createCropBox(x, y);
  createActionButtons();
}

function handleConfirm() {
  const boxRect = {
    left: cropBox.style.left,
    top: cropBox.style.top,
    width: cropBox.style.width,
    height: cropBox.style.height,
  };
  console.log("Confirm button clicked. Final box dimensions:", boxRect);
  alert(
    `Box confirmed! We would now send this to the OCR. Dimensions: ${JSON.stringify(
      boxRect
    )}`
  );

  // In the next step, we will add OCR logic here.

  cleanupUI();
}

function handleCancel() {
  cleanupUI();
}

// --- Dynamic UI Creation ---
function createCropBox(x, y) {
  cropBox = document.createElement("div");
  cropBox.id = "crop-box";
  // Initial size and position centered on tap
  const initialSize = 150;
  cropBox.style.left = `${x - initialSize / 2}px`;
  cropBox.style.top = `${y - initialSize / 2}px`;
  cropBox.style.width = `${initialSize}px`;
  cropBox.style.height = `${initialSize / 2}px`;

  // Create handles
  const handles = ["top-left", "top-right", "bottom-left", "bottom-right"];
  handles.forEach((handleName) => {
    const handle = document.createElement("div");
    handle.className = `handle ${handleName}`;
    handle.dataset.handle = handleName;
    cropBox.appendChild(handle);
  });

  cameraContainer.appendChild(cropBox);

  // Add event listeners for dragging and resizing
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
  cancelBtn.onclick = handleCancel;

  uiContainer.appendChild(cancelBtn);
  uiContainer.appendChild(confirmBtn);
  cameraContainer.appendChild(uiContainer);
}

// --- Drag and Resize Logic ---
function startDrag(e) {
  e.preventDefault();
  e.stopPropagation();

  isDragging = true;
  const target = e.target;
  activeHandle = target.classList.contains("handle")
    ? target.dataset.handle
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

// --- Main Application Logic ---
if (isMobile()) {
  startCamera();
  cameraContainer.addEventListener("click", handleCaptureClick);
} else {
  cameraContainer.style.display = "none";
  desktopView.style.display = "flex";
}
