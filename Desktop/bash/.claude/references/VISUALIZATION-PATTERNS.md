# Heap Sort Visualizer: Visualization Patterns & Techniques

**Source:** Heap-Sort-Visualizer by Sangam Paudel
**Date:** 2026-03-15

---

## Visualization Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Animation Flow                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Algorithm Execution                                     │
│  (Heap: insert, delete, build)                          │
│         ↓                                                 │
│  Generate Animation Steps                               │
│  [step1: compare, step2: swap, step3: heapify...]       │
│         ↓                                                 │
│  Playback Controller (App)                              │
│  - Play/Pause                                            │
│  - Step Forward/Back                                     │
│  - Speed Control                                         │
│         ↓                                                 │
│  Render Current Step                                     │
│  (Visualizer: highlight indices, update stats)          │
│         ↓                                                 │
│  Update Canvas & DOM                                    │
│  (Draw tree, array bars, update counters)               │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Canvas Rendering Techniques

### 1.1 Binary Tree Visualization

**Layout Algorithm: BFS-based Hierarchical Positioning**

```javascript
// Step 1: Calculate level count
const levels = Math.ceil(Math.log2(heapSize + 1));
const levelHeight = (height - 100) / levels;

// Step 2: BFS traversal for position assignment
const queue = [{ index: 0, level: 0, left: 0, right: width }];
while (queue.length > 0) {
    const { index, level, left, right } = queue.shift();
    if (index >= heapSize) continue;

    // Calculate node position
    const x = (left + right) / 2;      // Center in horizontal range
    const y = startY + level * levelHeight;
    positions[index] = { x, y };

    // Queue children with narrowed horizontal range
    const leftChild = 2 * index + 1;
    const rightChild = 2 * index + 2;

    if (leftChild < heapSize) {
        queue.push({
            index: leftChild,
            level: level + 1,
            left: left,
            right: x        // Left subtree: [left, x)
        });
    }

    if (rightChild < heapSize) {
        queue.push({
            index: rightChild,
            level: level + 1,
            left: x,        // Right subtree: [x, right)
            right: right
        });
    }
}

// Step 3: Draw edges (parent → child lines)
for (const [index, pos] of Object.entries(nodePositions)) {
    const idx = parseInt(index);
    const left = 2 * idx + 1;
    const right = 2 * idx + 2;

    if (left < heapSize && nodePositions[left]) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(nodePositions[left].x, nodePositions[left].y);
        ctx.stroke();
    }
    if (right < heapSize && nodePositions[right]) {
        // Similar for right child
    }
}

// Step 4: Draw nodes (circles with values)
for (const [index, pos] of Object.entries(nodePositions)) {
    const idx = parseInt(index);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fill();

    // Node border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Node value text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(heap[idx], pos.x, pos.y);
}
```

**Key Points:**
- Balances subtrees by narrowing horizontal range at each level
- Maintains parent-child visual hierarchy
- Supports arbitrary tree sizes

**Visual Output:**
```
           [50]
         /      \
      [30]      [20]
      /  \      /  \
   [10] [5]  [8]  [15]
```

### 1.2 Array Bar Chart Visualization

```javascript
drawArray() {
    // Calculate bar dimensions
    const barWidth = Math.max(30, (width - 40) / heap.length - 10);
    const maxValue = Math.max(...heap, 1);
    const barHeightScale = (height - 80) / maxValue;

    // Draw grid lines (reference)
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = 20 + (height - 40) * (i / 5);
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
    }

    // Draw bars for each element
    for (let i = 0; i < heap.length; i++) {
        const x = 20 + i * (barWidth + 10);
        const barHeight = heap[i] * barHeightScale;
        const y = height - 30 - barHeight;

        // Color determination (state-based)
        let color = this.colors.default;
        if (this.sortedIndices.includes(i)) {
            color = this.colors.sorted;          // Green
        } else if (this.highlightedIndices.includes(i) && this.swappingMode) {
            color = this.colors.swapping;        // Yellow
        } else if (this.highlightedIndices.includes(i)) {
            color = this.colors.comparing;       // Red
        }

        // Draw bar with glow
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Value label (top of bar)
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(heap[i], x + barWidth / 2, y - 5);

        // Index label (bottom)
        ctx.fillStyle = this.colors.text;
        ctx.font = '12px Inter';
        ctx.fillText(i, x + barWidth / 2, height - 10);
    }
}
```

**Scaling Formula:**
- Bar height = `element_value × (canvas_height - 80) / max_value`
- Proportional: Largest element touches near-top of canvas
- All elements visible at appropriate scale

---

## 2. Color Coding System

### 2.1 State-Based Color Semantics

```javascript
colors = {
    default:    '#6366f1',    // Indigo: idle/unmodified
    sorted:     '#34d399',    // Green: completed/sorted
    comparing:  '#f87171',    // Red: active comparison
    swapping:   '#fbbf24',    // Amber: swap in progress
    root:       '#fbbf24',    // Amber: maximum element
    background: '#0f172a',    // Dark slate: canvas bg
    text:       '#f1f5f9',    // Light: text/labels
    grid:       '#475569'     // Gray: grid lines
}
```

