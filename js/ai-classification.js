/**
 * EcoCollect — AI E-Waste Classification Service (Prototype / Mock AI Model)
 * 
 * ARCHITECTURE NOTICE:
 * This module is a cleanly isolated prototype AI service demonstrating how
 * a computer vision/deep learning model (e.g., TensorFlow Lite, Google Gemini Vision API,
 * or an on-premise PyTorch model) connects to the EcoCollect intake pipeline.
 *
 * In production, `classifyEwasteImage()` will send a POST request with the image multipart/form-data
 * or base64 payload to: `https://api.ecocollect.city/v1/ai/classify-ewaste`
 */

const AI_PRESET_MODELS = {
  laptop: {
    detectedObject: 'Dell/Lenovo Laptop Notebook',
    category: 'Laptop',
    condition: 'Used / Intact casing',
    confidence: '98.2%',
    recommendedAction: 'Direct Refurbishment / Motherboard Dismantling',
    hazardousComponent: 'Lithium-ion Battery Pack (Flammable electrolyte risk)',
    recyclableMaterials: ['Aluminum chassis', 'Copper heat pipes', 'Silicon chips', 'Gold contact pins'],
    estimatedWeight: 2.2,
    basePoints: 50,
    handlingPrecaution: 'Remove battery before shredding; insulate terminal pins.'
  },
  phone: {
    detectedObject: 'Smartphone with cracked screen',
    category: 'Mobile Phone',
    condition: 'Damaged display / Battery intact',
    confidence: '96.7%',
    recommendedAction: 'Screen Replacement or Precious Metal Smelting',
    hazardousComponent: 'Lithium-Cobalt Battery & Lead solder traces',
    recyclableMaterials: ['Rare earth magnets (Neodymium)', 'Optical glass', 'Gold & Silver traces'],
    estimatedWeight: 0.22,
    basePoints: 20,
    handlingPrecaution: 'Check for swelling; store in static-shielding bag.'
  },
  tv: {
    detectedObject: 'Flat Panel LED Television (approx 40-43 inch)',
    category: 'Television',
    condition: 'Cosmetically aged / Screen intact',
    confidence: '95.1%',
    recommendedAction: 'Depolarizer Film & Backlight Board Recovery',
    hazardousComponent: 'Flame retardant brominated plastics & Mercury CCFL (if older LCD)',
    recyclableMaterials: ['Diffuser acrylic sheets', 'Steel backplate', 'High-grade copper cabling'],
    estimatedWeight: 10.5,
    basePoints: 80,
    handlingPrecaution: 'Fragile glass panel; requires two-person lifting protocol.'
  },
  battery: {
    detectedObject: 'High-Capacity Lithium-Ion / Inverter Battery',
    category: 'Battery',
    condition: 'Chemical wear / Depleted cells',
    confidence: '99.1%',
    recommendedAction: 'Hydrometallurgical Extraction of Nickel, Manganese & Cobalt',
    hazardousComponent: 'Corrosive electrolyte & heavy metals (Lead/Cadmium/Cobalt)',
    recyclableMaterials: ['Cobalt sulfate', 'Lithium carbonate', 'Nickel hydroxide'],
    estimatedWeight: 8.5,
    basePoints: 30,
    handlingPrecaution: 'CRITICAL HAZARD: Do not puncture or incinerate; use vermiculite drum.'
  },
  printer: {
    detectedObject: 'All-in-One Inkjet / Laser Printer',
    category: 'Printer',
    condition: 'Used / Roller wear',
    confidence: '94.8%',
    recommendedAction: 'Stepper Motor & Power Supply Harvest',
    hazardousComponent: 'Toner micro-particles (Respiratory irritant)',
    recyclableMaterials: ['ABS Plastics', 'Steel shafts', 'Micro stepper motors'],
    estimatedWeight: 4.5,
    basePoints: 30,
    handlingPrecaution: 'Seal toner/ink cartridges before transportation.'
  }
};

