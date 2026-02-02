/**
 * MMR Chart Module
 * Interactive Rocket League MMR progression chart with MagnetBear branding
 */

// Configuration
const CONFIG = {
  dataUrl: 'data/mmr-data.json',
  gc1Threshold: 1435,
  padding: { top: 20, right: 20, bottom: 40, left: 60 },
  
  // Controller acquisition date - the moment everything changed
  controllerDate: '2025-11-28',
  controllerImageUrl: 'assets/img/controller_sm.png',
  controllerBaseMmr: 797, // MMR when controller was received
  
  colors: {
    line: '#f59e0b',
    lineGlow: 'rgba(245, 158, 11, 0.15)',
    grid: 'rgba(255, 255, 255, 0.05)',
    text: 'rgba(255, 255, 255, 0.5)',
    controllerMarker: '#ff69b4' // Hot pink for the controller marker
  },
  rankColors: {
    'Bronze': 'rgba(139, 90, 43, 0.25)',
    'Silver': 'rgba(169, 169, 169, 0.25)',
    'Gold': 'rgba(212, 175, 55, 0.25)',
    'Platinum': 'rgba(0, 182, 182, 0.25)',
    'Diamond': 'rgba(37, 161, 213, 0.25)',
    'Champion': 'rgba(142, 89, 225, 0.25)',
    'Grand Champion': 'rgba(227, 150, 68, 0.25)',
    'Supersonic Legend': 'rgba(251, 163, 177, 0.25)'
  }
};

// State
let chartData = null;
let chartDimensions = null;
let scales = null;

// Zoom/Pan state
let viewRange = null;  // { start: Date, end: Date } - current visible range
let fullRange = null;  // { start: Date, end: Date } - full data range
let isPanning = false;
let panStartX = 0;
let panStartRange = null;
const MIN_ZOOM_DAYS = 14;  // Minimum zoom level (2 weeks)
const ZOOM_FACTOR = 0.15;  // How much to zoom per wheel tick

// DOM Elements
const elements = {
  chartContainer: null,
  chartSvg: null,
  cursorTracker: null,
  cursorLine: null,
  tooltip: null,
  tooltipDate: null,
  tooltipRank: null,
  tooltipDivision: null,
  tooltipMmr: null,
  tooltipGcDiff: null,
  tooltipEstimated: null
};

/**
 * Initialize the chart
 */
async function init() {
  cacheElements();
  
  try {
    chartData = await loadData();
    updateStatsBar();
    setupChart();
    renderChart();
    attachEventListeners();
  } catch (error) {
    console.error('Failed to initialize MMR chart:', error);
  }
}

/**
 * Cache DOM elements
 */
function cacheElements() {
  elements.chartContainer = document.getElementById('chartContainer');
  elements.chartSvg = document.getElementById('chartSvg');
  elements.cursorTracker = document.getElementById('cursorTracker');
  elements.cursorLine = document.getElementById('cursorLine');
  elements.tooltip = document.getElementById('tooltip');
  elements.tooltipDate = document.getElementById('tooltipDate');
  elements.tooltipRank = document.getElementById('tooltipRank');
  elements.tooltipDivision = document.getElementById('tooltipDivision');
  elements.tooltipMmr = document.getElementById('tooltipMmr');
  elements.tooltipGcDiff = document.getElementById('tooltipGcDiff');
  elements.tooltipEstimated = document.getElementById('tooltipEstimated');
}

/**
 * Load MMR data from JSON
 */
async function loadData() {
  const response = await fetch(CONFIG.dataUrl);
  if (!response.ok) throw new Error('Failed to load MMR data');
  return response.json();
}

/**
 * Update the stats bar with current data
 */
