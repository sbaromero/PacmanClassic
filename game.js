class PacManGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Optimizaciones del canvas para máximo rendimiento y fluidez
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Configuración responsiva
        this.setupResponsiveCanvas();
        
        // Dimensiones del juego
        this.CELL_SIZE = 30;
        this.COLS = Math.floor(this.canvas.width / this.CELL_SIZE);
        this.ROWS = Math.floor(this.canvas.height / this.CELL_SIZE);
        
        // Velocidad del juego más lenta y fluida
        this.gameSpeed = 0;
        this.maxGameSpeed = 10; // Velocidad más lenta (60 FPS / 10 = 6 movimientos por segundo)
        
        // Estado del juego
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameRunning = false;
        this.gamePaused = false;
        
        // Elementos del DOM
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        this.gameOverElement = document.getElementById('gameOver');
        this.gamePausedElement = document.getElementById('gamePaused');
        this.finalScoreElement = document.getElementById('finalScore');
        this.restartBtn = document.getElementById('restartBtn');
        
        // Audio Web API para sonidos sutiles
        this.audioContext = null;
        this.initAudio();
        
        // Mapa del juego
        this.maze = this.generateMaze();
        this.pellets = [];
        this.powerPellets = [];
        
        // PacMan tradicional con posición suave
        this.pacman = {
            x: 1,
            y: 1,
            smoothX: 1,
            smoothY: 1,
            direction: 'right',
            nextDirection: 'right',
            mouthOpen: true,
            animation: 0,
            moving: false
        };
        
        // Fantasmas con posiciones dinámicas basadas en el centro del laberinto
        const centerX = Math.floor(this.COLS / 2);
        const centerY = Math.floor(this.ROWS / 2);
        
        this.ghosts = [
            { x: centerX - 1, y: centerY, smoothX: centerX - 1, smoothY: centerY, direction: 'up', color: '#E6A8B8', mode: 'chase', modeTimer: 0, moving: false }, // Rosa pastel suave
            { x: centerX, y: centerY, smoothX: centerX, smoothY: centerY, direction: 'down', color: '#B8B8E6', mode: 'chase', modeTimer: 0, moving: false }, // Lila pastel suave
            { x: centerX + 1, y: centerY, smoothX: centerX + 1, smoothY: centerY, direction: 'left', color: '#A8D4C7', mode: 'chase', modeTimer: 0, moving: false }, // Verde menta pastel
            { x: centerX, y: centerY - 1, smoothX: centerX, smoothY: centerY - 1, direction: 'right', color: '#E6C4A8', mode: 'chase', modeTimer: 0, moving: false } // Melocotón pastel
        ];
        
        // Paleta de colores pastel para fondo negro
        this.colors = {
            pacman: '#FFE55C', // Amarillo pastel suave
            pacmanShadow: '#D4C44A',
            pacmanHighlight: '#FFF4B8',
            wall: '#8B9DC3', // Azul grisáceo suave
            wallLight: '#A8B8D6',
            wallDark: '#7089B0',
            pellet: '#F0D67A', // Amarillo dorado suave
            powerPellet: '#D4A4DA', // Rosa-lavanda suave
            background: '#000000', // Fondo negro
            backgroundGrad1: '#0A0A0A',
            backgroundGrad2: '#141414'
        };
        
        this.initializePellets();
        this.setupEventListeners();
        this.setupMobileControls();
        
        // Iniciar el juego
        this.gameLoop();
    }
    
    setupResponsiveCanvas() {
        const containerWidth = Math.min(window.innerWidth - 40, 600);
        const containerHeight = Math.min(window.innerHeight - 200, 450);
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // Ajustar el canvas CSS
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = containerHeight + 'px';
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio no disponible');
        }
    }
    
    playSound(frequency, duration, type = 'sine', volume = 0.1) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    generateMaze() {
        const maze = [];
        
        // Inicializar todo como paredes
        for (let y = 0; y < this.ROWS; y++) {
            maze[y] = [];
            for (let x = 0; x < this.COLS; x++) {
                maze[y][x] = 1; // Todo pared inicialmente
            }
        }
        
        // Crear un laberinto simple pero funcional
        // Pasillo perimetral interior
        for (let x = 1; x < this.COLS - 1; x++) {
            maze[1][x] = 0; // Pasillo superior
            maze[this.ROWS - 2][x] = 0; // Pasillo inferior
        }
        
        for (let y = 1; y < this.ROWS - 1; y++) {
            maze[y][1] = 0; // Pasillo izquierdo
            maze[y][this.COLS - 2] = 0; // Pasillo derecho
        }
        
        // Pasillos horizontales centrales (cada 3 filas)
        for (let y = 4; y < this.ROWS - 2; y += 3) {
            for (let x = 1; x < this.COLS - 1; x++) {
                maze[y][x] = 0;
            }
        }
        
        // Pasillos verticales centrales (cada 4 columnas)
        for (let x = 4; x < this.COLS - 2; x += 4) {
            for (let y = 1; y < this.ROWS - 1; y++) {
                maze[y][x] = 0;
            }
        }
        
        // Crear algunas conexiones controladas
        for (let y = 2; y < this.ROWS - 2; y += 3) {
            for (let x = 3; x < this.COLS - 2; x += 4) {
                if (x < this.COLS && y < this.ROWS) {
                    maze[y][x] = 0;
                }
            }
        }
        
        // Asegurar área libre para PacMan
        maze[1][1] = 0;
        maze[1][2] = 0;
        maze[2][1] = 0;
        maze[2][2] = 0;
        
        // Asegurar área central para fantasmas
        const centerX = Math.floor(this.COLS / 2);
        const centerY = Math.floor(this.ROWS / 2);
        
        for (let y = centerY - 1; y <= centerY + 1; y++) {
            for (let x = centerX - 2; x <= centerX + 2; x++) {
                if (x >= 0 && x < this.COLS && y >= 0 && y < this.ROWS) {
                    maze[y][x] = 0;
                }
            }
        }
        
        return maze;
    }
    
    debugMaze() {
        console.log('=== LABERINTO GENERADO ===');
        console.log(`Dimensiones: ${this.COLS} x ${this.ROWS}`);
        console.log('Leyenda: # = Pared, . = Espacio, P = PacMan, G = Fantasma');
        
        let mazeStr = '';
        for (let y = 0; y < this.ROWS; y++) {
            let row = '';
            for (let x = 0; x < this.COLS; x++) {
                if (x === this.pacman.x && y === this.pacman.y) {
                    row += 'P';
                } else if (this.ghosts.some(ghost => ghost.x === x && ghost.y === y)) {
                    row += 'G';
                } else if (this.maze[y][x] === 1) {
                    row += '#';
                } else {
                    row += '.';
                }
            }
            mazeStr += row + '\n';
        }
        console.log(mazeStr);
    }
    
    initializePellets() {
        this.pellets = [];
        this.powerPellets = [];
        
        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (this.maze[y][x] === 0) {
                    // Evitar poner pellets muy cerca de PacMan
                    if (Math.abs(x - this.pacman.x) > 2 || Math.abs(y - this.pacman.y) > 2) {
                        if (Math.random() < 0.05) {
                            this.powerPellets.push({ x, y });
                        } else if (Math.random() < 0.8) {
                            this.pellets.push({ x, y });
                        }
                    }
                }
            }
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning && e.code !== 'Space') return;
            
            switch (e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.pacman.nextDirection = 'up';
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.pacman.nextDirection = 'down';
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.pacman.nextDirection = 'left';
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.pacman.nextDirection = 'right';
                    e.preventDefault();
                    break;
                case 'Space':
                    this.togglePause();
                    e.preventDefault();
                    break;
                case 'KeyG':
                    // Debug: Mostrar laberinto en consola (presionar G)
                    this.debugMaze();
                    console.log('Posición PacMan:', this.pacman.x, this.pacman.y, 'Suave:', this.pacman.smoothX.toFixed(2), this.pacman.smoothY.toFixed(2));
                    this.ghosts.forEach((ghost, i) => {
                        console.log(`Fantasma ${i}:`, ghost.x, ghost.y, 'Suave:', ghost.smoothX.toFixed(2), ghost.smoothY.toFixed(2));
                    });
                    e.preventDefault();
                    break;
            }
        });
        
        this.restartBtn.addEventListener('click', () => {
            this.restart();
        });
        
        // Resumir audio context en interacción del usuario
        document.addEventListener('click', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        });
    }
    
    setupMobileControls() {
        const buttons = {
            upBtn: 'up',
            downBtn: 'down',
            leftBtn: 'left',
            rightBtn: 'right'
        };
        
        Object.entries(buttons).forEach(([btnId, direction]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.pacman.nextDirection = direction;
                });
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.pacman.nextDirection = direction;
                });
            }
        });
        
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.togglePause();
            });
        }
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        this.gamePausedElement.style.display = this.gamePaused ? 'block' : 'none';
        
        if (this.gamePaused) {
            this.playSound(200, 0.1, 'square', 0.05);
        } else {
            this.playSound(400, 0.1, 'square', 0.05);
        }
    }
    
    canMove(x, y) {
        // Asegurar coordenadas enteras
        const intX = Math.floor(x);
        const intY = Math.floor(y);
        
        // Verificar límites del laberinto
        if (intX < 0 || intX >= this.COLS || intY < 0 || intY >= this.ROWS) {
            return false;
        }
        
        // Verificar que el laberinto esté inicializado
        if (!this.maze || !this.maze[intY] || this.maze[intY][intX] === undefined) {
            return false;
        }
        
        // Solo permitir movimiento en espacios vacíos (0)
        return this.maze[intY][intX] === 0;
    }
    
    // Nueva función para verificar si una posición suave es válida
    isValidSmoothPosition(smoothX, smoothY) {
        // Verificar las 4 esquinas del área que ocupa el personaje
        const cellSize = 0.8; // Margen de seguridad
        const halfSize = cellSize / 2;
        
        const corners = [
            { x: smoothX - halfSize, y: smoothY - halfSize }, // Esquina superior izquierda
            { x: smoothX + halfSize, y: smoothY - halfSize }, // Esquina superior derecha
            { x: smoothX - halfSize, y: smoothY + halfSize }, // Esquina inferior izquierda
            { x: smoothX + halfSize, y: smoothY + halfSize }  // Esquina inferior derecha
        ];
        
        // Todas las esquinas deben estar en espacios válidos
        return corners.every(corner => this.canMove(corner.x, corner.y));
    }
    
    // Función para corregir posiciones inválidas
    validateAndCorrectPositions() {
        // Validar PacMan
        if (!this.canMove(this.pacman.x, this.pacman.y)) {
            console.warn('PacMan en posición inválida, corrigiendo...');
            this.pacman.x = 1;
            this.pacman.y = 1;
            this.pacman.smoothX = 1;
            this.pacman.smoothY = 1;
        }
        
        // Validar fantasmas
        this.ghosts.forEach((ghost, index) => {
            if (!this.canMove(ghost.x, ghost.y)) {
                console.warn(`Fantasma ${index} en posición inválida, corrigiendo...`);
                const centerX = Math.floor(this.COLS / 2);
                const centerY = Math.floor(this.ROWS / 2);
                
                const ghostPositions = [
                    { x: centerX - 1, y: centerY },
                    { x: centerX, y: centerY },
                    { x: centerX + 1, y: centerY },
                    { x: centerX, y: centerY - 1 }
                ];
                
                ghost.x = ghostPositions[index].x;
                ghost.y = ghostPositions[index].y;
                ghost.smoothX = ghostPositions[index].x;
                ghost.smoothY = ghostPositions[index].y;
            }
        });
    }
    
    updatePacman() {
        // Animación continua de la boca tradicional
        this.pacman.animation += 0.4;
        this.pacman.mouthOpen = Math.sin(this.pacman.animation) > 0;
        
        // Verificar si puede cambiar de dirección
        const nextX = this.pacman.x + this.getDirectionOffset(this.pacman.nextDirection).x;
        const nextY = this.pacman.y + this.getDirectionOffset(this.pacman.nextDirection).y;
        
        if (this.canMove(nextX, nextY)) {
            this.pacman.direction = this.pacman.nextDirection;
        }
        
        // Mover PacMan - Solo usar coordenadas enteras
        const offset = this.getDirectionOffset(this.pacman.direction);
        const newX = this.pacman.x + offset.x;
        const newY = this.pacman.y + offset.y;
        
        // VALIDACIÓN ESTRICTA: Solo permitir movimiento a coordenadas enteras válidas
        if (Number.isInteger(newX) && Number.isInteger(newY) && this.canMove(newX, newY)) {
            this.pacman.x = newX;
            this.pacman.y = newY;
            this.pacman.moving = true;
            
            // Comprobar colisión con pellets
            this.checkPelletCollision();
            
            // Comprobar colisión con fantasmas
            this.checkGhostCollision();
        } else {
            this.pacman.moving = false;
        }
        
        // La interpolación suave ahora se maneja en updateAnimations() para mayor fluidez
        // Solo validar que las posiciones sean correctas
        if (!this.isValidSmoothPosition(this.pacman.smoothX, this.pacman.smoothY)) {
            this.pacman.smoothX = this.pacman.x;
            this.pacman.smoothY = this.pacman.y;
        }
    }
    
    getDirectionOffset(direction) {
        switch (direction) {
            case 'up': return { x: 0, y: -1 };
            case 'down': return { x: 0, y: 1 };
            case 'left': return { x: -1, y: 0 };
            case 'right': return { x: 1, y: 0 };
            default: return { x: 0, y: 0 };
        }
    }
    
    checkPelletCollision() {
        // Comprobar pellets normales
        for (let i = this.pellets.length - 1; i >= 0; i--) {
            const pellet = this.pellets[i];
            if (pellet.x === this.pacman.x && pellet.y === this.pacman.y) {
                this.pellets.splice(i, 1);
                this.score += 10;
                this.updateScore();
                this.playSound(800, 0.1, 'sine', 0.03);
                
                // Verificar si se completó el nivel
                if (this.pellets.length === 0 && this.powerPellets.length === 0) {
                    this.nextLevel();
                }
            }
        }
        
        // Comprobar power pellets
        for (let i = this.powerPellets.length - 1; i >= 0; i--) {
            const powerPellet = this.powerPellets[i];
            if (powerPellet.x === this.pacman.x && powerPellet.y === this.pacman.y) {
                this.powerPellets.splice(i, 1);
                this.score += 50;
                this.updateScore();
                this.playSound(400, 0.3, 'sawtooth', 0.05);
                
                // Activar modo de pánico en fantasmas
                this.ghosts.forEach(ghost => {
                    ghost.mode = 'scared';
                    ghost.modeTimer = 300; // 5 segundos aprox
                });
            }
        }
    }
    
    checkGhostCollision() {
        this.ghosts.forEach((ghost, index) => {
            if (Math.abs(ghost.x - this.pacman.x) < 0.8 && Math.abs(ghost.y - this.pacman.y) < 0.8) {
                if (ghost.mode === 'scared') {
                    // Comer fantasma
                    this.score += 200;
                    this.updateScore();
                    this.playSound(600, 0.2, 'triangle', 0.04);
                    
                    // Reiniciar fantasma al centro
                    const centerX = Math.floor(this.COLS / 2);
                    const centerY = Math.floor(this.ROWS / 2);
                    
                    const ghostPositions = [
                        { x: centerX - 1, y: centerY },
                        { x: centerX, y: centerY },
                        { x: centerX + 1, y: centerY },
                        { x: centerX, y: centerY - 1 }
                    ];
                    
                    ghost.x = ghostPositions[index].x;
                    ghost.y = ghostPositions[index].y;
                    ghost.smoothX = ghostPositions[index].x;
                    ghost.smoothY = ghostPositions[index].y;
                    ghost.mode = 'chase';
                    ghost.modeTimer = 0;
                } else {
                    // PacMan muere
                    this.lives--;
                    this.updateLives();
                    this.playSound(150, 0.5, 'sawtooth', 0.08);
                    
                    if (this.lives <= 0) {
                        this.gameOver();
                    } else {
                        this.resetPositions();
                    }
                }
            }
        });
    }
    
    updateGhosts() {
        this.ghosts.forEach(ghost => {
            // Actualizar timer del modo
            if (ghost.modeTimer > 0) {
                ghost.modeTimer--;
                if (ghost.modeTimer === 0 && ghost.mode === 'scared') {
                    ghost.mode = 'chase';
                }
            }
            
            // Movimiento simple de los fantasmas
            const directions = ['up', 'down', 'left', 'right'];
            let moved = false;
            
            // Intentar mantener la dirección actual
            const offset = this.getDirectionOffset(ghost.direction);
            const newX = ghost.x + offset.x;
            const newY = ghost.y + offset.y;
            
            // VALIDACIÓN ESTRICTA para fantasmas - Solo coordenadas enteras
            if (Number.isInteger(newX) && Number.isInteger(newY) && this.canMove(newX, newY)) {
                ghost.x = newX;
                ghost.y = newY;
                ghost.moving = true;
                moved = true;
            }
            
            // Si no puede moverse, cambiar dirección aleatoriamente
            if (!moved || Math.random() < 0.1) {
                const validDirections = directions.filter(dir => {
                    const offset = this.getDirectionOffset(dir);
                    const testX = ghost.x + offset.x;
                    const testY = ghost.y + offset.y;
                    return Number.isInteger(testX) && Number.isInteger(testY) && this.canMove(testX, testY);
                });
                
                if (validDirections.length > 0) {
                    ghost.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
                }
                ghost.moving = false;
            }
            
            // La interpolación suave ahora se maneja en updateAnimations() para mayor fluidez
            // Solo validar que las posiciones de los fantasmas sean correctas
            if (!this.isValidSmoothPosition(ghost.smoothX, ghost.smoothY)) {
                ghost.smoothX = ghost.x;
                ghost.smoothY = ghost.y;
            }
        });
    }
    
    draw() {
        // Limpiar canvas con gradiente de fondo
        this.drawBackground();
        
        // Dibujar laberinto
        this.drawMaze();
        
        // Dibujar pellets
        this.drawPellets();
        
        // Dibujar PacMan
        this.drawPacman();
        
        // Dibujar fantasmas
        this.drawGhosts();
    }
    
    drawBackground() {
        // Gradiente de fondo negro suave
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, this.colors.backgroundGrad1);
        gradient.addColorStop(0.5, this.colors.background);
        gradient.addColorStop(1, this.colors.backgroundGrad2);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Puntos de luz ambientales suaves en tonos pastel
        this.ctx.fillStyle = 'rgba(139, 157, 195, 0.08)';
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const size = Math.random() * 1.5 + 0.5;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        
        // Líneas sutiles de ambiente
        this.ctx.strokeStyle = 'rgba(168, 184, 214, 0.06)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 2; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, (i * this.canvas.height) / 2);
            this.ctx.lineTo(this.canvas.width, (i * this.canvas.height) / 2);
            this.ctx.stroke();
        }
    }
    
    drawMaze() {
        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (this.maze[y][x] === 1) {
                    this.drawWallBlock(x, y);
                }
            }
        }
    }
    
    drawWallBlock(x, y) {
        const cellX = x * this.CELL_SIZE;
        const cellY = y * this.CELL_SIZE;
        const size = this.CELL_SIZE;
        
        // Sombra del bloque más marcada
        this.ctx.fillStyle = 'rgba(40, 40, 40, 0.9)';
        this.ctx.fillRect(cellX + 2, cellY + 2, size, size);
        
        // Cara principal del bloque con gradiente más visible
        const gradient = this.ctx.createLinearGradient(cellX, cellY, cellX + size, cellY + size);
        gradient.addColorStop(0, this.colors.wallLight);
        gradient.addColorStop(0.5, this.colors.wall);
        gradient.addColorStop(1, this.colors.wallDark);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(cellX, cellY, size, size);
        
        // Borde perimetral completo más grueso para definir límites claros
        this.ctx.strokeStyle = '#A0B5E6';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(cellX, cellY, size, size);
        
        // Bordes 3D más marcados
        // Borde superior (claro)
        this.ctx.fillStyle = '#D0DBF0';
        this.ctx.fillRect(cellX, cellY, size, 3);
        
        // Borde izquierdo (claro)
        this.ctx.fillStyle = '#C8D5EE';
        this.ctx.fillRect(cellX, cellY, 3, size);
        
        // Borde inferior (oscuro)
        this.ctx.fillStyle = '#5A6FA0';
        this.ctx.fillRect(cellX + size - 3, cellY, 3, size);
        
        // Borde derecho (oscuro)
        this.ctx.fillStyle = '#52679A';
        this.ctx.fillRect(cellX, cellY + size - 3, size, 3);
        
        // Textura interior más visible
        this.ctx.fillStyle = '#D0DAF0';
        const seed = x * 137 + y * 73;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if ((seed + i * 17 + j * 23) % 10 < 3) {
                    this.ctx.fillRect(
                        cellX + 6 + i * 6,
                        cellY + 6 + j * 6,
                        3, 3
                    );
                }
            }
        }
        
        // Líneas de detalle internas
        this.ctx.strokeStyle = '#B0C0E0';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(cellX + 6, cellY + 6);
        this.ctx.lineTo(cellX + size - 6, cellY + 6);
        this.ctx.moveTo(cellX + 6, cellY + 6);
        this.ctx.lineTo(cellX + 6, cellY + size - 6);
        this.ctx.stroke();
    }
    
    drawPellets() {
        // Pellets normales con efecto 3D
        this.pellets.forEach(pellet => {
            this.drawNormalPellet(pellet.x, pellet.y);
        });
        
        // Power pellets con efecto 3D y brillos
        this.powerPellets.forEach(pellet => {
            this.drawPowerPellet(pellet.x, pellet.y);
        });
    }
    
    drawNormalPellet(x, y) {
        const centerX = x * this.CELL_SIZE + this.CELL_SIZE / 2;
        const centerY = y * this.CELL_SIZE + this.CELL_SIZE / 2;
        const radius = 4;
        
        // Sombra del pellet suave
        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(centerX + 2, centerY + 2, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Gradiente radial para efecto 3D pastel
        const gradient = this.ctx.createRadialGradient(
            centerX - 1, centerY - 1, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, '#FFF4B3');
        gradient.addColorStop(0.6, this.colors.pellet);
        gradient.addColorStop(1, '#E6C759');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Brillo superior suave
        this.ctx.fillStyle = '#FFFEF0';
        this.ctx.beginPath();
        this.ctx.arc(centerX - 1, centerY - 1, 1.5, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Borde suave
        this.ctx.strokeStyle = '#FFE9A0';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
    
    drawPowerPellet(x, y) {
        const centerX = x * this.CELL_SIZE + this.CELL_SIZE / 2;
        const centerY = y * this.CELL_SIZE + this.CELL_SIZE / 2;
        const radius = 8;
        const time = Date.now() * 0.005; // Animación más rápida para mayor fluidez
        
        // Sombra del power pellet suave
        this.ctx.fillStyle = 'rgba(180, 180, 180, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(centerX + 3, centerY + 3, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Gradiente radial animado en tonos pastel
        const gradient = this.ctx.createRadialGradient(
            centerX - 2, centerY - 2, 0,
            centerX, centerY, radius
        );
        
        const brightness = 0.7 + 0.1 * Math.sin(time * 2);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.3, this.colors.powerPellet);
        gradient.addColorStop(0.7, '#E6C7FF');
        gradient.addColorStop(1, '#D4B8E8');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Anillos de energía suaves
        for (let i = 0; i < 3; i++) {
            const ringRadius = radius - (i * 2);
            const alpha = 0.2 + 0.1 * Math.sin(time * 2 + i);
            
            this.ctx.strokeStyle = `rgba(244, 211, 255, ${alpha})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, ringRadius, 0, 2 * Math.PI);
            this.ctx.stroke();
        }
        
        // Brillo central suave
        this.ctx.fillStyle = `rgba(255, 250, 255, ${0.6 + 0.1 * Math.sin(time * 3)})`;
        this.ctx.beginPath();
        this.ctx.arc(centerX - 2, centerY - 2, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Partículas suaves alrededor
        for (let i = 0; i < 6; i++) {
            const angle = (time + i) * 0.4;
            const sparkleX = centerX + Math.cos(angle) * (radius + 3);
            const sparkleY = centerY + Math.sin(angle) * (radius + 3);
            const sparkleAlpha = 0.3 + 0.2 * Math.sin(time * 4 + i);
            
            this.ctx.fillStyle = `rgba(244, 211, 255, ${sparkleAlpha})`;
            this.ctx.beginPath();
            this.ctx.arc(sparkleX, sparkleY, 1, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }
    
    drawPacman() {
        const x = this.pacman.smoothX * this.CELL_SIZE + this.CELL_SIZE / 2;
        const y = this.pacman.smoothY * this.CELL_SIZE + this.CELL_SIZE / 2;
        const radius = this.CELL_SIZE / 2 - 3;
        
        // Sombra múltiple de PacMan suave
        this.ctx.fillStyle = 'rgba(180, 180, 180, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(x + 4, y + 4, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.fillStyle = this.colors.pacmanShadow;
        this.ctx.beginPath();
        this.ctx.arc(x + 2, y + 2, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Gradiente radial simple para el cuerpo tradicional
        const bodyGradient = this.ctx.createRadialGradient(
            x - radius / 3, y - radius / 3, 0,
            x, y, radius
        );
        bodyGradient.addColorStop(0, this.colors.pacmanHighlight);
        bodyGradient.addColorStop(0.7, this.colors.pacman);
        bodyGradient.addColorStop(1, this.colors.pacmanShadow);
        
        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        
        // Boca tradicional de tamaño fijo
        const mouthSize = 0.3;
        
        if (this.pacman.mouthOpen) {
            // Dibujar PacMan con boca abierta
            let startAngle, endAngle;
            
            switch (this.pacman.direction) {
                case 'right':
                    startAngle = mouthSize * Math.PI;
                    endAngle = (2 - mouthSize) * Math.PI;
                    break;
                case 'left':
                    startAngle = (1 + mouthSize) * Math.PI;
                    endAngle = (1 - mouthSize) * Math.PI;
                    break;
                case 'up':
                    startAngle = (1.5 + mouthSize) * Math.PI;
                    endAngle = (1.5 - mouthSize) * Math.PI;
                    break;
                case 'down':
                    startAngle = (0.5 + mouthSize) * Math.PI;
                    endAngle = (0.5 - mouthSize) * Math.PI;
                    break;
            }
            
            this.ctx.arc(x, y, radius, startAngle, endAngle);
            this.ctx.lineTo(x, y);
        } else {
            // Dibujar círculo completo
            this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        }
        
        this.ctx.fill();
        
        // Borde simple tradicional
        this.ctx.strokeStyle = this.colors.pacmanShadow;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Brillo sutil tradicional
        const highlightGradient = this.ctx.createRadialGradient(
            x - radius / 2, y - radius / 2, 0,
            x - radius / 3, y - radius / 3, radius / 3
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.fillStyle = highlightGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    

    
    drawGhosts() {
        this.ghosts.forEach(ghost => {
            this.drawGhost(ghost);
        });
    }
    
    drawGhost(ghost) {
        const x = ghost.smoothX * this.CELL_SIZE + this.CELL_SIZE / 2;
        const y = ghost.smoothY * this.CELL_SIZE + this.CELL_SIZE / 2;
        const radius = this.CELL_SIZE / 2 - 3;
        const time = Date.now() * 0.003;
        
        // Sombra múltiple del fantasma
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(x + 4, y - radius / 2 + 4, radius, Math.PI, 0, false);
        this.ctx.rect(x - radius + 4, y - radius / 2 + 4, radius * 2, radius * 1.6);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(x + 2, y - radius / 2 + 2, radius, Math.PI, 0, false);
        this.ctx.rect(x - radius + 2, y - radius / 2 + 2, radius * 2, radius * 1.6);
        this.ctx.fill();
        
        // Gradiente para el cuerpo del fantasma
        let bodyGradient;
        if (ghost.mode === 'scared') {
            const scaredColor = ghost.modeTimer > 100 ? '#B8C9FF' : '#F0F0FF';
            bodyGradient = this.ctx.createRadialGradient(
                x - radius / 3, y - radius / 2, 0,
                x, y, radius
            );
            bodyGradient.addColorStop(0, scaredColor);
            bodyGradient.addColorStop(1, ghost.modeTimer > 100 ? '#9BB5FF' : '#E0E0F0');
        } else {
            bodyGradient = this.ctx.createRadialGradient(
                x - radius / 3, y - radius / 2, 0,
                x, y, radius
            );
            
            // Colores más brillantes para el gradiente
            const baseColor = ghost.color;
            const lightColor = this.lightenColor(baseColor, 0.3);
            const darkColor = this.darkenColor(baseColor, 0.3);
            
            bodyGradient.addColorStop(0, lightColor);
            bodyGradient.addColorStop(0.6, baseColor);
            bodyGradient.addColorStop(1, darkColor);
        }
        
        this.ctx.fillStyle = bodyGradient;
        
        // Cuerpo del fantasma
        this.ctx.beginPath();
        this.ctx.arc(x, y - radius / 2, radius, Math.PI, 0, false);
        this.ctx.rect(x - radius, y - radius / 2, radius * 2, radius * 1.6);
        
        // Parte inferior ondulada más suave
        const wavePoints = [];
        for (let i = 0; i <= 6; i++) {
            const waveX = x - radius + (i * radius * 2 / 6);
            const waveY = y + radius * 0.6 + Math.sin((i * 0.8) + time) * 4;
            wavePoints.push({x: waveX, y: waveY});
        }
        
        wavePoints.forEach((point, index) => {
            if (index === 0) {
                this.ctx.lineTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });
        
        this.ctx.lineTo(x - radius, y + radius * 0.6);
        this.ctx.fill();
        
        // Múltiples bordes para efecto 3D
        this.ctx.strokeStyle = ghost.mode === 'scared' ? '#000088' : this.darkenColor(ghost.color, 0.5);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.strokeStyle = ghost.mode === 'scared' ? '#4444ff' : this.lightenColor(ghost.color, 0.2);
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Brillo superior del fantasma
        const highlightGradient = this.ctx.createRadialGradient(
            x - radius / 2, y - radius, 0,
            x, y - radius / 2, radius / 2
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.fillStyle = highlightGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y - radius / 2, radius, Math.PI, 0, false);
        this.ctx.rect(x - radius, y - radius / 2, radius * 2, radius * 1.2);
        this.ctx.fill();
        
        // Ojos 3D mejorados
        const eyeSize = radius / 3;
        const pupilSize = radius / 6;
        
        // Sombras de los ojos
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(x - radius / 3 + 1, y - radius / 3 + 1, eyeSize, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + radius / 3 + 1, y - radius / 3 + 1, eyeSize, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Base de los ojos con gradiente
        const eyeGradient = this.ctx.createRadialGradient(
            x - radius / 3 - 2, y - radius / 3 - 2, 0,
            x - radius / 3, y - radius / 3, eyeSize
        );
        eyeGradient.addColorStop(0, '#ffffff');
        eyeGradient.addColorStop(1, '#eeeeee');
        
        // Ojo izquierdo
        this.ctx.fillStyle = eyeGradient;
        this.ctx.beginPath();
        this.ctx.arc(x - radius / 3, y - radius / 3, eyeSize, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.strokeStyle = '#cccccc';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Ojo derecho
        this.ctx.beginPath();
        this.ctx.arc(x + radius / 3, y - radius / 3, eyeSize, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Pupilas con gradiente
        const pupilGradient = this.ctx.createRadialGradient(
            x - radius / 3 - 1, y - radius / 3 - 1, 0,
            x - radius / 3, y - radius / 3, pupilSize
        );
        
        if (ghost.mode === 'scared') {
            pupilGradient.addColorStop(0, '#FFB3B3');
            pupilGradient.addColorStop(1, '#FF9999');
        } else {
            pupilGradient.addColorStop(0, '#666666');
            pupilGradient.addColorStop(1, '#444444');
        }
        
        this.ctx.fillStyle = pupilGradient;
        
        // Pupila izquierda
        this.ctx.beginPath();
        this.ctx.arc(x - radius / 3, y - radius / 3, pupilSize, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Pupila derecha
        this.ctx.beginPath();
        this.ctx.arc(x + radius / 3, y - radius / 3, pupilSize, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Brillos en los ojos
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x - radius / 3 - 1, y - radius / 3 - 1, 1.5, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + radius / 3 - 1, y - radius / 3 - 1, 1.5, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Boca cuando está asustado
        if (ghost.mode === 'scared') {
            this.ctx.fillStyle = '#888888';
            this.ctx.beginPath();
            this.ctx.arc(x, y + radius / 4, radius / 6, 0, Math.PI);
            this.ctx.fill();
            
            // Dientes
            this.ctx.fillStyle = '#F5F5F5';
            for (let i = 0; i < 3; i++) {
                const toothX = x - radius / 8 + (i * radius / 12);
                this.ctx.fillRect(toothX, y + radius / 4, 2, 4);
            }
        }
        
        // Textura corporal (puntos de brillo)
        if (ghost.mode !== 'scared') {
            this.ctx.fillStyle = this.lightenColor(ghost.color, 0.4);
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * 2 * Math.PI;
                const dotX = x + Math.cos(angle) * (radius * 0.5);
                const dotY = y - radius / 4 + Math.sin(angle) * (radius * 0.3);
                
                this.ctx.beginPath();
                this.ctx.arc(dotX, dotY, 1, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        }
    }
    
    // Funciones auxiliares para manipular colores
    lightenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
        const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
        const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
    }
    
    darkenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const newR = Math.max(0, Math.floor(r * (1 - factor)));
        const newG = Math.max(0, Math.floor(g * (1 - factor)));
        const newB = Math.max(0, Math.floor(b * (1 - factor)));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
    }
    
    updateLives() {
        this.livesElement.textContent = this.lives;
    }
    
    updateLevel() {
        this.levelElement.textContent = this.level;
    }
    
    resetPositions() {
        this.pacman.x = 1;
        this.pacman.y = 1;
        this.pacman.smoothX = 1;
        this.pacman.smoothY = 1;
        this.pacman.direction = 'right';
        this.pacman.nextDirection = 'right';
        this.pacman.moving = false;
        
        // Resetear fantasmas a posiciones centrales
        const centerX = Math.floor(this.COLS / 2);
        const centerY = Math.floor(this.ROWS / 2);
        
        const ghostPositions = [
            { x: centerX - 1, y: centerY },
            { x: centerX, y: centerY },
            { x: centerX + 1, y: centerY },
            { x: centerX, y: centerY - 1 }
        ];
        
        this.ghosts.forEach((ghost, index) => {
            ghost.x = ghostPositions[index].x;
            ghost.y = ghostPositions[index].y;
            ghost.smoothX = ghostPositions[index].x;
            ghost.smoothY = ghostPositions[index].y;
            ghost.mode = 'chase';
            ghost.modeTimer = 0;
            ghost.moving = false;
        });
    }
    
    nextLevel() {
        this.level++;
        this.updateLevel();
        this.playSound(1000, 0.5, 'sine', 0.06);
        
        // Regenerar laberinto y pellets
        this.maze = this.generateMaze();
        this.initializePellets();
        this.resetPositions();
        
        // Aumentar dificultad
        this.ghosts.forEach(ghost => {
            ghost.speed = Math.min(ghost.speed + 0.1, 2);
        });
    }
    
    gameOver() {
        this.gameRunning = false;
        this.finalScoreElement.textContent = this.score;
        this.gameOverElement.style.display = 'block';
        this.playSound(100, 1, 'sawtooth', 0.1);
    }
    
    restart() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameRunning = true;
        this.gamePaused = false;
        
        this.updateScore();
        this.updateLives();
        this.updateLevel();
        
        this.gameOverElement.style.display = 'none';
        this.gamePausedElement.style.display = 'none';
        
        this.maze = this.generateMaze();
        this.initializePellets();
        this.resetPositions();
        
        // Reiniciar fantasmas con colores pastel para fondo negro
        this.ghosts.forEach((ghost, index) => {
            ghost.color = ['#E6A8B8', '#B8B8E6', '#A8D4C7', '#E6C4A8'][index];
            ghost.speed = 1;
        });
        
        this.playSound(500, 0.3, 'sine', 0.05);
    }
    
    gameLoop() {
        // Optimización para 60 FPS constantes
        if (this.gameRunning && !this.gamePaused) {
            this.gameSpeed++;
            if (this.gameSpeed >= this.maxGameSpeed) {
                this.updatePacman();
                this.updateGhosts();
                this.gameSpeed = 0;
            }
            
            // VALIDACIÓN DE SEGURIDAD: Verificar que todos los personajes estén en posiciones válidas
            this.validateAndCorrectPositions();
        }
        
        // Siempre actualizar animaciones para máxima fluidez visual
        this.updateAnimations();
        
        this.draw();
        
        // Usar requestAnimationFrame para 60 FPS suaves
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateAnimations() {
        // Actualizar animaciones continuas independientemente del estado del juego
        if (this.pacman) {
            // Animación de boca continua más suave
            this.pacman.animation += 0.25;
            
            // Actualizar interpolación suave siempre para fluidez visual
            if (this.gameRunning && !this.gamePaused) {
                // Interpolación más suave para movimiento fluido
                const smoothSpeed = this.pacman.moving ? 0.35 : 0.2;
                this.pacman.smoothX += (this.pacman.x - this.pacman.smoothX) * smoothSpeed;
                this.pacman.smoothY += (this.pacman.y - this.pacman.smoothY) * smoothSpeed;
                
                // Actualizar fantasmas con interpolación continua y suave
                this.ghosts.forEach(ghost => {
                    const ghostSmoothSpeed = ghost.moving ? 0.3 : 0.18;
                    ghost.smoothX += (ghost.x - ghost.smoothX) * ghostSmoothSpeed;
                    ghost.smoothY += (ghost.y - ghost.smoothY) * ghostSmoothSpeed;
                });
            }
        }
    }
}

// Inicializar el juego cuando se carga la página
window.addEventListener('load', () => {
    const game = new PacManGame();
    game.gameRunning = true;
    
    // Ajustar canvas en cambio de tamaño de ventana
    window.addEventListener('resize', () => {
        game.setupResponsiveCanvas();
        game.COLS = Math.floor(game.canvas.width / game.CELL_SIZE);
        game.ROWS = Math.floor(game.canvas.height / game.CELL_SIZE);
    });
}); 