/**
 * Prototype AI Classifier function
 * @param {File|string} input - File object from input[type=file] or preset key ('laptop', 'phone', etc.)
 * @returns {Promise<Object>} classification metadata
 */
async function classifyEwasteImage(input) {
  return new Promise((resolve) => {
    // Determine which preset to match (or randomly select a realistic electronic category if custom file)
    let matchedKey = 'laptop';
    if (typeof input === 'string' && AI_PRESET_MODELS[input]) {
      matchedKey = input;
    } else if (input instanceof File) {
      const fname = input.name.toLowerCase();
      if (fname.includes('phone') || fname.includes('mobile')) matchedKey = 'phone';
      else if (fname.includes('tv') || fname.includes('screen')) matchedKey = 'tv';
      else if (fname.includes('battery') || fname.includes('ups')) matchedKey = 'battery';
      else if (fname.includes('printer')) matchedKey = 'printer';
      else {
        // Pick one randomly
        const keys = Object.keys(AI_PRESET_MODELS);
        matchedKey = keys[Math.floor(Math.random() * keys.length)];
      }
    }

    // Simulate model inference latency (1.2 seconds)
    setTimeout(() => {
      const result = {
        status: 'SUCCESS',
        modelEngine: 'EcoVision v2.4 (TensorFlow / Vision API Prototype)',
        inferenceTimestamp: new Date().toISOString(),
        ...AI_PRESET_MODELS[matchedKey]
      };
      resolve(result);
    }, 1200);
  });
}

/**
 * UI Controller for the AI Classification Box on request page
 */
function initAiClassifierUI(options = {}) {
  const dropzone = document.getElementById('ai-dropzone');
  const fileInput = document.getElementById('ai-file-input');
  const scannerOverlay = document.getElementById('ai-scanner-overlay');
  const resultCard = document.getElementById('ai-result-card');
  const samplePills = document.querySelectorAll('.ai-sample-pill');

  if (!dropzone || !fileInput) return;

  // File drag & drop handlers
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--color-primary)';
    dropzone.style.background = 'var(--bg-mint)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '';
    dropzone.style.background = '';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '';
    dropzone.style.background = '';
    if (e.dataTransfer.files.length > 0) {
      runClassification(e.dataTransfer.files[0]);
    }
  });

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      runClassification(fileInput.files[0]);
    }
  });

  // Preset sample buttons
  samplePills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const sampleKey = pill.getAttribute('data-sample');
      runClassification(sampleKey);
    });
  });

  async function runClassification(input) {
    if (scannerOverlay) scannerOverlay.style.display = 'block';
    if (resultCard) resultCard.style.display = 'none';
    if (dropzone) dropzone.style.opacity = '0.5';

    // Animate progress bar
    const bar = document.getElementById('ai-progress-bar');
    if (bar) {
      bar.style.width = '20%';
      setTimeout(() => { bar.style.width = '70%'; }, 400);
      setTimeout(() => { bar.style.width = '95%'; }, 900);
    }

    const result = await classifyEwasteImage(input);

    if (bar) bar.style.width = '100%';
    if (scannerOverlay) scannerOverlay.style.display = 'none';
    if (dropzone) dropzone.style.opacity = '1';

    // Populate Result Card
    if (resultCard) {
      resultCard.style.display = 'block';
      document.getElementById('ai-res-object').textContent = result.detectedObject;
      document.getElementById('ai-res-category').textContent = result.category;
      document.getElementById('ai-res-condition').textContent = result.condition;
      document.getElementById('ai-res-hazard').textContent = result.hazardousComponent;
      document.getElementById('ai-res-action').textContent = result.recommendedAction;
      document.getElementById('ai-res-confidence').textContent = result.confidence;

      // Auto-fill Step 1 form fields for citizen convenience
      if (typeof options.onAutoFill === 'function') {
        options.onAutoFill(result);
      }
    }

    showToast('AI Classification Complete', `Detected ${result.detectedObject} (${result.confidence} confidence)`, 'success');
  }
}

