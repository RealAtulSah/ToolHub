/**
 * ToolHub Pro - Colors & Morse Models Engine
 * Handles Text to Morse, Morse to Text, RGB to HEX, HEX to RGB, RGB to HSL, HSL to RGB.
 * Includes interactive audio player for Morse code and visual color previews.
 */

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const isTextToMorse = path.includes('text-to-morse');
  const isMorseToText = path.includes('morse-to-text');
  const isRgbToHex = path.includes('rgb-to-hex');
  const isHexToRgb = path.includes('hex-to-rgb');
  const isRgbToHsl = path.includes('rgb-to-hsl');
  const isHslToRgb = path.includes('hsl-to-rgb');

  // Morse Code Dictionary
  const morseDict = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....',
    'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.',
    'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..',
    '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
    '8': '---..', '9': '----.', '0': '-----',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.',
    '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
    '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
    ' ': '/'
  };

  const reverseMorseDict = Object.fromEntries(
    Object.entries(morseDict).map(([char, code]) => [code, char])
  );

  // ==========================================
  // MORSE CODE TOOLS
  // ==========================================
  if (isTextToMorse || isMorseToText) {
    const inputArea = document.getElementById('morse-input');
    const outputArea = document.getElementById('morse-output');
    const actionBtn = document.getElementById('morse-action-btn');
    const playBtn = document.getElementById('play-morse-btn');
    const clearBtn = document.getElementById('clear-btn');

    if (actionBtn && inputArea && outputArea) {
      actionBtn.onclick = () => {
        const val = inputArea.value.trim();
        if (!val) {
          window.showToast('Please enter text to translate.', 'warning');
          return;
        }

        try {
          if (isTextToMorse) {
            const result = [];
            for (let char of val.toUpperCase()) {
              if (morseDict[char] !== undefined) {
                result.push(morseDict[char]);
              } else {
                result.push('?');
              }
            }
            outputArea.value = result.join(' ');
          } else {
            // Morse to text
            const words = val.split('/');
            const textResult = [];
            for (let word of words) {
              const chars = word.trim().split(/\s+/);
              const decodedWord = chars.map(c => reverseMorseDict[c] || '?').join('');
              textResult.push(decodedWord);
            }
            outputArea.value = textResult.join(' ');
          }
          window.showToast('Translation completed!', 'success');
        } catch (err) {
          console.error(err);
          window.showToast('Error during translation.', 'danger');
        }
      };
    }

    if (clearBtn) {
      clearBtn.onclick = () => {
        if (inputArea) inputArea.value = '';
        if (outputArea) outputArea.value = '';
      };
    }

    // Web Audio API Morse Code Synthesizer
    if (playBtn) {
      let audioCtx = null;
      playBtn.onclick = async () => {
        const morseStr = isTextToMorse ? outputArea.value : inputArea.value;
        if (!morseStr.trim()) {
          window.showToast('No Morse code to play.', 'warning');
          return;
        }

        try {
          if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          }
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          window.showToast('Playing Morse code audio...', 'info');
          playMorseSound(morseStr, audioCtx);
        } catch (err) {
          console.error(err);
          window.showToast('Audio playback failed.', 'danger');
        }
      };
    }

    function playMorseSound(morse, ctx) {
      const dotDuration = 0.1; // seconds
      const dashDuration = dotDuration * 3;
      const interSymbolGap = dotDuration;
      const interLetterGap = dotDuration * 3;
      const interWordGap = dotDuration * 7;

      let currentTime = ctx.currentTime;

      for (let i = 0; i < morse.length; i++) {
        const symbol = morse[i];

        if (symbol === '.' || symbol === '-') {
          const duration = symbol === '.' ? dotDuration : dashDuration;
          
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, currentTime); // 600 Hz tone

          gain.gain.setValueAtTime(0, currentTime);
          gain.gain.linearRampToValueAtTime(0.1, currentTime + 0.005);
          gain.gain.setValueAtTime(0.1, currentTime + duration - 0.005);
          gain.gain.linearRampToValueAtTime(0, currentTime + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(currentTime);
          osc.stop(currentTime + duration);

          currentTime += duration + interSymbolGap;
        } else if (symbol === ' ') {
          // check if next is a word boundary
          if (morse[i + 1] === '/') {
            currentTime += interWordGap;
            i++; // skip slash
          } else {
            currentTime += interLetterGap;
          }
        } else if (symbol === '/') {
          currentTime += interWordGap;
        }
      }
    }
  }

  // ==========================================
  // COLOR SPACE TRANSLATOR TOOLS
  // ==========================================
  if (isRgbToHex || isHexToRgb || isRgbToHsl || isHslToRgb) {
    const previewBox = document.getElementById('color-preview');
    const convertBtn = document.getElementById('color-convert-btn');
    const colorPicker = document.getElementById('color-picker-input');

    if (convertBtn) {
      convertBtn.onclick = () => {
        try {
          let hexVal = '#000000';

          if (isRgbToHex) {
            const r = parseInt(document.getElementById('rgb-r').value) || 0;
            const g = parseInt(document.getElementById('rgb-g').value) || 0;
            const b = parseInt(document.getElementById('rgb-b').value) || 0;

            if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
              throw new Error("RGB channels must be between 0 and 255.");
            }

            hexVal = rgbToHex(r, g, b);
            document.getElementById('output-hex').value = hexVal;

          } else if (isHexToRgb) {
            const hex = document.getElementById('hex-input').value.trim();
            const rgb = hexToRgb(hex);

            document.getElementById('output-r').value = rgb.r;
            document.getElementById('output-g').value = rgb.g;
            document.getElementById('output-b').value = rgb.b;
            hexVal = hex;

          } else if (isRgbToHsl) {
            const r = parseInt(document.getElementById('rgb-r').value) || 0;
            const g = parseInt(document.getElementById('rgb-g').value) || 0;
            const b = parseInt(document.getElementById('rgb-b').value) || 0;

            if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
              throw new Error("RGB channels must be between 0 and 255.");
            }

            const hsl = rgbToHsl(r, g, b);
            document.getElementById('output-h').value = Math.round(hsl.h);
            document.getElementById('output-s').value = Math.round(hsl.s * 100);
            document.getElementById('output-l').value = Math.round(hsl.l * 100);
            hexVal = rgbToHex(r, g, b);

          } else if (isHslToRgb) {
            const h = parseFloat(document.getElementById('hsl-h').value) || 0;
            const s = parseFloat(document.getElementById('hsl-s').value) || 0;
            const l = parseFloat(document.getElementById('hsl-l').value) || 0;

            if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
              throw new Error("H must be 0-360, S and L must be 0-100.");
            }

            const rgb = hslToRgb(h / 360, s / 100, l / 100);
            document.getElementById('output-r').value = rgb.r;
            document.getElementById('output-g').value = rgb.g;
            document.getElementById('output-b').value = rgb.b;
            hexVal = rgbToHex(rgb.r, rgb.g, rgb.b);
          }

          // Update Visual Previews
          if (previewBox) {
            previewBox.style.backgroundColor = hexVal;
          }
          if (colorPicker) {
            colorPicker.value = hexVal.startsWith('#') ? hexVal : '#' + hexVal;
          }
          window.showToast('Color translated successfully!', 'success');

        } catch (err) {
          console.error(err);
          window.showToast(err.message || 'Translation failed.', 'danger');
        }
      };
    }

    // Bidirectional color picker binding
    if (colorPicker) {
      colorPicker.oninput = (e) => {
        const hexVal = e.target.value;
        if (previewBox) {
          previewBox.style.backgroundColor = hexVal;
        }

        // Auto fill inputs based on active page
        if (isRgbToHex || isRgbToHsl) {
          const rgb = hexToRgb(hexVal);
          document.getElementById('rgb-r').value = rgb.r;
          document.getElementById('rgb-g').value = rgb.g;
          document.getElementById('rgb-b').value = rgb.b;
        } else if (isHexToRgb) {
          document.getElementById('hex-input').value = hexVal;
        } else if (isHslToRgb) {
          const rgb = hexToRgb(hexVal);
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
          document.getElementById('hsl-h').value = Math.round(hsl.h);
          document.getElementById('hsl-s').value = Math.round(hsl.s * 100);
          document.getElementById('hsl-l').value = Math.round(hsl.l * 100);
        }

        // Trigger conversion automatically
        if (convertBtn) convertBtn.click();
      };
    }
  }

  // --- Color Space Converters Helper Functions ---

  function rgbToHex(r, g, b) {
    const toHex = (c) => c.toString(16).padStart(2, '0').toUpperCase();
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function hexToRgb(hex) {
    let cleanHex = hex.trim().replace(/^#/, '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length !== 6) {
      throw new Error("Invalid hex color code. Must be 3 or 6 hex digits.");
    }
    const num = parseInt(cleanHex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s, l };
  }

  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }
});
