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
     * Analyzes the canvas pixels at a tap location to find the bounding box of a word.
     * This is a simplified computer vision algorithm.
     * @param {number} tapX - The x-coordinate of the user's tap.
     * @param {number} tapY - The y-coordinate of the user's tap.
     * @returns {object|null} An object with {x, y, width, height} of the word, or null.
     */
    function findWordAt(tapX, tapY) {
      const imageData = ctx.getImageData(
        0,
        0,
        snapshotCanvas.width,
        snapshotCanvas.height
      );
      const { data, width, height } = imageData;
      const PIXEL_DENSITY = window.devicePixelRatio || 1;

      // Convert viewport coordinates to canvas pixel coordinates
      const canvasX = Math.round(tapX * (width / video.clientWidth));
      const canvasY = Math.round(tapY * (height / video.clientHeight));

      // Function to get the brightness of a pixel. We assume dark text on a light background.
      // A simple formula for grayscale is 0.299*R + 0.587*G + 0.114*B
      function isTextPixel(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        const i = (y * width + x) * 4;
        const brightness =
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        return brightness < 128; // Threshold: 128 is a common middle-ground
      }

      // If the tapped pixel itself isn't text, we can't start.
      if (!isTextPixel(canvasX, canvasY)) {
        console.log("Tap was not on a text pixel.");
        return null;
      }

      // Scan left from the tap point to find the start of the word
      let startX = canvasX;
      while (startX > 0 && isTextPixel(startX - 1, canvasY)) {
        startX--;
      }

      // Scan right from the tap point to find the end of the word
      let endX = canvasX;
      while (endX < width && isTextPixel(endX + 1, canvasY)) {
        endX++;
      }

      // For now, use a fixed vertical height. A more advanced version could scan vertically too.
      const lineHeight = 30 * PIXEL_DENSITY; // Estimate line height

      // Convert canvas pixel coordinates back to viewport CSS pixels
      const boxX = startX * (video.clientWidth / width);
      const boxY = (canvasY - lineHeight / 2) * (video.clientHeight / height);
      const boxWidth = (endX - startX) * (video.clientWidth / width);
      const boxHeight = lineHeight * (video.clientHeight / height);

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

      if (wordBox) {
        selectionBox.style.left = `${wordBox.x}px`;
        selectionBox.style.top = `${wordBox.y}px`;
        selectionBox.style.width = `${wordBox.width}px`;
        selectionBox.style.height = `${wordBox.height}px`;
      } else {
        // If no word is found, fallback to the simple box at tap location
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
