# How to Apply Heap-Sort-Visualizer Patterns to Hash Table Project

**Quick Reference Guide for Implementation**

---

## 1. Architecture Template (Copy This Structure)

### File Organization
```
src/
├── js/
│   ├── HashTable.js              # Core data structure (like heap.js)
│   ├── HashTableVisualizer.js    # Canvas rendering (like visualizer.js)
│   └── HashTableApp.js            # UI controller (like app.js)
├── css/
│   ├── main.css                   # Layout & colors (like styles.css)
│   ├── visualizer.css             # Canvas styling
│   └── animations.css             # Transitions & keyframes
└── index.html                     # Single page app
```

### Class Structure Template

**Hash Table Class (src/js/HashTable.js):**
```javascript
class HashTable {
    constructor(capacity = 10) {
        this.capacity = capacity;
        this.buckets = Array(capacity).fill(null).map(() => []);
        this.size = 0;
        this.comparisons = 0;
        this.collisions = 0;
        this.animationSteps = [];
    }

    // Core methods
    hash(key) { /* compute hash */ }
    insert(key, value) { /* record steps */ }
    search(key) { /* record steps */ }
    delete(key) { /* record steps */ }

    // Animation recording
    addAnimationStep(type, data) {
        this.animationSteps.push({
            type: type,
            ...data,
            comparisons: this.comparisons,
            collisions: this.collisions,
            timestamp: Date.now()
        });
    }

    // Statistics
    getStats() {
        return {
            size: this.size,
            capacity: this.capacity,
            loadFactor: this.size / this.capacity,
            comparisons: this.comparisons,
            collisions: this.collisions
        };
    }

    clearAnimationSteps() {
        this.animationSteps = [];
    }
}
```

---

## 2. Animation Frame Recording

### Record Every Operation

**During Insert:**
```javascript
insert(key, value) {
    this.comparisons = 0;
    this.animationSteps = [];

    // Step 1: Hash the key
    const hashCode = this.hash(key);
    const index = hashCode % this.capacity;

    this.addAnimationStep('hash', {
        key: key,
        hashCode: hashCode,
        bucketIndex: index,
        message: `Hash(${key}) = ${hashCode} → bucket ${index}`
    });

    // Step 2: Check for collision
    const bucket = this.buckets[index];
    if (bucket.length > 0) {
        this.collisions++;
        this.addAnimationStep('collision', {
            bucketIndex: index,
            chainLength: bucket.length,
            message: `Collision! Bucket ${index} has ${bucket.length} item(s)`
        });
    }

    // Step 3: Insert in bucket
    bucket.push({ key, value });
    this.size++;

    this.addAnimationStep('insert_complete', {
        bucketIndex: index,
        buckets: this.buckets.map(b => [...b]),
        size: this.size,
        loadFactor: this.size / this.capacity,
        message: `Inserted ${key} → bucket ${index}`
    });
}
```

### Step Types for Hash Table

```javascript
// Recommended animation step types:
'hash'              // Hash function computation
'collision'         // Collision detected
'bucket_access'     // Accessing bucket
'chain_traverse'    // Traversing collision chain
'compare'           // Comparing keys in chain
'found'             // Key found in table
'not_found'         // Key not found
'insert_complete'   // Insert finished
'delete_complete'   // Delete finished
'resize_start'      // Resize operation begin
'rehash'            // Rehashing element
'resize_complete'   // Resize finished
```

---

## 3. Canvas Visualization

### Bucket Grid Layout

