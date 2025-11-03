// ===== CONFIGURACIÓN DE POSICIONES Y ESTADOS =====
const positions = {
    0: {x: 120, y: 300}, 1: {x: 280, y: 300}, 2: {x: 200, y: 180}, 
    3: {x: 330, y: 180}, 4: {x: 460, y: 180}, 5: {x: 590, y: 180}, 
    6: {x: 720, y: 180}, 7: {x: 850, y: 180}, 8: {x: 980, y: 180}, 
    9: {x: 930, y: 80}, 10: {x: 1060, y: 40}, 11: {x: 1180, y: 100}, 
    12: {x: 1300, y: 100}
};

const stateNames = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12'];

// ===== SISTEMA DE TRANSICIONES =====
const transitions = {};
const allTransitions = [];

/**
 * Agrega una transición al autómata
 */
function addTrans(from, read, pop, to, push) {
    const rKey = read || 'ε';
    if (!transitions[from]) transitions[from] = {};
    if (!transitions[from][rKey]) transitions[from][rKey] = {};
    transitions[from][rKey][pop] = { to, push: push || '' };
    allTransitions.push({ from, read: rKey, pop, to, push: push || 'ε' });
}

/**
 * Inicializa todas las transiciones del autómata
 */
function initTransitions() {
    // Limpiar transiciones anteriores
    for (let key in transitions) delete transitions[key];
    allTransitions.length = 0;

    // Definir transiciones según el autómata
    addTrans(0, 'y', 'Z', 1, 'Z');
    addTrans(0, 'y', 'Y', 1, 'Y');
    addTrans(0, 'z', 'Y', 2, 'Y');
    addTrans(0, 'x', 'Z', 0, 'Z');
    addTrans(0, 'x', 'Y', 0, 'Y');
    addTrans(1, 'y', 'Y', 0, 'YY');
    addTrans(1, 'y', 'Z', 0, 'YZ');
    addTrans(2, 'z', 'Y', 3, 'Y');
    addTrans(3, 'z', 'Y', 4, 'Y');
    addTrans(4, 'z', 'Y', 5, 'Y');
    addTrans(5, 'z', 'Y', 6, 'Y');
    addTrans(6, 'z', 'Y', 7, 'Y');
    addTrans(7, 'z', 'Y', 8, 'Y');
    addTrans(8, 'z', 'Y', 7, 'Y');
    addTrans(7, 'y', 'Y', 9, 'Y');
    addTrans(9, 'y', 'Y', 10, 'Y');
    addTrans(10, 'y', 'Y', 11, '');
    addTrans(11, 'y', 'Y', 9, 'Y');
    addTrans(11, '', 'Z', 12, '');

    // Renderizar tabla de transiciones
    const tbody = document.querySelector('#trans-table tbody');
    tbody.innerHTML = '';
    allTransitions.forEach(t => {
        const row = `<tr>
            <td>${stateNames[t.from]}</td>
            <td>${t.read}</td>
            <td>${t.pop}</td>
            <td>→</td>
            <td>${t.push}</td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

/**
 * Busca una transición válida para el estado actual
 */
function getTransition(state, inputSymbol, stackTop) {
    if (inputSymbol) {
        const trans = transitions[state]?.[inputSymbol]?.[stackTop];
        if (trans) return { ...trans, read: inputSymbol };
    }
    const epsilonTrans = transitions[state]?.['ε']?.[stackTop];
    if (epsilonTrans) return { ...epsilonTrans, read: 'ε' };
    return null;
}

// ===== VALIDACIÓN DE LENGUAJE =====
/**
 * Valida si una cadena pertenece al lenguaje del autómata
 */
function validateLanguage(input) {
    if (!/^[xyz]+$/.test(input)) {
        return { valid: false, message: "Solo se permiten x, y, z" };
    }

    const regex = /^(x*)(y+)(z+)(y*)$/;
    const match = input.match(regex);

    if (!match) {
        return { valid: false, message: "Formato incorrecto: debe ser x* y... z... y..." };
    }

    const [_, xs, y1Block, zBlock, y2Block] = match;

    const zPart = input.slice(xs.length + y1Block.length, 
                             xs.length + y1Block.length + 
                             (input.length - xs.length - y1Block.length - y2Block.length));
    
    if (!/^z+$/.test(zPart)) {
        return { valid: false, message: "Los z deben estar juntos entre las y's" };
    }

    const y1 = y1Block.length;
    const zTotal = zPart.length;
    const y2 = y2Block.length;

    // Validar y^{2n}
    if (y1 < 2 || y1 % 2 !== 0) {
        return { valid: false, message: `y^{2n}: debe haber un número par de y's (≥2). Tienes ${y1}` };
    }
    const n = y1 / 2;
    if (n < 1) {
        return { valid: false, message: "n debe ser ≥1 → al menos 2 y's al inicio" };
    }

    // Validar z^{2m+2}
    if (zTotal < 4 || zTotal % 2 !== 0) {
        return { valid: false, message: `z^{2m+2}: debe haber un número par de z's (≥4). Tienes ${zTotal}` };
    }
    const m = (zTotal / 2) - 1;
    if (m < 2) {
        return { valid: false, message: "m debe ser ≥2 → al menos 4 z's" };
    }

    // Validar y^{3n}
    if (y2 !== 3 * n) {
        return { valid: false, message: `y^{3n}: debe haber ${3*n} y's al final. Tienes ${y2}` };
    }

    return { valid: true, message: `Cadena válida: n=${n}, m=${m}`, n, m };
}

// ===== OPERACIONES DE PILA =====
/**
 * Aplica operación de push a la pila
 */
function applyPush(stack, pushStr) {
    for (let i = pushStr.length - 1; i >= 0; i--) {
        stack.push(pushStr[i]);
    }
}

// ===== SIMULADOR PDA PRINCIPAL =====
const pda = {
    state: 0,
    input: '',
    remaining: '',
    stack: [],
    trace: [],
    stepIndex: 0,

    /**
     * Carga una cadena para simulación
     */
    load() {
        const input = document.getElementById('input-w').value.trim();
        const status = document.getElementById('status');

        if (!input) {
            status.textContent = 'Ingresa una cadena para simular';
            status.className = 'status rejected';
            return;
        }

        const langCheck = validateLanguage(input);
        if (!langCheck.valid) {
            alert("VALIDACIÓN FALLIDA:\n" + langCheck.message);
            status.textContent = langCheck.message;
            status.className = 'status rejected';
            return;
        }

        // Inicializar simulación
        this.state = 0;
        this.input = input;
        this.remaining = input;
        this.stack = ['Z'];
        this.trace = [{
            step: 0,
            state: 0,
            remaining: input,
            stack: 'Z',
            action: 'Inicial'
        }];
        this.stepIndex = 0;

        status.textContent = `Cadena válida (n=${langCheck.n}, m=${langCheck.m}) → Presiona "Paso"`;
        status.className = 'status';
        this.enableButtons();
        this.updateUI();
    },

    /**
     * Ejecuta un paso de simulación
     */
    step() {
        if (this.isFinished()) return false;

        const current = this.trace[this.stepIndex];
        const inputSymbol = this.remaining[0] || null;
        const stackTop = this.stack[this.stack.length - 1];

        console.log("=== DEBUG PDA ===");
        console.log(`Paso ${this.stepIndex}: Estado q${current.state}`);
        console.log(`Leer: '${inputSymbol}', Pila: '${stackTop}'`);
        console.log(`Restante: '${this.remaining}'`);

        const trans = getTransition(current.state, inputSymbol, stackTop);
        
        if (trans) {
            console.log(`TRANSICIÓN: q${current.state} --${trans.read},${stackTop}/${trans.push}--> q${trans.to}`);
        } else {
            console.log(`NO HAY TRANSICIÓN para (q${current.state}, '${inputSymbol}', '${stackTop}')`);
        }

        if (!trans) {
            this.finalize(false);
            return false;
        }

        // Aplicar transición
        const newRemaining = trans.read === 'ε' ? this.remaining : this.remaining.slice(1);
        const newStack = [...this.stack];
        newStack.pop();
        applyPush(newStack, trans.push);

        // Actualizar estado
        this.state = trans.to;
        this.remaining = newRemaining;
        this.stack = newStack;

        // Registrar traza
        this.stepIndex++;
        this.trace.push({
            step: this.stepIndex,
            state: trans.to,
            remaining: newRemaining,
            stack: newStack.join('') || '∅',
            action: `${trans.read === 'ε' ? 'ε' : trans.read},${stackTop}/${trans.push || 'ε'}`
        });

        this.updateUI();

        // Verificar aceptación
        const isAccepted = this.remaining === '' && this.state === 12 && this.stack.length === 0;
        console.log(`¿Aceptado? ${isAccepted} (restante: '${this.remaining}', estado: q${this.state}, pila vacía: ${this.stack.length === 0})`);
        
        if (isAccepted) {
            this.finalize(true);
        }

        return true;
    },

    /**
     * Ejecuta la simulación completa
     */
    run() {
        if (this.isFinished()) return;
        while (this.step()) {}
        if (!this.isAccepted()) {
            this.finalize(false);
        }
    },

    /**
     * Verifica si la simulación ha terminado
     */
    isFinished() {
        const status = document.getElementById('status');
        return status.classList.contains('accepted') || status.classList.contains('rejected');
    },

    /**
     * Verifica si la cadena actual es aceptada
     */
    isAccepted() {
        return this.remaining === '' && this.state === 12 && this.stack.length === 0;
    },

    /**
     * Finaliza la simulación
     */
    finalize(accepted) {
        const status = document.getElementById('status');
        status.textContent = accepted ? 'CADENA ACEPTADA' : 'CADENA RECHAZADA';
        status.className = accepted ? 'status accepted' : 'status rejected';
        this.disableButtons();
        this.updateUI();
    },

    /**
     * Deshabilita los controles de paso
     */
    disableButtons() {
        document.querySelectorAll('.btn-group button').forEach(btn => {
            if (btn.textContent.includes('Paso') || btn.textContent.includes('Ejecutar')) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        });
    },

    /**
     * Habilita los controles de simulación
     */
    enableButtons() {
        document.querySelectorAll('.btn-group button').forEach(btn => {
            if (btn.textContent.includes('Paso') || btn.textContent.includes('Ejecutar')) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    },

    /**
     * Reinicia el simulador
     */
    reset() {
        document.getElementById('input-w').value = '';
        const status = document.getElementById('status');
        status.textContent = '¡Listo para cargar cadena!';
        status.className = 'status';
        this.enableButtons();
        this.trace = [];
        this.stepIndex = 0;
        this.state = 0;
        this.remaining = '';
        this.stack = [];
        this.updateUI();
    },

    /**
     * Actualiza la interfaz de usuario
     */
    updateUI() {
        const tbody = document.getElementById('trace-tbody');
        tbody.innerHTML = '';
        
        if (this.trace.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>0</td>
                <td>q0</td>
                <td></td>
                <td>Z</td>
                <td>Inicial</td>
            `;
            tbody.appendChild(tr);
        } else {
            this.trace.forEach((row, i) => {
                const tr = document.createElement('tr');
                if (i === this.stepIndex) tr.classList.add('current');
                tr.innerHTML = `
                    <td>${row.step}</td>
                    <td>${stateNames[row.state]}</td>
                    <td>${row.remaining}</td>
                    <td>${row.stack}</td>
                    <td>${row.action}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        drawGraph(this.state, this.trace[this.stepIndex]?.state);
        updateStackVisualization();
    }
};

// ===== SISTEMA DE VISUALIZACIÓN DEL GRAFO =====
const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');

// Configuración de posiciones para etiquetas
const LABEL_OFFSETS = {
    // Transiciones de ida y vuelta (curvas)
    q0_to_q1: -25,    // q0→q1: etiquetas encima
    q1_to_q0: 10,     // q1→q0: etiquetas debajo
    q7_to_q8: -10,    // q7→q8: etiquetas encima  
    q8_to_q7: 10,     // q8→q7: etiquetas debajo
    
    // Transiciones rectas (posición por defecto)
    default: 0,
    
    // Posición horizontal general
    horizontal: 0.3,
    
    // Separación entre etiquetas
    lineHeight: 16,
    
    // Configuración avanzada del bucle de q0
    loopQ0: {
        centerX: 0,      // Mover horizontalmente
        centerY: 45,     // Mover verticalmente
        radius: 15,      // Radio del círculo
        labelOffset: 50, // Mover etiquetas
        labelSpacing: 18 // Espacio entre etiquetas
    },
    
    // Configuración por defecto para otros bucles
    loopVertical: -15,
    loopRadius: 45
};

/**
 * Dibuja el grafo del autómata
 */
function drawGraph(currentState = 0, fromState = -1) {
    if (!canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar estados
    for (let i = 0; i < 13; i++) {
        const {x, y} = positions[i];
        
        // Círculo del estado
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.fillStyle = i === currentState ? '#ffcccc' : 'white';
        ctx.fill();
        ctx.strokeStyle = i === currentState ? 'red' : '#333';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Círculo exterior para estado final
        if (i === 12) {
            ctx.beginPath();
            ctx.arc(x, y, 38, 0, Math.PI * 2);
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        // Etiqueta del estado
        ctx.fillStyle = i === currentState ? 'red' : 'black';
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stateNames[i], x, y);
    }

    // Dibujar flecha inicial
    ctx.beginPath();
    ctx.moveTo(50, 300);
    ctx.lineTo(80, 300);
    ctx.strokeStyle = '#1a73e8';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(80, 300);
    ctx.lineTo(70, 290);
    ctx.lineTo(70, 310);
    ctx.closePath();
    ctx.fillStyle = '#1a73e8';
    ctx.fill();

    // Agrupar transiciones
    const edgeGroups = {};
    const loopTransitions = {};
    
    allTransitions.forEach(trans => {
        if (trans.from === trans.to) {
            if (!loopTransitions[trans.from]) {
                loopTransitions[trans.from] = [];
            }
            loopTransitions[trans.from].push(trans);
        } else {
            const key = `${trans.from}-${trans.to}`;
            if (!edgeGroups[key]) {
                edgeGroups[key] = [];
            }
            edgeGroups[key].push(trans);
        }
    });

    // Dibujar transiciones normales
    Object.keys(edgeGroups).forEach(key => {
        const transitions = edgeGroups[key];
        const [from, to] = key.split('-').map(Number);
        const fromPos = positions[from];
        const toPos = positions[to];
        
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const startX = fromPos.x + (dx / dist) * 30;
        const startY = fromPos.y + (dy / dist) * 30;
        const endX = toPos.x - (dx / dist) * 30;
        const endY = toPos.y - (dy / dist) * 30;
        
        // Detectar transición activa
        const currentStep = pda.trace[pda.stepIndex];
        let isActive = false;
        
        if (currentStep && fromState !== -1) {
            isActive = (fromState === from && currentStep.state === to);
        }

        const isBidirectional = (
            (from === 0 && to === 1) || (from === 1 && to === 0) ||
            (from === 7 && to === 8) || (from === 8 && to === 7)
        );
        
        const isQ0toQ1 = from === 0 && to === 1;
        const isQ1toQ0 = from === 1 && to === 0;
        const isQ7toQ8 = from === 7 && to === 8;
        const isQ8toQ7 = from === 8 && to === 7;
        
        ctx.strokeStyle = isActive ? '#1a73e8' : '#999';
        ctx.lineWidth = isActive ? 3 : 1.5;
        ctx.fillStyle = isActive ? '#1a73e8' : '#000';

        if (isBidirectional) {
            // Dibujar flecha curva para transiciones bidireccionales
            const cpX = (startX + endX) / 2 + dy * 0.2;
            const cpY = (startY + endY) / 2 - dx * 0.2;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
            ctx.stroke();
            
            const angle = Math.atan2(endY - cpY, endX - cpX);
            const arrowX = endX - Math.cos(angle) * 10;
            const arrowY = endY - Math.sin(angle) * 10;
            
            ctx.save();
            ctx.translate(arrowX, arrowY);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-10, -6);
            ctx.lineTo(-10, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            
        } else {
            // Dibujar flecha recta
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            const angle = Math.atan2(dy, dx);
            const arrowX = endX - Math.cos(angle) * 10;
            const arrowY = endY - Math.sin(angle) * 10;
            
            ctx.save();
            ctx.translate(arrowX, arrowY);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-10, -6);
            ctx.lineTo(-10, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        
        // Dibujar etiquetas de transición
        const labelX = (startX + endX) / 2 + dy * LABEL_OFFSETS.horizontal;
        const baseLabelY = (startY + endY) / 2 - dx * 0.1;
        const totalLabels = transitions.length;
        
        let startLabelY;
        
        if (isQ0toQ1) {
            startLabelY = baseLabelY + LABEL_OFFSETS.q0_to_q1;
        } else if (isQ1toQ0) {
            startLabelY = baseLabelY + LABEL_OFFSETS.q1_to_q0;
        } else if (isQ7toQ8) {
            startLabelY = baseLabelY + LABEL_OFFSETS.q7_to_q8;
        } else if (isQ8toQ7) {
            startLabelY = baseLabelY + LABEL_OFFSETS.q8_to_q7;
        } else {
            startLabelY = baseLabelY + LABEL_OFFSETS.default;
        }
        
        transitions.forEach((trans, index) => {
            ctx.fillStyle = isActive ? '#1a73e8' : '#000';
            ctx.font = isActive ? 'bold 12px monospace' : '12px monospace';
            
            const labelY = startLabelY + (index * LABEL_OFFSETS.lineHeight);
            ctx.fillText(`${trans.read},${trans.pop}/${trans.push}`, labelX, labelY);
        });
    });

    // Dibujar bucles (transiciones a sí mismo)
    Object.keys(loopTransitions).forEach(stateId => {
        const stateTransitions = loopTransitions[stateId];
        const statePos = positions[stateId];
        
        let loopConfig = LABEL_OFFSETS.loopQ0;
        
        if (stateId != 0) {
            loopConfig = {
                centerX: 0,
                centerY: -50,
                radius: LABEL_OFFSETS.loopRadius,
                labelOffset: LABEL_OFFSETS.loopVertical,
                labelSpacing: LABEL_OFFSETS.lineHeight
            };
        }
        
        const centerX = statePos.x + loopConfig.centerX;
        const centerY = statePos.y + loopConfig.centerY;
        const loopRadius = loopConfig.radius;
        
        // Dibujar círculo del bucle
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, loopRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Dibujar flecha del bucle (solo para q0)
        if (stateId == 0) {
            ctx.save();
            ctx.translate(centerX + loopRadius, centerY);
            ctx.rotate(Math.PI / 4);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-8, -6);
            ctx.lineTo(-8, 6);
            ctx.closePath();
            ctx.fillStyle = '#000';
            ctx.fill();
            ctx.restore();
        }
        
        // Dibujar etiquetas del bucle
        ctx.textAlign = 'center';
        const startY = centerY - loopRadius + loopConfig.labelOffset;
        const totalLabels = stateTransitions.length;
        
        const totalLabelSpace = (totalLabels - 1) * loopConfig.labelSpacing;
        const startLabelY = startY - (totalLabelSpace / 2);
        
        stateTransitions.forEach((trans, index) => {
            ctx.fillStyle = '#000';
            ctx.font = '12px monospace';
            
            const labelY = startLabelY + (index * loopConfig.labelSpacing);
            ctx.fillText(`${trans.read},${trans.pop}/${trans.push}`, centerX, labelY);
        });
    });
}

// ===== FUNCIONES DE INTERFAZ =====
/**
 * Alterna la visibilidad del sidebar
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

/**
 * Actualiza la visualización de la pila
 */
function updateStackVisualization() {
    const stackElements = document.getElementById('stack-elements');
    const stackOperation = document.getElementById('stack-operation');
    
    if (!pda.stack || pda.stack.length === 0) {
        stackElements.innerHTML = '<div class="stack-element vacio">∅</div>';
        stackOperation.textContent = 'Pila vacía';
        return;
    }

    let html = '';
    const currentStep = pda.trace[pda.stepIndex];
    
    // Construir elementos de la pila (del fondo al tope)
    for (let i = 0; i < pda.stack.length; i++) {
        const element = pda.stack[i];
        const isBottom = i === 0;
        const isTop = i === pda.stack.length - 1;
        
        let elementClass = 'stack-element';
        if (isBottom) elementClass += ' fondo';
        if (isTop) elementClass += ' stack-tope';
        
        html = `<div class="${elementClass}">${element}</div>` + html;
    }
    
    stackElements.innerHTML = html;
    
    // Mostrar operación actual
    if (currentStep && currentStep.action !== 'Inicial') {
        stackOperation.textContent = `Transición: ${currentStep.action}`;
    } else {
        stackOperation.textContent = 'Estado inicial';
    }
}

// ===== INICIALIZACIÓN DE LA APLICACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    initTransitions();
    drawGraph(0, -1);
    pda.updateUI();
});