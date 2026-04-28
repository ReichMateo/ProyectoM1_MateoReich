
const paletteSection = document.getElementById('paletteSection');
const paletteForm = document.getElementById('paletteForm');
const paletteSize = document.getElementById('paletteSize');
const colorFormat = document.getElementById('colorFormat');
const statusMessage = document.getElementById('statusMessage');
const toast = document.getElementById('toast');
const STORAGE_KEY = 'randomPaletteAppState';

function randomHue() {
  return Math.floor(Math.random() * 360);
}
//Reset
function randomSaturation() {
  return 60 + Math.floor(Math.random() * 30);
}

function randomLightness() {
  return 42 + Math.floor(Math.random() * 20);
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = value => {
    const hex = Math.round((value + m) * 255).toString(16).padStart(2, '0');
    return hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateColor() {
  const h = randomHue();
  const s = randomSaturation();
  const l = randomLightness();
  const hex = hslToHex(h, s, l);
  return { hex, hsl: `hsl(${h}, ${s}%, ${l}%)` };
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('toast--visible');
  clearTimeout(toast.hideTimeout);
  toast.hideTimeout = setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 1800);
}

function savePalette(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('No se pudo guardar en localStorage', error);
  }
}

function loadPalette() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function renderPalette(colors) {
  paletteSection.innerHTML = '';
  colors.forEach((color, index) => {
    const card = document.createElement('article');
    card.className = 'color-card';
    card.style.background = color.hex;
    card.style.color = getContrastText(color.hex);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.dataset.hex = color.hex;
    card.dataset.hsl = color.hsl;
    card.dataset.locked = color.locked ? 'true' : 'false';

    const displayValue = colorFormat.value === 'hsl' ? color.hsl : color.hex;
    card.setAttribute('aria-label', `Color ${index + 1}: ${displayValue}. Haz clic para copiar.`);

    const info = document.createElement('div');
    info.className = 'color-card__info';

    const label = document.createElement('div');
    label.className = 'color-card__label';
    label.innerHTML = `<span>Color ${index + 1}</span><button class="lock-button" type="button" aria-label="${color.locked ? 'Desbloquear' : 'Bloquear'} color ${index + 1}">${color.locked ? '🔒' : '🔓'}</button>`;

    const valueText = document.createElement('div');
    valueText.className = 'color-card__hex';
    valueText.textContent = displayValue;

    info.appendChild(label);
    info.appendChild(valueText);
    card.appendChild(info);
    paletteSection.appendChild(card);

    const lockButton = label.querySelector('.lock-button');
    lockButton.addEventListener('click', event => {
      event.stopPropagation();
      color.locked = !color.locked;
      lockButton.textContent = color.locked ? '🔒' : '🔓';
      lockButton.setAttribute('aria-label', `${color.locked ? 'Desbloquear' : 'Bloquear'} color ${index + 1}`);
      card.dataset.locked = color.locked ? 'true' : 'false';
      saveCurrentState(colors);
    });

    const copyColor = () => {
      const copyValue = colorFormat.value === 'hsl' ? color.hsl : color.hex;
      navigator.clipboard.writeText(copyValue).then(() => {
        showToast(`${copyValue} copiado al portapapeles`);
      }).catch(() => {
        showToast('No se pudo copiar el color');
      });
    };

    card.addEventListener('click', copyColor);
    card.addEventListener('keypress', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        copyColor();
      }
    });
  });
}

function getContrastText(hex) {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? '#050816' : '#ffffff';
}

function buildPalette(size, previous = []) {
  const palette = [];
  for (let i = 0; i < size; i += 1) {
    if (previous[i] && previous[i].locked) {
      palette.push(previous[i]);
      continue;
    }
    palette.push({ ...generateColor(), locked: false });
  }
  return palette;
}

function saveCurrentState(colors) {
  savePalette({ size: parseInt(paletteSize.value, 10), format: colorFormat.value, colors });
}

function updateStatus(message) {
  statusMessage.textContent = message;
}

paletteForm.addEventListener('submit', event => {
  event.preventDefault();
  const size = Number(paletteSize.value);
  const previous = loadPalette()?.colors || [];
  const newPalette = buildPalette(size, previous);
  renderPalette(newPalette);
  saveCurrentState(newPalette);
  updateStatus(`Paleta de ${size} colores generada.`);
});

  colorFormat.addEventListener('change', () => {
    const saved = loadPalette();
    if (saved && saved.colors?.length) {
      renderPalette(saved.colors);
      savePalette({ ...saved, format: colorFormat.value });
      updateStatus(`Mostrando colores en ${colorFormat.value.toUpperCase()}.`);
    }
  });

  window.addEventListener('load', () => {
    const saved = loadPalette();
    if (saved && saved.colors?.length) {
      if ([6, 8, 9].includes(saved.size)) {
        paletteSize.value = String(saved.size);
      }
      if (saved.format) {
        colorFormat.value = saved.format;
      }
      renderPalette(saved.colors);
      updateStatus('Paleta restaurada desde localStorage.');
    } else {
      const initialPalette = buildPalette(Number(paletteSize.value));
      renderPalette(initialPalette);
      saveCurrentState(initialPalette);
      updateStatus('Paleta inicial generada.');
    }
  });
  