```javascript
class HashTableVisualizer {
    drawBuckets() {
        const canvas = this.bucketCanvas;
        const ctx = canvas.getContext('2d');
        const table = this.hashTable;
        const buckets = table.buckets;

        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const bucketWidth = (canvas.width - 40) / Math.min(5, buckets.length);
        const bucketHeight = 60;

        // Draw each bucket
        for (let i = 0; i < buckets.length; i++) {
            const x = 20 + i * (bucketWidth + 10);
            const y = 40;
            const bucket = buckets[i];

            // Determine color (empty, occupied, highlighted)
            let color = this.colors.default;
            if (this.highlightedBuckets.includes(i)) {
                color = bucket.length > 0
                    ? this.colors.swapping    // Occupied & highlighted
                    : this.colors.comparing;  // Empty & highlighted
            } else if (bucket.length > 0) {
                color = '#8b5cf6';            // Occupied (purple)
            }

            // Draw bucket box
            ctx.fillStyle = color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.fillRect(x, y, bucketWidth, bucketHeight);
            ctx.shadowBlur = 0;

            // Bucket border
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, bucketWidth, bucketHeight);

            // Index label
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(i, x + bucketWidth / 2, y - 10);

            // Bucket size
            ctx.fillStyle = this.colors.text;
            ctx.font = '12px Inter';
            ctx.fillText(`${bucket.length} item(s)`, x + bucketWidth / 2, y + bucketHeight + 15);

            // Draw chain elements (if present)
            if (bucket.length > 0) {
                let chainY = y + 5;
                for (let j = 0; j < Math.min(bucket.length, 3); j++) {
                    ctx.fillStyle = '#f3f4f6';
                    ctx.font = '11px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(
                        `${bucket[j].key}`,
                        x + bucketWidth / 2,
                        chainY + 15
                    );
                    chainY += 15;
                    if (j === 2 && bucket.length > 3) {
                        ctx.fillText('...', x + bucketWidth / 2, chainY);
                    }
                }
            }
        }
    }
}
```

### Load Factor Bar

```javascript
drawLoadFactor() {
    const canvas = this.statsCanvas;
    const ctx = canvas.getContext('2d');
    const loadFactor = this.hashTable.size / this.hashTable.capacity;
    const barWidth = 200;
    const barHeight = 20;

    // Background
    ctx.fillStyle = '#334155';
    ctx.fillRect(10, 10, barWidth, barHeight);

    // Fill (proportional to load factor)
    ctx.fillStyle = loadFactor > 0.75
        ? this.colors.comparing  // Red if high load
        : this.colors.sorted;    // Green if good load

    ctx.fillRect(10, 10, barWidth * loadFactor, barHeight);

    // Border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, barWidth, barHeight);

    // Label
    ctx.fillStyle = 'white';
    ctx.font = '12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`Load Factor: ${loadFactor.toFixed(2)}`, 20, 50);
}
```

---

## 4. Animation Playback

```javascript
class HashTableApp {
    playAnimation() {
        this.animationSteps = this.hashTable.animationSteps;
        this.currentStep = 0;
        this.isAnimating = true;
        document.getElementById('playPauseBtn').textContent = 'Pause';
        this.playNextStep();
    }

    playNextStep() {
        if (!this.isAnimating || this.currentStep >= this.animationSteps.length) {
            this.animationComplete();
            return;
        }

        const step = this.animationSteps[this.currentStep];
        this.renderStep(step);

        const delay = Math.max(100, (11 - this.speed) * 100);
        this.animationInterval = setTimeout(() => {
            if (this.isAnimating) {
                this.currentStep++;
                this.playNextStep();
            }
        }, delay);
    }

    renderStep(step) {
        switch (step.type) {
            case 'hash':
                this.visualizer.highlightBucket([step.bucketIndex]);
                this.updateMessage(`Hashing "${step.key}"...`);
                break;

            case 'collision':
                this.visualizer.highlightBucket([step.bucketIndex], 'collision');
                this.updateMessage(`Collision in bucket ${step.bucketIndex}`);
                break;

            case 'insert_complete':
                this.visualizer.clearHighlights();
                this.updateMessage(`Inserted "${step.key}"`);
                break;

            // ... other cases
        }

        this.updateStats(step);
        this.visualizer.draw();
    }

    updateStats(step) {
        document.getElementById('tableSize').textContent = step.size || 0;
        document.getElementById('capacity').textContent = this.hashTable.capacity;
        document.getElementById('loadFactor').textContent =
            (step.size / this.hashTable.capacity).toFixed(2);
        document.getElementById('collisions').textContent = step.collisions || 0;
        document.getElementById('currentOp').textContent = step.message || 'Ready';
    }
}
```