### 2.2 Color Application Logic

```javascript
// Tree nodes
let color = this.colors.default;
if (idx === 0) {
    color = this.colors.root;                    // Root = max element
} else if (this.highlightedIndices.includes(idx) && this.swappingMode) {
    color = this.colors.swapping;
} else if (this.highlightedIndices.includes(idx)) {
    color = this.colors.comparing;
}

// Array bars
let color = this.colors.default;
if (this.sortedIndices.includes(i)) {
    color = this.colors.sorted;
} else if (this.highlightedIndices.includes(i) && this.swappingMode) {
    color = this.colors.swapping;
} else if (this.highlightedIndices.includes(i)) {
    color = this.colors.comparing;
} else if (i >= this.heapSize && this.heapSize > 0) {
    color = this.colors.sorted;                  // Out of active range
}
```

### 2.3 Glow Effects

```javascript
ctx.shadowBlur = 15;           // Blur radius
ctx.shadowColor = color;       // Match element color
ctx.fill();                    // Draw with shadow
ctx.shadowBlur = 0;            // Reset for subsequent draws
```

**Visual Impact:** Colored halos around emphasized elements for immediate attention

---

## 3. Animation Frame Recording Pattern

### 3.1 Step Recording During Algorithm

```javascript
// In MaxHeap class
addAnimationStep(type, data) {
    this.animationSteps.push({
        type: type,
        ...data,
        comparisons: this.comparisons,  // Current counter state
        swaps: this.swaps,               // Current counter state
        timestamp: Date.now()
    });
}

// During heapifyUp (insert operation)
heapifyUp(index) {
    while (index > 0) {
        const parentIdx = this.parent(index);
        this.comparisons++;

        // Record comparison step
        this.addAnimationStep('compare', {
            indices: [index, parentIdx],
            heap: [...this.heap],
            message: `Comparing ${this.heap[index]} with parent ${this.heap[parentIdx]}`
        });

        if (this.heap[index] > this.heap[parentIdx]) {
            // Record swap step (includes updated counters)
            this.swap(index, parentIdx);
            index = parentIdx;
        } else {
            break;
        }
    }
}
```

### 3.2 Playback Mechanism

```javascript
// In HeapSortApp class
playAnimation() {
    this.animationSteps = this.heap.animationSteps;
    this.currentStep = 0;
    this.isAnimating = true;
    this.playNextStep();
}

playNextStep() {
    if (!this.isAnimating || this.currentStep >= this.animationSteps.length) {
        this.animationComplete();
        return;
    }

    const step = this.animationSteps[this.currentStep];
    this.renderStep(step);

    // Speed-based delay (1-10 scale)
    const delay = Math.max(100, (11 - this.visualizer.animationSpeed) * 100);

    this.animationInterval = setTimeout(() => {
        if (this.isAnimating && this.currentStep < this.animationSteps.length) {
            this.currentStep++;
            this.playNextStep();
        } else if (this.currentStep >= this.animationSteps.length) {
            this.animationComplete();
        }
    }, delay);
}
```

### 3.3 Step Rendering

```javascript
renderStep(step) {
    const heap = step.heap || this.heap.getHeap();

    // Dispatch based on step type
    switch (step.type) {
        case 'compare':
            this.visualizer.highlight(step.indices, false);
            this.visualizer.setHeapSize(step.heapSize || heap.length);
            break;

        case 'swap':
            this.visualizer.highlight(step.indices, true);
            this.visualizer.setHeapSize(step.heapSize || heap.length);
            break;

        case 'sort_complete':
            this.visualizer.setSortedIndices(heap.map((_, i) => i));
            break;

        // ... other cases
    }

    // Update UI
    this.visualizer.updateArrayDisplay(heap);
    this.updateStats(step);
}

updateStats(step) {
    document.getElementById('arraySize').textContent = this.heap.getSize();
    document.getElementById('comparisons').textContent = step.comparisons || 0;
    document.getElementById('swaps').textContent = step.swaps || 0;
    document.getElementById('currentOp').textContent = step.message || 'Ready';
}
```

**Advantages:**
- ✅ Algorithm runs once; playback is independent
- ✅ Enables step backward (replay from step N-1)
- ✅ Speed control without re-running algorithm
- ✅ Pausing at any frame
- ✅ Full operational context captured (indices, state, counters)

---

## 4. Step Types & Animation Events

