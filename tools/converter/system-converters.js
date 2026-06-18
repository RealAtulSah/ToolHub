/**
 * ToolHub Pro - Systems & Math Converters Engine
 * Handles Unit, Currency, Time Zone, and Unix Timestamp translations.
 */

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const isUnit = path.includes('unit.html');
  const isCurrency = path.includes('currency.html');
  const isTimeZone = path.includes('timezone.html');
  const isTimestamp = path.includes('timestamp.html');

  // ==========================================
  // UNIT CONVERTER
  // ==========================================
  if (isUnit) {
    const categorySelect = document.getElementById('unit-category');
    const fromUnitSelect = document.getElementById('unit-from');
    const toUnitSelect = document.getElementById('unit-to');
    const fromValInput = document.getElementById('unit-from-val');
    const toValInput = document.getElementById('unit-to-val');

    const unitDefs = {
      length: {
        label: "Length",
        units: {
          m: { label: "Meter (m)", factor: 1 },
          km: { label: "Kilometer (km)", factor: 1000 },
          cm: { label: "Centimeter (cm)", factor: 0.01 },
          mm: { label: "Millimeter (mm)", factor: 0.001 },
          mi: { label: "Mile (mi)", factor: 1609.344 },
          yd: { label: "Yard (yd)", factor: 0.9144 },
          ft: { label: "Foot (ft)", factor: 0.3048 },
          in: { label: "Inch (in)", factor: 0.0254 }
        }
      },
      mass: {
        label: "Mass / Weight",
        units: {
          kg: { label: "Kilogram (kg)", factor: 1 },
          g: { label: "Gram (g)", factor: 0.001 },
          mg: { label: "Milligram (mg)", factor: 0.000001 },
          lb: { label: "Pound (lb)", factor: 0.45359237 },
          oz: { label: "Ounce (oz)", factor: 0.028349523 }
        }
      },
      area: {
        label: "Area",
        units: {
          sq_m: { label: "Square Meter (m²)", factor: 1 },
          sq_km: { label: "Square Kilometer (km²)", factor: 1000000 },
          sq_mi: { label: "Square Mile (mi²)", factor: 2589988.11 },
          ac: { label: "Acre (ac)", factor: 4046.85642 },
          ha: { label: "Hectare (ha)", factor: 10000 }
        }
      },
      volume: {
        label: "Volume",
        units: {
          l: { label: "Liter (L)", factor: 1 },
          ml: { label: "Milliliter (mL)", factor: 0.001 },
          gal: { label: "Gallon (US)", factor: 3.78541 },
          qt: { label: "Quart (US)", factor: 0.946353 },
          cup: { label: "Cup (US)", factor: 0.236588 }
        }
      },
      speed: {
        label: "Speed",
        units: {
          mps: { label: "Meter/sec (m/s)", factor: 1 },
          kmh: { label: "Kilometer/hour (km/h)", factor: 0.2777778 },
          mph: { label: "Miles/hour (mph)", factor: 0.44704 },
          knot: { label: "Knot (kt)", factor: 0.514444 }
        }
      },
      data: {
        label: "Digital Data",
        units: {
          b: { label: "Bytes (B)", factor: 1 },
          kb: { label: "Kilobytes (KB)", factor: 1024 },
          mb: { label: "Megabytes (MB)", factor: 1024 * 1024 },
          gb: { label: "Gigabytes (GB)", factor: 1024 * 1024 * 1024 },
          tb: { label: "Terabytes (TB)", factor: 1024 * 1024 * 1024 * 1024 }
        }
      },
      temp: {
        label: "Temperature",
        units: {
          c: { label: "Celsius (°C)" },
          f: { label: "Fahrenheit (°F)" },
          k: { label: "Kelvin (K)" }
        }
      }
    };

    function populateUnits() {
      const cat = categorySelect.value;
      const def = unitDefs[cat];
      fromUnitSelect.innerHTML = '';
      toUnitSelect.innerHTML = '';
      
      for (let key in def.units) {
        const opt1 = new Option(def.units[key].label, key);
        const opt2 = new Option(def.units[key].label, key);
        fromUnitSelect.add(opt1);
        toUnitSelect.add(opt2);
      }
      
      // Default to separate options
      if (toUnitSelect.options.length > 1) {
        toUnitSelect.selectedIndex = 1;
      }
      doUnitConvert();
    }

    function doUnitConvert() {
      const cat = categorySelect.value;
      const fromUnit = fromUnitSelect.value;
      const toUnit = toUnitSelect.value;
      const val = parseFloat(fromValInput.value);

      if (isNaN(val)) {
        toValInput.value = '';
        return;
      }

      if (fromUnit === toUnit) {
        toValInput.value = val;
        return;
      }

      // Handle Temperature custom logic
      if (cat === 'temp') {
        let celsius = 0;
        if (fromUnit === 'c') celsius = val;
        else if (fromUnit === 'f') celsius = (val - 32) * 5/9;
        else if (fromUnit === 'k') celsius = val - 273.15;

        let result = 0;
        if (toUnit === 'c') result = celsius;
        else if (toUnit === 'f') result = (celsius * 9/5) + 32;
        else if (toUnit === 'k') result = celsius + 273.15;

        toValInput.value = Number(result.toFixed(6));
        return;
      }

      // Handle standard multiplicative units
      const def = unitDefs[cat];
      const baseVal = val * def.units[fromUnit].factor;
      const targetVal = baseVal / def.units[toUnit].factor;
      toValInput.value = Number(targetVal.toFixed(8));
    }

    categorySelect.onchange = () => populateUnits();
    fromUnitSelect.onchange = () => doUnitConvert();
    toUnitSelect.onchange = () => doUnitConvert();
    fromValInput.oninput = () => doUnitConvert();

    // Init
    populateUnits();
  }

  // ==========================================
  // CURRENCY CONVERTER (Real-time & Offline)
  // ==========================================
  if (isCurrency) {
    const fromCurrSelect = document.getElementById('curr-from');
    const toCurrSelect = document.getElementById('curr-to');
    const fromValInput = document.getElementById('curr-from-val');
    const toValInput = document.getElementById('curr-to-val');
    const rateInfo = document.getElementById('rate-info');

    // Static fallback rates (relative to USD)
    const fallbackRates = {
      USD: 1.0, EUR: 0.92, GBP: 0.79, JPY: 157.30, AUD: 1.50,
      CAD: 1.37, CHF: 0.89, CNY: 7.25, INR: 83.50, NZD: 1.63,
      ZAR: 18.20, BRL: 5.35, SGD: 1.35, HKD: 7.80
    };

    let activeRates = { ...fallbackRates };

    async function fetchRates() {
      try {
        rateInfo.innerText = "Fetching latest live rates...";
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) throw new Error("API network response issue.");
        const data = await res.json();
        
        if (data && data.rates) {
          activeRates = data.rates;
          rateInfo.innerHTML = `Live rates updated as of ${new Date(data.time_last_update_utc).toLocaleDateString()}`;
          doCurrencyConvert();
        }
      } catch (err) {
        console.warn("Using offline rates fallback:", err);
        rateInfo.innerHTML = `⚠️ Using offline/saved rates database (no internet connection)`;
      }
    }

    function doCurrencyConvert() {
      const fromCurr = fromCurrSelect.value;
      const toCurr = toCurrSelect.value;
      const val = parseFloat(fromValInput.value);

      if (isNaN(val)) {
        toValInput.value = '';
        return;
      }

      const rateFrom = activeRates[fromCurr] || fallbackRates[fromCurr] || 1;
      const rateTo = activeRates[toCurr] || fallbackRates[toCurr] || 1;
      const usdVal = val / rateFrom;
      const finalVal = usdVal * rateTo;
      
      toValInput.value = Number(finalVal.toFixed(4));
    }

    fromCurrSelect.onchange = () => doCurrencyConvert();
    toCurrSelect.onchange = () => doCurrencyConvert();
    fromValInput.oninput = () => doCurrencyConvert();

    // Populate currencies
    const currencyCodes = Object.keys(fallbackRates);
    fromCurrSelect.innerHTML = '';
    toCurrSelect.innerHTML = '';
    
    currencyCodes.forEach(code => {
      fromCurrSelect.add(new Option(code, code));
      toCurrSelect.add(new Option(code, code));
    });

    fromCurrSelect.value = 'USD';
    toCurrSelect.value = 'EUR';

    // Fetch and calculate
    fetchRates();
  }

  // ==========================================
  // TIME ZONE CONVERTER
  // ==========================================
  if (isTimeZone) {
    const tzDateInput = document.getElementById('tz-date');
    const tzTimeInput = document.getElementById('tz-time');
    const fromTzSelect = document.getElementById('tz-from');
    const toTzSelect = document.getElementById('tz-to');
    const outputArea = document.getElementById('tz-output');
    const hourSlider = document.getElementById('tz-hour-slider');
    const sliderLabel = document.getElementById('tz-slider-label');

    const commonZones = [
      { id: "UTC", label: "Coordinated Universal Time (UTC)" },
      { id: "America/New_York", label: "Eastern Time (ET - New York)" },
      { id: "America/Chicago", label: "Central Time (CT - Chicago)" },
      { id: "America/Denver", label: "Mountain Time (MT - Denver)" },
      { id: "America/Los_Angeles", label: "Pacific Time (PT - Los Angeles)" },
      { id: "Europe/London", label: "Greenwich Mean/British Time (London)" },
      { id: "Europe/Paris", label: "Central European Time (CET - Paris)" },
      { id: "Europe/Moscow", label: "Moscow Time (MSK)" },
      { id: "Asia/Kolkata", label: "Indian Standard Time (IST - India)" },
      { id: "Asia/Singapore", label: "Singapore Time (SGT)" },
      { id: "Asia/Tokyo", label: "Japan Standard Time (JST - Tokyo)" },
      { id: "Australia/Sydney", label: "Eastern Standard Time (AEST - Sydney)" }
    ];

    // Populate zone selects
    fromTzSelect.innerHTML = '';
    toTzSelect.innerHTML = '';
    commonZones.forEach(z => {
      fromTzSelect.add(new Option(z.label, z.id));
      toTzSelect.add(new Option(z.label, z.id));
    });

    // Default values
    const now = new Date();
    tzDateInput.value = now.toISOString().split('T')[0];
    tzTimeInput.value = now.toTimeString().split(' ')[0].substring(0, 5);
    
    // Set default selectors
    fromTzSelect.value = "America/New_York";
    toTzSelect.value = "Asia/Kolkata";

    function doTzConvert() {
      const dateVal = tzDateInput.value;
      const timeVal = tzTimeInput.value;
      const fromZone = fromTzSelect.value;
      const toZone = toTzSelect.value;

      if (!dateVal || !timeVal) return;

      try {
        // Construct localized Date object from date & time fields relative to 'fromZone'
        const dtStr = `${dateVal}T${timeVal}:00`;
        // Format to ISO string in source zone using Intl
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: fromZone,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false
        });
        
        // Convert input time into absolute UTC millisec epoch
        // We use a helper parse approach:
        const parts = dtStr.split(/[-T:]/);
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const hour = parseInt(parts[3]);
        const min = parseInt(parts[4]);

        // Find difference between local computer and target fromZone
        // Construct standard UTC representation first
        const localDate = new Date(Date.UTC(year, month, day, hour, min));
        
        // Adjust for timezone offset
        const tzOffset = getTimezoneOffset(fromZone, localDate);
        const absoluteTime = new Date(localDate.getTime() - tzOffset);

        // Format to target timezone
        const options = {
          timeZone: toZone,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        };

        const targetFmt = new Intl.DateTimeFormat('en-US', options);
        outputArea.value = targetFmt.format(absoluteTime);
        
        // Update slider position
        if (hourSlider) {
          hourSlider.value = hour;
          sliderLabel.innerText = `${hour.toString().padStart(2, '0')}:00`;
        }

      } catch (err) {
        console.error(err);
        outputArea.value = "Translation offset error.";
      }
    }

    // Offset helper
    function getTimezoneOffset(tz, date) {
      const temp = date.toLocaleString('en-US', { timeZone: tz, hour12: false });
      const m = temp.match(/(\d+)\/(\d+)\/(\d+),\s+(\d+):(\d+):(\d+)/);
      if (!m) return 0;
      const dateInTz = new Date(Date.UTC(
        parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]),
        parseInt(m[4]), parseInt(m[5]), parseInt(m[6])
      ));
      return dateInTz.getTime() - date.getTime();
    }

    // Slider controls to plan meetings
    if (hourSlider) {
      hourSlider.oninput = (e) => {
        const val = parseInt(e.target.value);
        sliderLabel.innerText = `${val.toString().padStart(2, '0')}:00`;
        tzTimeInput.value = `${val.toString().padStart(2, '0')}:00`;
        doTzConvert();
      };
    }

    tzDateInput.onchange = () => doTzConvert();
    tzTimeInput.onchange = () => doTzConvert();
    fromTzSelect.onchange = () => doTzConvert();
    toTzSelect.onchange = () => doTzConvert();

    // Initial Trigger
    doTzConvert();
  }

  // ==========================================
  // UNIX TIMESTAMP CONVERTER
  // ==========================================
  if (isTimestamp) {
    const liveClock = document.getElementById('epoch-live-clock');
    const stampInput = document.getElementById('stamp-input');
    const stampToDateBtn = document.getElementById('stamp-to-date-btn');
    const dateInputStr = document.getElementById('date-input-str');
    const dateToStampBtn = document.getElementById('date-to-stamp-btn');
    const outputArea = document.getElementById('stamp-output');
    const useCurrentBtn = document.getElementById('use-current-btn');

    // Run active clock widget
    if (liveClock) {
      setInterval(() => {
        liveClock.innerText = Math.floor(Date.now() / 1000);
      }, 1000);
    }

    if (useCurrentBtn) {
      useCurrentBtn.onclick = () => {
        const seconds = Math.floor(Date.now() / 1000);
        if (stampInput) {
          stampInput.value = seconds;
        }
        window.showToast('Using current system time.', 'info');
        if (stampToDateBtn) stampToDateBtn.click();
      };
    }

    // Timestamp to Date
    if (stampToDateBtn) {
      stampToDateBtn.onclick = () => {
        const stamp = stampInput.value.trim();
        if (!stamp) {
          window.showToast('Please enter a timestamp.', 'warning');
          return;
        }

        try {
          const num = parseInt(stamp);
          if (isNaN(num)) throw new Error("Invalid timestamp number.");
          
          // Detect seconds vs milliseconds
          const date = stamp.length > 11 ? new Date(num) : new Date(num * 1000);
          if (isNaN(date.getTime())) throw new Error("Invalid date representation.");

          outputArea.value = `GMT/UTC: ${date.toUTCString()}\nLocal Time: ${date.toString()}\nISO 8601: ${date.toISOString()}`;
          window.showToast('Timestamp converted successfully!', 'success');
        } catch (err) {
          window.showToast(err.message, 'danger');
        }
      };
    }

    // Date to Timestamp
    if (dateToStampBtn) {
      dateToStampBtn.onclick = () => {
        const dateStr = dateInputStr.value.trim();
        if (!dateStr) {
          window.showToast('Please enter a date string.', 'warning');
          return;
        }

        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) throw new Error("Unable to parse date format. Try YYYY-MM-DD HH:MM:SS");

          outputArea.value = `Seconds: ${Math.floor(date.getTime() / 1000)}\nMilliseconds: ${date.getTime()}`;
          window.showToast('Date converted successfully!', 'success');
        } catch (err) {
          window.showToast(err.message, 'danger');
        }
      };
    }
  }

});