---

## 5. HTML Layout Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hash Table Visualizer</title>
    <link rel="stylesheet" href="css/main.css">
</head>
<body>
    <!-- Intro Page (like Heap Sort) -->
    <div id="introPage" class="intro-page">
        <div class="intro-content">
            <h1>🔐 Hash Table Visualizer</h1>
            <p>Learn how hash tables work with interactive visualizations</p>
            <div class="operations-grid">
                <div class="operation-card">
                    <div class="operation-icon">➕</div>
                    <h3>Insert</h3>
                    <p>Add key-value pairs and see collision handling</p>
                </div>
                <div class="operation-card">
                    <div class="operation-icon">🔍</div>
                    <h3>Search</h3>
                    <p>Find elements and watch the search process</p>
                </div>
                <div class="operation-card">
                    <div class="operation-icon">🗑️</div>
                    <h3>Delete</h3>
                    <p>Remove elements from the hash table</p>
                </div>
                <div class="operation-card">
                    <div class="operation-icon">📊</div>
                    <h3>Load Factor</h3>
                    <p>Understand load factor and resizing</p>
                </div>
            </div>
            <button id="startBtn" class="start-button">Get Started →</button>
        </div>
    </div>

    <!-- Main App -->
    <div id="mainApp" class="container" style="display: none;">
        <button id="backBtn" class="btn btn-secondary">← Back to Home</button>

        <div class="app-grid">
            <!-- Left: Controls -->
            <div class="left-column">
                <div class="control-panel">
                    <div class="control-section">
                        <h3>Insert / Search</h3>
                        <div class="input-group">
                            <input type="text" id="insertKey" placeholder="Key">
                            <input type="text" id="insertValue" placeholder="Value">
                            <button id="insertBtn" class="btn btn-primary compact">Insert</button>
                        </div>
                        <button id="searchBtn" class="btn btn-info compact">Search</button>
                        <button id="deleteBtn" class="btn btn-danger compact">Delete</button>
                    </div>

                    <div class="control-section">
                        <h3>Animation Controls</h3>
                        <div class="speed-control">
                            <label>Speed:</label>
                            <input type="range" id="speedSlider" min="1" max="10" value="5">
                            <span id="speedValue">5</span>
                        </div>
                        <button id="playPauseBtn" class="btn btn-info compact">Play</button>
                        <button id="stepBtn" class="btn btn-secondary compact">Step</button>
                    </div>
                </div>
            </div>

            <!-- Right: Visualization -->
            <div class="right-column">
                <div class="viz-card">
                    <h2>Hash Table Structure</h2>
                    <canvas id="bucketCanvas"></canvas>

                    <div class="stats-grid">
                        <div class="stat">
                            <span class="label">Size:</span>
                            <span class="value" id="tableSize">0</span>
                        </div>
                        <div class="stat">
                            <span class="label">Capacity:</span>
                            <span class="value" id="capacity">10</span>
                        </div>
                        <div class="stat">
                            <span class="label">Load Factor:</span>
                            <span class="value" id="loadFactor">0.00</span>
                        </div>
                        <div class="stat">
                            <span class="label">Collisions:</span>
                            <span class="value" id="collisions">0</span>
                        </div>
                    </div>

                    <div class="current-operation">
                        <span id="currentOp">Ready</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="js/HashTable.js"></script>
    <script src="js/HashTableVisualizer.js"></script>
    <script src="js/HashTableApp.js"></script>
</body>
</html>
```

---

## 6. CSS Template (Adapt from Heap Sort)

```css
:root {
    --primary: #6366f1;
    --secondary: #64748b;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --info: #3b82f6;
    --bg: #0f172a;
    --bg-light: #1e293b;
    --bg-card: #334155;
    --text: #f1f5f9;
    --text-light: #cbd5e1;
    --border: #475569;
    --comparing: #f87171;
    --swapping: #fbbf24;
    --sorted: #34d399;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, var(--bg) 0%, #1e293b 100%);
    color: var(--text);
    min-height: 100vh;
    padding: 20px;
}