| Step Type | Meaning | Highlight | Typical Use |
|-----------|---------|-----------|------------|
| `compare` | Comparing two elements | Both indices in red | During heap operations |
| `swap` | Swapping two elements | Both indices in yellow | heapifyUp/Down |
| `insert` | New element added | None (clear) | Insert operation start |
| `delete` | Root extracted | None (clear) | Delete operation start |
| `heapify` | Heapifying at index | Single index in red | Build heap iterations |
| `heapify_complete` | Heapify finished | Clear highlights | End of operation |
| `build_start` / `build_complete` | Build heap boundary | Clear/marked | Build heap algorithm |
| `extract` | Element moved to sorted array | Partial heap shrink | Heap sort iterations |
| `sort_complete` | Sort finished | All green (sorted) | Heap sort end |

---

## 5. DOM-Based Array Display (Supplementary)

Alongside canvas visualization:

```javascript
updateArrayDisplay(heap) {
    const display = document.getElementById('arrayDisplay');
    display.innerHTML = '';

    heap.forEach((value, index) => {
        const item = document.createElement('div');
        item.className = 'array-item';
        item.textContent = value;

        // State-based styling
        if (this.sortedIndices.includes(index)) {
            item.classList.add('sorted');        // Green
        } else if (this.highlightedIndices.includes(index) && this.swappingMode) {
            item.classList.add('swapping');      // Yellow
        } else if (this.highlightedIndices.includes(index)) {
            item.classList.add('comparing');     // Red
        } else if (index === 0) {
            item.classList.add('root');          // Amber
        }

        display.appendChild(item);
    });
}
```

**CSS Styling Example:**
```css
.array-item {
    display: inline-block;
    padding: 8px 12px;
    margin: 4px;
    background: var(--primary);
    color: white;
    border-radius: 6px;
    font-weight: bold;
    transition: all 0.3s ease;
}

.array-item.comparing {
    background: var(--comparing);
}

.array-item.swapping {
    background: var(--swapping);
}

.array-item.sorted {
    background: var(--sorted);
}

.array-item.root {
    background: var(--root);
}
```

---

## 6. Input Validation & User Feedback

```javascript
insertBtn.addEventListener('click', () => {
    const raw = insertInput.value;
    const value = raw !== '' ? parseInt(raw, 10) : NaN;

    if (isNaN(value)) {
        // Inline error feedback
        insertInput.classList.add('input-error');
        insertInput.focus();
        setTimeout(() => insertInput.classList.remove('input-error'), 600);
        return;
    }

    this.insert(value);
    insertInput.value = '';
});
```

**CSS Error Animation:**
```css
.input-error {
    animation: shake 0.6s ease-in-out;
    border-color: var(--danger);
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
}
```

---

## 7. Performance Considerations

### 7.1 Canvas Optimization
- Clear canvas once per frame: `ctx.fillRect(0, 0, width, height)`
- Avoid redundant shadow effects (set shadowBlur = 0 after use)
- Pre-calculate tree positions using BFS (don't recalc every frame)

### 7.2 Animation Smoothing
- Use `requestAnimationFrame` internally (via setTimeout chains)
- Minimum delay of 100ms per step (human perception threshold)
- Speed slider: 1-10 scale maps to 100-1000ms

### 7.3 Memory Management
- Animation steps stored as array of objects
- Heap array copied at each step (`[...this.heap]`)
- No memory leaks if animation properly terminated

---

## 8. Responsive Behavior

```javascript
setupCanvases() {
    const updateCanvasSize = () => {
        const treeWrapper = this.treeCanvas.parentElement;

        if (treeWrapper) {
            this.treeCanvas.width = Math.max(200, treeWrapper.clientWidth - 40);
            const cssHeight = window.getComputedStyle(this.treeCanvas).height;
            const h = parseInt(cssHeight, 10) || 280;
            this.treeCanvas.height = h;
        }

        this.draw();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
}
```

**Behavior:**
- Listens to window resize events
- Recalculates canvas dimensions based on parent wrapper
- Triggers redraw after resize
- Graceful scaling for different screen sizes

---

## 9. Summary: Key Visualization Techniques

| Technique | Implementation | Benefit |
|-----------|----------------|---------|
| **BFS Tree Layout** | Hierarchical positioning with narrowing ranges | Balanced, readable tree visualization |
| **Bar Chart Array** | Height-scaled bars with grid lines | Alternative view of same data |
| **Color Semantics** | State-based color assignment | Instant visual feedback |
| **Glow Effects** | Canvas shadowBlur + shadowColor | Emphasis without cluttering |
| **Animation Recording** | Pre-compute steps, replay from array | Speed control, step controls, replay |
| **Dual Visualization** | Canvas + DOM display | Reinforces understanding, accessibility |
| **Responsive Canvas** | Window resize listener + dynamic sizing | Works on any screen size |
| **Input Validation** | Shake animation + focus feedback | User-friendly error handling |
| **Statistics Overlay** | Real-time counter display | Algorithmic complexity insight |

---

**All patterns are framework-agnostic and easily adapted for:**
- Hash table visualization (bucket layout, collision chains)
- Graph visualizations (node positioning algorithms)
- Tree structures (AVL trees, Red-Black trees)
- Other sorting algorithms (QuickSort, MergeSort, etc.)
