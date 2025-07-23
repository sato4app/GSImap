// 2. Initialize the map
// Coordinates of Minoh Falls (latitude, longitude)
const minohFall = [34.853667, 135.472041];
const map = L.map('map').setView(minohFall, 15);

// 3. Add the GSI standard map tile layer
L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
    attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
}).addTo(map);

// 4. Add a marker
L.marker(minohFall).addTo(map)
    .bindPopup('箕面大滝')
    .openPopup();

/**
 * Initializes the image overlay feature.
 * This function is called after all page resources are loaded.
 */
function initializeImageOverlayFeature() {
    (function() {
        let imageOverlay = null; // Variable to hold the current image overlay layer
        const currentImage = new Image(); // Holds the Image object of the currently displayed image

        // --- Get DOM elements and set up event listeners ---
        const imageInput = document.getElementById('imageInput');
        const loadImageBtn = document.getElementById('loadImageBtn');
        const scaleInput = document.getElementById('scaleInput');
        const opacityInput = document.getElementById('opacityInput');

        /**
         * Gets the opacity value (0-1 range) from the opacityInput.
         * @returns {number} Opacity (0-1)
         */
        function getDisplayOpacity() {
            const opacityValue = parseInt(opacityInput.value, 10);
            // Apply 0.5 if the value is invalid
            const displayOpacity = !isNaN(opacityValue) && opacityValue >= 0 && opacityValue <= 100 ? opacityValue / 100 : 0.5;
            return displayOpacity;
        }

        /**
         * Updates the image overlay on the map based on the current image and settings.
         */
        function updateImageDisplay() {
            // Do nothing if there's no image to display or if the image hasn't loaded yet
            if (!currentImage.src || !currentImage.complete) {
                return;
            }

            // Remove existing image
            if (imageOverlay) {
                map.removeLayer(imageOverlay);
            }

            const scale = parseFloat(scaleInput.value);
            const displayScale = !isNaN(scale) && scale > 0 ? scale : 0.3; // Apply 0.3 if the value is invalid

            const displayOpacity = getDisplayOpacity();
            const mapSize = map.getSize();
            const mapCenterLatLng = map.getCenter();
            
            // Use the image's natural size and avoid division by zero
            if (currentImage.naturalWidth === 0 || currentImage.naturalHeight === 0) {
                console.error("Invalid image size.");
                return;
            }
            const imageAspectRatio = currentImage.naturalHeight / currentImage.naturalWidth;
            const displayWidthPx = mapSize.x * displayScale;
            const displayHeightPx = displayWidthPx * imageAspectRatio; // Maintain aspect ratio
            const centerPoint = map.latLngToLayerPoint(mapCenterLatLng);
            const topLeftPoint = L.point(centerPoint.x - displayWidthPx / 2, centerPoint.y - displayHeightPx / 2);
            const bottomRightPoint = L.point(centerPoint.x + displayWidthPx / 2, centerPoint.y + displayHeightPx / 2);
            
            // L.imageOverlay requires LatLngBounds
            const bounds = L.latLngBounds(map.layerPointToLatLng(topLeftPoint), map.layerPointToLatLng(bottomRightPoint));

            imageOverlay = L.imageOverlay(currentImage.src, bounds, {
                opacity: displayOpacity // Set initial opacity
            }).addTo(map);
        }

        /**
         * Updates only the opacity of the image.
         */
        function updateOpacity() {
            if (!imageOverlay) return;
            imageOverlay.setOpacity(getDisplayOpacity());
        }

        // When the "Load Image" button is clicked, open the hidden file selection dialog
        loadImageBtn.addEventListener('click', () => imageInput.click());

        // When the scale input value changes, update the image display
        scaleInput.addEventListener('input', updateImageDisplay);

        // When the opacity input value changes, update the image display
        opacityInput.addEventListener('input', updateOpacity);

        // Handle file selection
        imageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return; // Do nothing if file selection is cancelled

            const reader = new FileReader();

            // When FileReader finishes loading
            reader.onload = (e) => {
                // When image data loads successfully
                currentImage.onload = () => {
                    // Check if image size is obtained correctly
                    if (currentImage.naturalWidth === 0 || currentImage.naturalHeight === 0) {
                        // Use a custom message box instead of alert
                        const messageBox = document.createElement('div');
                        messageBox.style.cssText = `
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            background-color: white;
                            padding: 20px;
                            border: 1px solid #ccc;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            z-index: 10000;
                            border-radius: 8px;
                            font-family: sans-serif;
                            text-align: center;
                        `;
                        messageBox.innerHTML = `
                            <p>有効な画像ファイルではありません。別のファイルを選択してください。</p>
                            <button onclick="this.parentNode.remove()" style="
                                padding: 8px 16px;
                                margin-top: 10px;
                                border: none;
                                background-color: #007bff;
                                color: white;
                                border-radius: 4px;
                                cursor: pointer;
                            ">OK</button>
                        `;
                        document.body.appendChild(messageBox);
                        return;
                    }
                    updateImageDisplay();
                };
                // When image data fails to load
                currentImage.onerror = () => {
                    // Use a custom message box instead of alert
                    const messageBox = document.createElement('div');
                    messageBox.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background-color: white;
                        padding: 20px;
                        border: 1px solid #ccc;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        z-index: 10000;
                        border-radius: 8px;
                        font-family: sans-serif;
                        text-align: center;
                    `;
                    messageBox.innerHTML = `
                        <p>画像の読み込みに失敗しました。ファイルが破損している可能性があります。</p>
                        <button onclick="this.parentNode.remove()" style="
                            padding: 8px 16px;
                            margin-top: 10px;
                            border: none;
                            background-color: #007bff;
                            color: white;
                            border-radius: 4px;
                            cursor: pointer;
                        ">OK</button>
                    `;
                    document.body.appendChild(messageBox);
                };
                // Set the data URL read by FileReader to the Image object
                currentImage.src = e.target.result;
            };

            // Start reading the file with FileReader
            reader.readAsDataURL(file);
            event.target.value = ''; // Reset to allow selecting the same file consecutively
        });
    })();
}

// Initialize the image overlay feature when all page resources are loaded
window.addEventListener('load', initializeImageOverlayFeature);