.container {
    max-width: 1600px;
    margin: 0 auto;
}

.app-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 20px;
}

.viz-card {
    background: var(--bg-card);
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 6px 30px rgba(0, 0, 0, 0.25);
}

canvas {
    width: 100%;
    height: 300px;
    border-radius: 8px;
    background: var(--bg);
    margin: 10px 0;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin: 15px 0;
}

.stat {
    background: var(--bg);
    padding: 12px;
    border-radius: 8px;
    text-align: center;
}

.stat .label {
    display: block;
    font-size: 0.85rem;
    color: var(--text-light);
}

.stat .value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary);
}
```

---

## 7. Event Listeners (Copy Pattern)

```javascript
initializeEventListeners() {
    // Insert
    document.getElementById('insertBtn').addEventListener('click', () => {
        const key = document.getElementById('insertKey').value;
        const value = document.getElementById('insertValue').value;

        if (!key || !value) {
            this.showError('Please enter both key and value');
            return;
        }

        this.insert(key, value);
        document.getElementById('insertKey').value = '';
        document.getElementById('insertValue').value = '';
    });

    // Search
    document.getElementById('searchBtn').addEventListener('click', () => {
        const key = document.getElementById('insertKey').value;
        if (!key) {
            this.showError('Please enter a key to search');
            return;
        }
        this.search(key);
    });

    // Play/Pause
    document.getElementById('playPauseBtn').addEventListener('click', () => {
        this.togglePlayPause();
    });

    // Speed slider
    document.getElementById('speedSlider').addEventListener('input', (e) => {
        this.visualizer.setSpeed(parseInt(e.target.value));
    });

    // Intro page
    document.getElementById('startBtn').addEventListener('click', () => {
        this.showMainApp();
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        this.showIntroPage();
    });
}
```

---

## 8. Key Differences from Heap Sort

| Aspect | Heap Sort | Hash Table |
|--------|-----------|-----------|
| **Visualization** | Tree + array bars | Bucket grid + chains |
| **Core Metric** | Comparisons, Swaps | Collisions, Load factor |
| **Layout Algorithm** | BFS for binary tree | Grid for buckets |
| **Color Emphasis** | Comparing/swapping | Occupied/collision |
| **Operation Sequence** | Sequential sort steps | Hash → collision check → insert |
| **Statistics** | Size, comparisons, swaps | Size, capacity, load factor, collisions |

---

## 9. Testing the Implementation

1. **Manual Insert:**
   - Enter key-value pair
   - Watch animation:
     - Hash computation
     - Bucket access
     - Collision detection (if applicable)
     - Insertion complete
   - Verify stats update

2. **Search Operation:**
   - Enter key
   - Watch animation:
     - Hash computation
     - Bucket access
     - Chain traversal
     - Found/Not found
   - Verify statistics

3. **Play/Pause Controls:**
   - Insert triggers auto-play
   - Click pause mid-animation
   - Step forward/back through sequence
   - Verify speed slider affects delay

4. **Load Factor:**
   - Insert multiple items
   - Watch load factor increase
   - Verify collision count
   - Color change when load factor > 0.75

---

## 10. Checklist for Implementation

- [ ] Create `HashTable.js` with animation recording
- [ ] Create `HashTableVisualizer.js` with bucket rendering
- [ ] Create `HashTableApp.js` with event listeners and playback
- [ ] Create `index.html` with intro + main app sections
- [ ] Create `main.css` with layout and dark theme
- [ ] Implement animation step types (hash, collision, insert, etc.)
- [ ] Test insert operation with animation playback
- [ ] Test search operation with animation playback
- [ ] Test delete operation with animation playback
- [ ] Implement play/pause/step controls
- [ ] Implement speed slider
- [ ] Add statistics display (size, capacity, load factor, collisions)
- [ ] Add intro page with operation cards
- [ ] Test responsive canvas resizing
- [ ] Verify smooth page transitions
- [ ] Add keyboard input support (Enter to insert)

---

**Good luck! This template gives you 80% of what you need. Adapt freely!**
