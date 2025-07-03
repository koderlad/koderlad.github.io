document.addEventListener("DOMContentLoaded", () => {
  // --- 1. DEVICE DETECTION ---
  function isMobile() {
    const regex =
      /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return regex.test(navigator.userAgent);
  }

  // --- 2. MAIN LOGIC ROUTING ---
  if (isMobile()) {
    initializeApp();
  } else {
    displayDesktopMessage();
  }

  function displayDesktopMessage() {
    document.getElementById("app-container").style.display = "none";
    const desktopMessage = document.getElementById("desktop-message");
    desktopMessage.style.display = "flex";
  }

  function initializeApp() {
    // --- GET DOM ELEMENTS ---
    const video = document.getElementById("camera-feed");
    const appContainer = document.getElementById("app-container");
    const snapshotCanvas = document.getElementById("snapshot-canvas");
    const interactionOverlay = document.getElementById("interaction-overlay");
    const selectionBox = document.getElementById("selection-box");
    const btnReject = document.getElementById("btn-reject");
    const btnConfirm = document.getElementById("btn-confirm");
    const ctx = snapshotCanvas.getContext("2d");

    // --- CAMERA INITIALIZATION ---
    const constraints = { video: { facingMode: "environment" }, audio: false };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => {
        console.error("Error accessing camera: ", err);
        appContainer.innerHTML = `<div style="color: white; text-align: center; padding: 20px;">Could not access the camera.</div>`;
      });

    // --- CORE APP LOGIC ---

    /**
     * NEW: Calculates the scale and offset of the video due to 'object-fit: cover'.
     * This is crucial for correctly mapping screen coordinates to video coordinates.
     * @returns {object} An object with { scale, offsetX, offsetY }.
     */
    function calculateScaleAndOffset() {
      const videoRatio = video.videoWidth / video.videoHeight;
      const containerRatio = video.clientWidth / video.clientHeight;
      let scale = 1;
      let offsetX = 0;
      let offsetY = 0;

      if (videoRatio > containerRatio) {
        // Video is wider than container, it's scaled to fit height and cropped horizontally.
        scale = video.clientHeight / video.videoHeight;
        const scaledWidth = video.videoWidth * scale;
        offsetX = (video.clientWidth - scaledWidth) / 2;
      } else {
        // Video is taller than container, it's scaled to fit width and cropped vertically.
        scale = video.clientWidth / video.videoWidth;
        const scaledHeight = video.videoHeight * scale;
        offsetY = (video.clientHeight - scaledHeight) / 2;
      }
      return { scale, offsetX, offsetY };
    }

    function findWordAt(tapX, tapY) {
      const { scale, offsetX, offsetY } = calculateScaleAndOffset();
      const imageData = ctx.getImageData(
        0,
        0,
        snapshotCanvas.width,
        snapshotCanvas.height
      );
      const { data, width, height } = imageData;

      // Convert viewport tap coordinates to native canvas pixel coordinates, accounting for offset and scale.
      const canvasX = Math.round((tapX - offsetX) / scale);
      const canvasY = Math.round((tapY - offsetY) / scale);

      function isTextPixel(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        const i = (y * width + x) * 4;
        const brightness =
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        return brightness < 128;
      }

      if (!isTextPixel(canvasX, canvasY)) {
        console.log("Tap was not on a text pixel.");
        return null;
      }

      let startX = canvasX;
      while (startX > 0 && isTextPixel(startX - 1, canvasY)) {
        startX--;
      }

      let endX = canvasX;
      while (endX < width - 1 && isTextPixel(endX + 1, canvasY)) {
        endX++;
      }

      // We'll also do a quick vertical scan for better height calculation.
      let startY = canvasY;
      while (startY > 0 && isTextPixel(startX, startY - 1)) {
        startY--;
      }
      let endY = canvasY;
      while (endY < height - 1 && isTextPixel(startX, endY + 1)) {
        endY++;
      }

      // Convert the found canvas coordinates back to CSS viewport pixels for the box.
      const boxX = startX * scale + offsetX;
      const boxY = startY * scale + offsetY;
      const boxWidth = (endX - startX) * scale;
      const boxHeight = (endY - startY) * scale;

      return { x: boxX, y: boxY, width: boxWidth, height: boxHeight };
    }

    function handleVideoTap(event) {
      event.preventDefault();
      video.pause();

      snapshotCanvas.width = video.videoWidth;
      snapshotCanvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

      interactionOverlay.style.backgroundImage = `url(${snapshotCanvas.toDataURL()})`;
      interactionOverlay.style.backgroundSize = "cover";
      interactionOverlay.style.display = "block";

      const touch = event.touches[0];
      const wordBox = findWordAt(touch.clientX, touch.clientY);

      if (wordBox && wordBox.width > 0 && wordBox.height > 0) {
        selectionBox.style.left = `${wordBox.x}px`;
        selectionBox.style.top = `${wordBox.y}px`;
        selectionBox.style.width = `${wordBox.width}px`;
        selectionBox.style.height = `${wordBox.height}px`;
      } else {
        // Fallback box if word finding fails.
        const boxSize = 100;
        selectionBox.style.left = `${touch.clientX - boxSize / 2}px`;
        selectionBox.style.top = `${touch.clientY - boxSize / 2}px`;
        selectionBox.style.width = `${boxSize}px`;
        selectionBox.style.height = `${boxSize}px`;
      }
    }

    function resetToLiveView() {
      interactionOverlay.style.display = "none";
      video.play();
    }

    // --- EVENT LISTENERS ---
    video.addEventListener("touchstart", handleVideoTap);
    btnReject.addEventListener("click", resetToLiveView);
    btnConfirm.addEventListener("click", () => {
      console.log("Selection Confirmed!");
      resetToLiveView();
    });
  }
});