function updateStatsBar() {
  const { currentRating, rankThresholds } = chartData;
  
  document.getElementById('statRank').textContent = currentRating.rank;
  document.getElementById('statDivision').textContent = currentRating.division;
  document.getElementById('statRating').textContent = currentRating.mmr.toLocaleString();
  document.getElementById('statMatches').textContent = currentRating.matches.toLocaleString();
  
  const gcDiff = currentRating.mmr - rankThresholds.gc1;
  const gcDiffEl = document.getElementById('statToGC');
  gcDiffEl.textContent = gcDiff >= 0 ? `+${gcDiff}` : gcDiff.toString();
  gcDiffEl.className = `mmr-stat-value ${gcDiff >= 0 ? 'positive' : 'negative'}`;
  
  document.getElementById('playlistBadge').textContent = chartData.profile.playlist;
  
  // Update controller gain stat
  const controllerGainEl = document.getElementById('statControllerGain');
  if (controllerGainEl) {
    const mmrGain = currentRating.mmr - CONFIG.controllerBaseMmr;
    controllerGainEl.textContent = mmrGain >= 0 ? `+${mmrGain}` : mmrGain.toString();
    controllerGainEl.className = `mmr-stat-value ${mmrGain >= 0 ? 'positive' : 'negative'}`;
  }
  
  // Update last updated timestamp
  if (chartData.lastUpdated) {
    const lastUpdated = new Date(chartData.lastUpdated);
    const timeAgo = getTimeAgo(lastUpdated);
    document.getElementById('lastUpdated').textContent = `Last updated: ${timeAgo}`;
  }
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Setup chart dimensions and scales
 */
function setupChart() {
  const rect = elements.chartContainer.getBoundingClientRect();
  
  chartDimensions = {
    width: rect.width,
    height: rect.height,
    innerWidth: rect.width - CONFIG.padding.left - CONFIG.padding.right,
    innerHeight: rect.height - CONFIG.padding.top - CONFIG.padding.bottom
  };
  
  // Parse dates and find full extent
  const dates = chartData.dataPoints.map(d => new Date(d.date));
  
  // Initialize full range (never changes)
  if (!fullRange) {
    fullRange = {
      start: dates[0],
      end: dates[dates.length - 1]
    };
  }
  
  // Initialize view range to full range if not set
  if (!viewRange) {
    viewRange = {
      start: new Date(fullRange.start),
      end: new Date(fullRange.end)
    };
  }
  
  // Get MMR values within current view range
  const visiblePoints = chartData.dataPoints.filter(d => {
    const date = new Date(d.date);
    return date >= viewRange.start && date <= viewRange.end;
  });
  
  const mmrValues = visiblePoints.length > 0 
    ? visiblePoints.map(d => d.mmr)
    : chartData.dataPoints.map(d => d.mmr);
  
  // Add padding to MMR range
  const mmrMin = Math.min(...mmrValues) - 50;
  const mmrMax = Math.max(...mmrValues) + 50;
  
  scales = {
    x: {
      min: viewRange.start,
      max: viewRange.end,
      range: [CONFIG.padding.left, chartDimensions.width - CONFIG.padding.right]
    },
    y: {
      min: mmrMin,
      max: mmrMax,
      range: [chartDimensions.height - CONFIG.padding.bottom, CONFIG.padding.top]
    }
  };
  
  // Set SVG viewBox
  elements.chartSvg.setAttribute('viewBox', `0 0 ${chartDimensions.width} ${chartDimensions.height}`);
  
  // Update zoom indicator
  updateZoomIndicator();
}

/**
 * Scale a date to x coordinate
 */
function scaleX(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const ratio = (dateObj - scales.x.min) / (scales.x.max - scales.x.min);
  return scales.x.range[0] + ratio * (scales.x.range[1] - scales.x.range[0]);
}

/**
 * Scale an MMR value to y coordinate
 */
function scaleY(mmr) {
  const ratio = (mmr - scales.y.min) / (scales.y.max - scales.y.min);
  return scales.y.range[0] - ratio * (scales.y.range[0] - scales.y.range[1]);
}

/**
 * Inverse scale from x coordinate to date
 */
function inverseScaleX(x) {
  const ratio = (x - scales.x.range[0]) / (scales.x.range[1] - scales.x.range[0]);
  return new Date(scales.x.min.getTime() + ratio * (scales.x.max - scales.x.min));
}

/**
 * Inverse scale from y coordinate to MMR
 */
function inverseScaleY(y) {
  const ratio = (scales.y.range[0] - y) / (scales.y.range[0] - scales.y.range[1]);
  return scales.y.min + ratio * (scales.y.max - scales.y.min);
}

/**
 * Render the complete chart
 */
function renderChart() {
  const svg = elements.chartSvg;
  svg.innerHTML = '';
  
  // Create groups for layering
  const bandsGroup = createSvgElement('g', { class: 'bands-group' });
  const gridGroup = createSvgElement('g', { class: 'grid-group' });
  const controllerMarkerGroup = createSvgElement('g', { class: 'controller-marker-group' });
  const lineGroup = createSvgElement('g', { class: 'line-group' });
  const pointsGroup = createSvgElement('g', { class: 'points-group' });
  const controllerDotGroup = createSvgElement('g', { class: 'controller-dot-group' }); // Foreground dot
  const axisGroup = createSvgElement('g', { class: 'axis-group' });
  
  // Render each layer
  renderRankBands(bandsGroup);
  renderGrid(gridGroup);
  renderControllerMarker(controllerMarkerGroup); // Background: line, glow, dot glow
  renderLine(lineGroup);
  renderDataPoints(pointsGroup);
  renderControllerDotForeground(controllerDotGroup); // Foreground: solid dot on top
  renderAxes(axisGroup);
  
  // Append groups in order (controller dot after points = on top)
  svg.appendChild(bandsGroup);
  svg.appendChild(gridGroup);
  svg.appendChild(controllerMarkerGroup);
  svg.appendChild(lineGroup);
  svg.appendChild(pointsGroup);
  svg.appendChild(controllerDotGroup); // Dot renders on top of data points
  svg.appendChild(axisGroup);
  
  // Render controller image overlay (HTML, not SVG)
  renderControllerImage();
}

/**
 * Create an SVG element
 */
function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

/**
 * Render rank bands (colored horizontal stripes)
 */
function renderRankBands(group) {
  chartData.rankBands.forEach(band => {
    // Check if band is in visible range
    if (band.maxMmr < scales.y.min || band.minMmr > scales.y.max) return;
    
    const y1 = scaleY(Math.min(band.maxMmr, scales.y.max));
    const y2 = scaleY(Math.max(band.minMmr, scales.y.min));
    
    const rect = createSvgElement('rect', {
      class: 'mmr-rank-band',
      x: CONFIG.padding.left,
      y: y1,
      width: chartDimensions.innerWidth,
      height: y2 - y1,
      fill: band.color
    });
    
    group.appendChild(rect);
    
    // Add rank label
    const label = createSvgElement('text', {
      class: 'mmr-rank-label',
      x: CONFIG.padding.left + 8,
      y: (y1 + y2) / 2 + 4
    });
    label.textContent = band.name;
    group.appendChild(label);
  });
}

/**
 * Render grid lines
 */
function renderGrid(group) {
  // Horizontal grid lines (MMR)
  const mmrStep = 50;
  const startMmr = Math.ceil(scales.y.min / mmrStep) * mmrStep;
  
  for (let mmr = startMmr; mmr <= scales.y.max; mmr += mmrStep) {
    const y = scaleY(mmr);
    const line = createSvgElement('line', {
      class: 'mmr-grid-line',
      x1: CONFIG.padding.left,
      y1: y,
      x2: chartDimensions.width - CONFIG.padding.right,
      y2: y
    });
    group.appendChild(line);
  }
  
  // Vertical grid lines (dates) - monthly
  const monthStep = 1;
  let currentDate = new Date(scales.x.min);
  currentDate.setDate(1);
  currentDate.setMonth(currentDate.getMonth() + 1);
  
  while (currentDate < scales.x.max) {
    const x = scaleX(currentDate);
    const line = createSvgElement('line', {
      class: 'mmr-grid-line',
      x1: x,
      y1: CONFIG.padding.top,
      x2: x,
      y2: chartDimensions.height - CONFIG.padding.bottom
    });
    group.appendChild(line);
    currentDate.setMonth(currentDate.getMonth() + monthStep);
  }
}

/**
 * Render the MMR line
 */
function renderLine(group) {
  const points = chartData.dataPoints.map(d => ({
    x: scaleX(d.date),
    y: scaleY(d.mmr)
  }));
  
  // Create smooth path using cardinal spline
  const pathD = createSmoothPath(points);
  
  // Glow effect
  const glowPath = createSvgElement('path', {
    class: 'mmr-line-glow',
    d: pathD
  });
  group.appendChild(glowPath);
  
  // Main line
  const linePath = createSvgElement('path', {
    class: 'mmr-line',
    d: pathD
  });
  group.appendChild(linePath);
}

/**
 * Create a linear path through points (straight line segments)
 * No bezier curves - prevents "curving back" on the time axis
 */
function createSmoothPath(points) {
  if (points.length < 2) return '';
  
  let d = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  
  return d;
}

/**
 * Render data points
 */
function renderDataPoints(group) {
  chartData.dataPoints.forEach((d, i) => {
    const x = scaleX(d.date);
    const y = scaleY(d.mmr);
    
    const circle = createSvgElement('circle', {
      class: 'mmr-data-point',
      cx: x,
      cy: y,
      r: 4,
      'data-index': i
    });
    
    group.appendChild(circle);
  });
}

/**
 * Render axes
 */
function renderAxes(group) {
  // Y-axis labels (MMR)
  const mmrStep = 100;
  const startMmr = Math.ceil(scales.y.min / mmrStep) * mmrStep;
  
  for (let mmr = startMmr; mmr <= scales.y.max; mmr += mmrStep) {
    const y = scaleY(mmr);
    const label = createSvgElement('text', {
      class: 'mmr-axis-label',
      x: CONFIG.padding.left - 8,
      y: y + 4,
      'text-anchor': 'end'
    });
    label.textContent = mmr.toString();
    group.appendChild(label);
  }
  
  // X-axis labels (dates)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let currentDate = new Date(scales.x.min);
  currentDate.setDate(1);
  
  // Start from next month
  currentDate.setMonth(currentDate.getMonth() + 1);
  
  while (currentDate < scales.x.max) {
    const x = scaleX(currentDate);
    const label = createSvgElement('text', {
      class: 'mmr-axis-label',
      x: x,
      y: chartDimensions.height - CONFIG.padding.bottom + 20,
      'text-anchor': 'middle'
    });
    label.textContent = `${months[currentDate.getMonth()]} '${currentDate.getFullYear().toString().slice(-2)}`;
    group.appendChild(label);
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
}

/**
 * Render the controller acquisition marker (pink vertical line + dot)
 * Split into background (glow) and foreground (dot) elements
 */
function renderControllerMarker(group) {
  const controllerDate = new Date(CONFIG.controllerDate);
  
  // Check if date is within chart range
  if (controllerDate < scales.x.min || controllerDate > scales.x.max) {
    return; // Controller date not in visible range
  }
  
  const x = scaleX(controllerDate);
  
  // Get the MMR at this date by interpolation
  const interpolated = interpolateDataAtDate(controllerDate);
  const y = scaleY(interpolated.mmr);
  
  // Pink vertical line from bottom to TOP of chart (full height)
  const verticalLine = createSvgElement('line', {
    class: 'controller-vertical-line',
    x1: x,
    y1: chartDimensions.height - CONFIG.padding.bottom,
    x2: x,
    y2: CONFIG.padding.top, // Extend to top
    stroke: CONFIG.colors.controllerMarker,
    'stroke-width': 2,
    'stroke-dasharray': '6,4',
    opacity: 0.8
  });
  group.appendChild(verticalLine);
  
  // Glow effect for the line
  const lineGlow = createSvgElement('line', {
    class: 'controller-vertical-line-glow',
    x1: x,
    y1: chartDimensions.height - CONFIG.padding.bottom,
    x2: x,
    y2: CONFIG.padding.top, // Extend to top
    stroke: CONFIG.colors.controllerMarker,
    'stroke-width': 6,
    opacity: 0.2
  });
  group.insertBefore(lineGlow, verticalLine);
  
  // Pink dot GLOW at the intersection point (this goes in background group)
  const dotGlow = createSvgElement('circle', {
    class: 'controller-dot-glow',
    cx: x,
    cy: y,
    r: 12,
    fill: CONFIG.colors.controllerMarker,
    opacity: 0.3
  });
  group.appendChild(dotGlow);
  
  // Store position for the controller image (at top of chart now)
  elements.controllerMarkerX = x;
  elements.controllerMarkerY = y;
  elements.controllerMarkerTopY = CONFIG.padding.top; // For positioning image at top
}

/**
 * Render the controller dot in the foreground (on top of data points)
 */
function renderControllerDotForeground(group) {
  const controllerDate = new Date(CONFIG.controllerDate);
  
  // Check if date is within chart range
  if (controllerDate < scales.x.min || controllerDate > scales.x.max) {
    return;
  }
  
  const x = scaleX(controllerDate);
  const interpolated = interpolateDataAtDate(controllerDate);
  const y = scaleY(interpolated.mmr);
  
  // Pink dot at the intersection point (foreground, on top of other points)
  const dot = createSvgElement('circle', {
    class: 'controller-dot',
    cx: x,
    cy: y,
    r: 6,
    fill: CONFIG.colors.controllerMarker,
    stroke: '#fff',
    'stroke-width': 2
  });
  group.appendChild(dot);
}

/**
 * Render the controller image overlay (positioned at top of chart, above graph area)
 */
function renderControllerImage() {
  // Remove existing controller image and label if any
  const existing = document.querySelector('.controller-marker-image');
  if (existing) existing.remove();
  const existingLabel = document.querySelector('.controller-marker-label');
  if (existingLabel) existingLabel.remove();
  
  if (!elements.controllerMarkerX) {
    console.log('[MMR Chart] Controller marker position not set, skipping image');
    return;
  }
  
  const container = elements.chartContainer;
  if (!container) {
    console.warn('[MMR Chart] Chart container not found for controller image');
    return;
  }
  
  // Create controller image element
  const img = document.createElement('img');
  img.className = 'controller-marker-image';
  img.src = CONFIG.controllerImageUrl;
  img.alt = 'Controller Acquired!';
  
  // Debug: log when image loads or fails
  img.onload = () => console.log('[MMR Chart] Controller image loaded successfully');
  img.onerror = () => console.error('[MMR Chart] Failed to load controller image:', CONFIG.controllerImageUrl);
  
  // Position at top of chart (above graph area, not over data)
  const imgSize = 48; // Display size
  const left = elements.controllerMarkerX - imgSize / 2;
  const top = -imgSize - 8; // Above the chart container entirely
  
  console.log('[MMR Chart] Controller image position:', { left, top, markerX: elements.controllerMarkerX });
  
  img.style.cssText = `
    position: absolute;
    left: ${left}px;
    top: ${top}px;
    width: ${imgSize}px;
    height: ${imgSize}px;
    pointer-events: none;
    z-index: 10;
    filter: drop-shadow(0 0 8px rgba(255, 105, 180, 0.6));
    animation: controllerBounce 2s ease-in-out infinite;
  `;
  
  container.appendChild(img);
  
  // Create permanent label/tooltip
  renderControllerLabel(container, left, top, imgSize);
}

/**
 * Render the permanent label for the controller marker
 */
function renderControllerLabel(container, imgLeft, imgTop, imgSize) {
  const label = document.createElement('div');
  label.className = 'controller-marker-label';
  
  // Format the date
  const controllerDate = new Date(CONFIG.controllerDate);
  const dateStr = controllerDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  label.innerHTML = `
    <span class="controller-label-title">Started Using</span>
    <span class="controller-label-subtitle">New Controller</span>
    <span class="controller-label-date">${dateStr}</span>
  `;
  
  // Position to the left of the controller image (with more gap)
  const labelWidth = 110;
  const left = imgLeft - labelWidth - 24;
  const top = imgTop + (imgSize / 2) - 28; // Vertically center with image
  
  label.style.cssText = `
    position: absolute;
    left: ${left}px;
    top: ${top}px;
    pointer-events: none;
    z-index: 10;
  `;
  
  container.appendChild(label);
}

/**
 * Attach event listeners for interactivity
 */
function attachEventListeners() {
  elements.chartContainer.addEventListener('mousemove', handleMouseMove);
  elements.chartContainer.addEventListener('mouseleave', handleMouseLeave);
  elements.chartContainer.addEventListener('click', handleClick);
  
  // Zoom with mouse wheel
  elements.chartContainer.addEventListener('wheel', handleWheel, { passive: false });
  
  // Pan with mouse drag
  elements.chartContainer.addEventListener('mousedown', handlePanStart);
  document.addEventListener('mousemove', handlePanMove);
  document.addEventListener('mouseup', handlePanEnd);
  
  // Handle window resize
  window.addEventListener('resize', debounce(() => {
    setupChart();
    renderChart();
  }, 250));
}

/**
 * Handle mouse wheel for zooming
 */
function handleWheel(e) {
  e.preventDefault();
  
  const rect = elements.chartContainer.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  
  // Only zoom if mouse is in chart area
  if (mouseX < CONFIG.padding.left || mouseX > chartDimensions.width - CONFIG.padding.right) {
    return;
  }
  
  // Get the date at mouse position (zoom center)
  const mouseDate = inverseScaleX(mouseX);
  
  // Calculate current range in milliseconds
  const currentRange = viewRange.end - viewRange.start;
  const minRange = MIN_ZOOM_DAYS * 24 * 60 * 60 * 1000;
  const maxRange = fullRange.end - fullRange.start;
  
  // Determine zoom direction
  const zoomIn = e.deltaY < 0;
  const factor = zoomIn ? (1 - ZOOM_FACTOR) : (1 + ZOOM_FACTOR);
  
  // Calculate new range
  let newRange = currentRange * factor;
  newRange = Math.max(minRange, Math.min(maxRange, newRange));
  
  // Calculate position ratio (where mouse is in current view)
  const ratio = (mouseDate - viewRange.start) / currentRange;
  
  // Apply zoom centered on mouse position
  const newStart = new Date(mouseDate.getTime() - newRange * ratio);
  const newEnd = new Date(mouseDate.getTime() + newRange * (1 - ratio));
  
  // Clamp to full range
  if (newStart < fullRange.start) {
    viewRange.start = new Date(fullRange.start);
    viewRange.end = new Date(fullRange.start.getTime() + newRange);
  } else if (newEnd > fullRange.end) {
    viewRange.end = new Date(fullRange.end);
    viewRange.start = new Date(fullRange.end.getTime() - newRange);
  } else {
    viewRange.start = newStart;
    viewRange.end = newEnd;
  }
  
  // Clamp again to ensure within bounds
  if (viewRange.start < fullRange.start) viewRange.start = new Date(fullRange.start);
  if (viewRange.end > fullRange.end) viewRange.end = new Date(fullRange.end);
  
  // Re-render
  setupChart();
  renderChart();
}

/**
 * Handle pan start
 */
function handlePanStart(e) {
  // Only start pan on left click
  if (e.button !== 0) return;
  
  const rect = elements.chartContainer.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  
  // Only pan if in chart area
  if (mouseX < CONFIG.padding.left || mouseX > chartDimensions.width - CONFIG.padding.right) {
    return;
  }
  
  // Check if zoomed in (panning only makes sense when zoomed)
  const currentRange = viewRange.end - viewRange.start;
  const maxRange = fullRange.end - fullRange.start;
  if (currentRange >= maxRange * 0.99) return; // Not zoomed, don't pan
  
  isPanning = true;
  panStartX = e.clientX;
  panStartRange = {
    start: new Date(viewRange.start),
    end: new Date(viewRange.end)
  };
  
  elements.chartContainer.style.cursor = 'grabbing';
  e.preventDefault();
}

/**
 * Handle pan move
 */
function handlePanMove(e) {
  if (!isPanning) return;
  
  const deltaX = e.clientX - panStartX;
  const pixelsPerMs = chartDimensions.innerWidth / (panStartRange.end - panStartRange.start);
  const deltaMs = -deltaX / pixelsPerMs;
  
  let newStart = new Date(panStartRange.start.getTime() + deltaMs);
  let newEnd = new Date(panStartRange.end.getTime() + deltaMs);
  
  // Clamp to full range
  if (newStart < fullRange.start) {
    const shift = fullRange.start - newStart;
    newStart = new Date(fullRange.start);
    newEnd = new Date(newEnd.getTime() + shift);
  }
  if (newEnd > fullRange.end) {
    const shift = newEnd - fullRange.end;
    newEnd = new Date(fullRange.end);
    newStart = new Date(newStart.getTime() - shift);
  }
  
  viewRange.start = newStart;
  viewRange.end = newEnd;
  
  setupChart();
  renderChart();
}

/**
 * Handle pan end
 */
function handlePanEnd() {
  if (isPanning) {
    isPanning = false;
    elements.chartContainer.style.cursor = '';
  }
}

/**
 * Reset zoom to full view
 */
function resetZoom() {
  if (!fullRange) return;
  
  viewRange = {
    start: new Date(fullRange.start),
    end: new Date(fullRange.end)
  };
  
  setupChart();
  renderChart();
}

/**
 * Update zoom indicator / reset button visibility
 */
function updateZoomIndicator() {
  let indicator = document.getElementById('zoomResetBtn');
  
  // Check if zoomed
  const currentRange = viewRange.end - viewRange.start;
  const maxRange = fullRange.end - fullRange.start;
  const isZoomed = currentRange < maxRange * 0.99;
  
  if (isZoomed) {
    if (!indicator) {
      indicator = document.createElement('button');
      indicator.id = 'zoomResetBtn';
      indicator.className = 'zoom-reset-btn';
      indicator.innerHTML = '↩ Reset Zoom';
      indicator.onclick = resetZoom;
      elements.chartContainer.parentElement.appendChild(indicator);
    }
    indicator.style.display = 'block';
  } else if (indicator) {
    indicator.style.display = 'none';
  }
}

/**
 * Handle mouse movement over chart
 */
function handleMouseMove(e) {
  const rect = elements.chartContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Check if within chart area
  if (x < CONFIG.padding.left || x > chartDimensions.width - CONFIG.padding.right) {
    handleMouseLeave();
    return;
  }
  
  // Get date and MMR at cursor position
  const cursorDate = inverseScaleX(x);
  const cursorMmr = inverseScaleY(y);
  
  // Find interpolated MMR at this date
  const interpolated = interpolateDataAtDate(cursorDate);
  
  // Update cursor tracker position
  const trackerY = scaleY(interpolated.mmr);
  elements.cursorTracker.style.left = `${x}px`;
  elements.cursorTracker.style.top = `${trackerY}px`;
  elements.cursorTracker.classList.add('active');
  
  // Update cursor line height
  const lineHeight = chartDimensions.height - CONFIG.padding.bottom - trackerY;
  elements.cursorLine.style.height = `${lineHeight}px`;
  
  // Update and position tooltip
  updateTooltip(interpolated, !interpolated.exact);
  positionTooltip(x, trackerY);
  elements.tooltip.classList.add('visible');
}

/**
 * Handle mouse leaving chart
 */
function handleMouseLeave() {
  elements.cursorTracker.classList.remove('active');
  elements.tooltip.classList.remove('visible');
}

/**
 * Handle click on chart (for exact data points)
 */
function handleClick(e) {
  const target = e.target;
  
  if (target.classList.contains('mmr-data-point')) {
    const index = parseInt(target.dataset.index);
    const dataPoint = chartData.dataPoints[index];
    
    updateTooltip({
      date: new Date(dataPoint.date),
      mmr: dataPoint.mmr,
      rank: dataPoint.rank,
      division: `Division ${dataPoint.division}`
    }, false);
  }
}

/**
 * Interpolate data at a specific date
 */
function interpolateDataAtDate(targetDate) {
  const dataPoints = chartData.dataPoints;
  
  // Check if date is before first or after last data point
  const firstDate = new Date(dataPoints[0].date);
  const lastDate = new Date(dataPoints[dataPoints.length - 1].date);
  
  if (targetDate <= firstDate) {
    return {
      date: firstDate,
      mmr: dataPoints[0].mmr,
      rank: dataPoints[0].rank,
      division: `Division ${dataPoints[0].division}`,
      exact: true
    };
  }
  
  if (targetDate >= lastDate) {
    const last = dataPoints[dataPoints.length - 1];
    return {
      date: lastDate,
      mmr: last.mmr,
      rank: last.rank,
      division: `Division ${last.division}`,
      exact: true
    };
  }
  
  // Find surrounding data points
  for (let i = 0; i < dataPoints.length - 1; i++) {
    const d1 = new Date(dataPoints[i].date);
    const d2 = new Date(dataPoints[i + 1].date);
    
    if (targetDate >= d1 && targetDate <= d2) {
      // Check if we're close to an exact point
      const distToD1 = Math.abs(targetDate - d1);
      const distToD2 = Math.abs(targetDate - d2);
      const threshold = 12 * 60 * 60 * 1000; // 12 hours
      
      if (distToD1 < threshold) {
        return {
          date: d1,
          mmr: dataPoints[i].mmr,
          rank: dataPoints[i].rank,
          division: `Division ${dataPoints[i].division}`,
          exact: true
        };
      }
      
      if (distToD2 < threshold) {
        return {
          date: d2,
          mmr: dataPoints[i + 1].mmr,
          rank: dataPoints[i + 1].rank,
          division: `Division ${dataPoints[i + 1].division}`,
          exact: true
        };
      }
      
      // Linear interpolation
      const ratio = (targetDate - d1) / (d2 - d1);
      const interpolatedMmr = Math.round(dataPoints[i].mmr + ratio * (dataPoints[i + 1].mmr - dataPoints[i].mmr));
      
      // Estimate rank from MMR
      const estimated = estimateRankFromMmr(interpolatedMmr);
      
      return {
        date: targetDate,
        mmr: interpolatedMmr,
        rank: estimated.rank,
        division: estimated.division,
        exact: false
      };
    }
  }
  
  // Fallback
  return {
    date: targetDate,
    mmr: 0,
    rank: 'Unknown',
    division: 'Unknown',
    exact: false
  };
}

/**
 * Estimate rank from MMR value
 */
function estimateRankFromMmr(mmr) {
  // Rumble thresholds (approximate)
  const ranks = [
    { name: 'Bronze I', min: 0 },
    { name: 'Bronze II', min: 76 },
    { name: 'Bronze III', min: 136 },
    { name: 'Silver I', min: 196 },
    { name: 'Silver II', min: 256 },
    { name: 'Silver III', min: 316 },
    { name: 'Gold I', min: 376 },
    { name: 'Gold II', min: 436 },
    { name: 'Gold III', min: 496 },
    { name: 'Platinum I', min: 556 },
    { name: 'Platinum II', min: 616 },
    { name: 'Platinum III', min: 696 },
    { name: 'Diamond I', min: 776 },
    { name: 'Diamond II', min: 856 },
    { name: 'Diamond III', min: 936 },
    { name: 'Champion I', min: 1016 },
    { name: 'Champion II', min: 1096 },
    { name: 'Champion III', min: 1176 },
    { name: 'Grand Champion I', min: 1435 },
    { name: 'Grand Champion II', min: 1535 },
    { name: 'Grand Champion III', min: 1635 },
    { name: 'Supersonic Legend', min: 1862 }
  ];
  
  let rank = ranks[0].name;
  for (const r of ranks) {
    if (mmr >= r.min) rank = r.name;
    else break;
  }
  
  // Estimate division (each rank has ~80 MMR spread with 3 divisions)
  const rankData = ranks.find(r => r.name === rank);
  const nextRank = ranks[ranks.indexOf(rankData) + 1];
  
  if (nextRank) {
    const spread = nextRank.min - rankData.min;
    const divisionSpread = spread / 4; // 4 divisions (Div I through IV)
    const posInRank = mmr - rankData.min;
    const division = Math.min(4, Math.floor(posInRank / divisionSpread) + 1);
    return { rank, division: `Division ${division}` };
  }
  
  return { rank, division: 'Division I' };
}

/**
 * Update tooltip content
 */
function updateTooltip(data, isEstimated) {
  const dateStr = data.date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  elements.tooltipDate.textContent = dateStr;
  elements.tooltipRank.textContent = data.rank;
  elements.tooltipDivision.textContent = data.division;
  elements.tooltipMmr.textContent = data.mmr.toLocaleString();
  
  const gcDiff = data.mmr - chartData.rankThresholds.gc1;
  elements.tooltipGcDiff.textContent = gcDiff >= 0 ? `+${gcDiff}` : gcDiff.toString();
  elements.tooltipGcDiff.className = `mmr-tooltip-stat-value gc-diff ${gcDiff >= 0 ? 'positive' : ''}`;
  
  elements.tooltipEstimated.textContent = isEstimated ? '(Estimated from interpolation)' : '';
}

/**
 * Position tooltip relative to cursor
 */
function positionTooltip(x, y) {
  const tooltip = elements.tooltip;
  const container = elements.chartContainer;
  const tooltipRect = tooltip.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  let left = x + 20;
  let top = y - tooltipRect.height / 2;
  
  // Flip to left side if too close to right edge
  if (left + tooltipRect.width > containerRect.width - 10) {
    left = x - tooltipRect.width - 20;
  }
  
  // Keep within vertical bounds
  if (top < 10) top = 10;
  if (top + tooltipRect.height > containerRect.height - 10) {
    top = containerRect.height - tooltipRect.height - 10;
  }
  
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

/**
 * Debounce utility
 */
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
