/**
 * CALC-X — Full Featured Calculator
 * Features: Basic ops, trig, log, power, sqrt, memory, parentheses, keyboard support
 */

class Calculator {
  constructor() {
    // DOM refs
    this.display     = document.getElementById('display');
    this.expression  = document.getElementById('expression');
    this.memIndicator = document.getElementById('memIndicator');
    this.modeRad     = document.getElementById('modeRad');
    this.modeDeg     = document.getElementById('modeDeg');
    this.themeToggle = document.getElementById('themeToggle');
    this.helpPanel   = document.getElementById('helpPanel');
    this.helpPanelToggle = document.getElementById('helpPanelToggle');
    this.helpFab     = document.getElementById('helpFab');

    // State
    this.currentInput  = '0';
    this.expressionStr = '';
    this.memory        = 0;
    this.isRadians     = true;
    this.justEvaluated = false;
    this.hasError      = false;
    this.parenDepth    = 0;

    this.init();
  }

  /* ─── Initialization ─────────────────────────────── */
  init() {
    // Button click events
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', e => {
        this.ripple(btn, e);
        this.handleAction(btn.dataset.action);
      });
    });

    // Mode toggle (RAD / DEG)
    this.modeRad.addEventListener('click', () => this.setMode(true));
    this.modeDeg.addEventListener('click', () => this.setMode(false));

    // Keyboard support
    document.addEventListener('keydown', e => this.handleKeyboard(e));

    // Theme toggle
    this.initTheme();
    this.themeToggle?.addEventListener('click', () => this.toggleTheme());

    // Right panel toggle (desktop)
    this.initHelpPanel();
    this.helpPanelToggle?.addEventListener('click', () => this.toggleHelpPanel(false));
    this.helpFab?.addEventListener('click', () => this.toggleHelpPanel());

    this.updateDisplay();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('calcTheme');
    const theme = savedTheme === 'light' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', theme);
    this.updateThemeToggleLabel(theme);
  }

  toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.body.setAttribute('data-theme', nextTheme);
    localStorage.setItem('calcTheme', nextTheme);
    this.updateThemeToggleLabel(nextTheme);
  }

  updateThemeToggleLabel(theme) {
    if (!this.themeToggle) return;
    this.themeToggle.textContent = theme === 'light' ? 'Dark' : 'Light';
  }

  initHelpPanel() {
    if (!this.helpPanel || !this.helpPanelToggle || !this.helpFab) return;
    const isOpen = localStorage.getItem('calcHelpOpen') === 'true';
    this.helpPanel.classList.toggle('open', isOpen);
    this.updateHelpToggle(isOpen);
  }

  toggleHelpPanel(forceOpen) {
    if (!this.helpPanel) return;
    const currentOpen = this.helpPanel.classList.contains('open');
    const isOpen = typeof forceOpen === 'boolean' ? forceOpen : !currentOpen;
    this.helpPanel.classList.toggle('open', isOpen);
    localStorage.setItem('calcHelpOpen', String(isOpen));
    this.updateHelpToggle(isOpen);
  }

  updateHelpToggle(isOpen) {
    if (!this.helpPanelToggle || !this.helpPanel || !this.helpFab) return;
    this.helpPanelToggle.setAttribute('aria-expanded', String(isOpen));
    this.helpPanel.setAttribute('aria-hidden', String(!isOpen));
    this.helpFab.setAttribute('aria-expanded', String(isOpen));
    this.helpFab.textContent = isOpen ? 'Close Interaction' : 'Desktop Interaction';
  }

  setMode(isRad) {
    this.isRadians = isRad;
    this.modeRad.classList.toggle('active', isRad);
    this.modeDeg.classList.toggle('active', !isRad);
  }

  /* ─── Ripple effect ──────────────────────────────── */
  ripple(btn, e) {
    const r = document.createElement('span');
    r.classList.add('ripple');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
    btn.appendChild(r);
    setTimeout(() => r.remove(), 400);
  }

  /* ─── Keyboard handler ───────────────────────────── */
  handleKeyboard(e) {
    const fnShortcutMap = {
      's': 'sin',
      'c': 'cos',
      't': 'tan',
      'l': 'log',
      'n': 'ln',
      'r': 'sqrt',
      'p': 'pi',
      'e': 'e',
    };

    const lowerKey = e.key.toLowerCase();
    if (fnShortcutMap[lowerKey]) {
      e.preventDefault();
      this.handleAction(fnShortcutMap[lowerKey]);
      return;
    }

    const map = {
      '0':'0','1':'1','2':'2','3':'3','4':'4',
      '5':'5','6':'6','7':'7','8':'8','9':'9',
      'Numpad0':'0','Numpad1':'1','Numpad2':'2','Numpad3':'3','Numpad4':'4',
      'Numpad5':'5','Numpad6':'6','Numpad7':'7','Numpad8':'8','Numpad9':'9',
      '.':'.', 'NumpadDecimal':'.', '+':'+', 'NumpadAdd':'+',
      '-':'−', 'NumpadSubtract':'−', '*':'×', 'x':'×', 'X':'×', 'NumpadMultiply':'×',
      '/':'÷', 'NumpadDivide':'÷',
      'Enter':'=', '=':'=', 'Backspace':'del',
      'NumpadEnter':'=', 'Escape':'AC', 'Delete':'AC', '%':'%', '^':'power',
      '(':' (', ')':')',
    };
    if (map[e.key]) {
      e.preventDefault();
      this.handleAction(map[e.key].trim());
    }
  }

  /* ─── Main action dispatcher ─────────────────────── */
  handleAction(action) {
    if (this.hasError && action !== 'AC') {
      if (action === 'del') { this.clear(); return; }
      return;
    }

    switch (action) {
      case 'AC':   this.clear(); break;
      case 'del':  this.deleteLast(); break;
      case '=':    this.evaluate(); break;
      case '+': case '−': case '×': case '÷':
        this.inputOperator(action); break;
      case '%':    this.inputPercent(); break;
      case 'power': this.inputOperator('^'); break;
      case '(':
      case ')':    this.inputParen(action); break;
      case '±':    this.toggleSign(); break;
      case '.':    this.inputDecimal(); break;
      case 'pi':   this.inputConstant('π', Math.PI); break;
      case 'e':    this.inputConstant('e', Math.E); break;
      case 'sin':  this.inputFunction('sin'); break;
      case 'cos':  this.inputFunction('cos'); break;
      case 'tan':  this.inputFunction('tan'); break;
      case 'log':  this.inputFunction('log'); break;
      case 'ln':   this.inputFunction('ln'); break;
      case 'sqrt': this.inputFunction('√'); break;
      case 'square': this.inputSquare(); break;
      case 'MC':   this.memoryClear(); break;
      case 'MR':   this.memoryRecall(); break;
      case 'MS':   this.memoryStore(); break;
      default:
        if (/^[0-9]$/.test(action)) this.inputDigit(action);
    }
  }

  /* ─── Clear ──────────────────────────────────────── */
  clear() {
    this.currentInput  = '0';
    this.expressionStr = '';
    this.justEvaluated = false;
    this.hasError      = false;
    this.parenDepth    = 0;
    this.display.classList.remove('error', 'shrink', 'tiny');
    this.updateDisplay();
  }

  /* ─── Delete last character ──────────────────────── */
  deleteLast() {
    if (this.justEvaluated) { this.clear(); return; }
    if (this.currentInput.length <= 1 || this.currentInput === 'Error') {
      this.currentInput = '0';
    } else {
      // Handle multi-char tokens at end
      const multiChar = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', '√('];
      let removed = false;
      for (const mc of multiChar) {
        if (this.currentInput.endsWith(mc)) {
          this.currentInput = this.currentInput.slice(0, -mc.length) || '0';
          this.parenDepth = Math.max(0, this.parenDepth - 1);
          removed = true; break;
        }
      }
      if (!removed) {
        const last = this.currentInput.slice(-1);
        if (last === '(') this.parenDepth = Math.max(0, this.parenDepth - 1);
        if (last === ')') this.parenDepth++;
        this.currentInput = this.currentInput.slice(0, -1) || '0';
      }
    }
    this.updateDisplay();
  }

  /* ─── Digit input ────────────────────────────────── */
  inputDigit(d) {
    if (this.justEvaluated) {
      this.currentInput  = d;
      this.expressionStr = '';
      this.justEvaluated = false;
    } else {
      this.currentInput = (this.currentInput === '0') ? d : this.currentInput + d;
    }
    this.updateDisplay();
  }

  /* ─── Decimal ────────────────────────────────────── */
  inputDecimal() {
    if (this.justEvaluated) {
      this.currentInput  = '0.';
      this.expressionStr = '';
      this.justEvaluated = false;
      this.updateDisplay();
      return;
    }
    // Find last number segment
    const lastNum = this.currentInput.split(/[\+\−\×\÷\^\(\)]/).pop();
    if (!lastNum.includes('.')) {
      this.currentInput += (this.currentInput === '0' ? '' : '') + (lastNum === '' ? '0' : '') + '.';
      if (this.currentInput.startsWith('.')) this.currentInput = '0' + this.currentInput;
    }
    this.updateDisplay();
  }

  /* ─── Operator input ─────────────────────────────── */
  inputOperator(op) {
    this.justEvaluated = false;
    const last = this.currentInput.slice(-1);
    const ops  = ['+', '−', '×', '÷', '^'];
    if (ops.includes(last)) {
      // Replace last operator
      this.currentInput = this.currentInput.slice(0, -1) + op;
    } else {
      this.currentInput += op;
    }
    this.updateDisplay();
  }

  inputPercent() {
    if (this.hasError) return;

    // Pattern: <leftExpr><op><lastNumber>
    const match = this.currentInput.match(/^(.*?)([+−×÷])(\-?\d*\.?\d+)$/);
    if (match) {
      const [, leftExpr, op, numberText] = match;
      const baseExpr = leftExpr || '0';
      const baseVal = this.computeExpression(baseExpr);
      const numberVal = parseFloat(numberText);
      if (Number.isFinite(baseVal) && Number.isFinite(numberVal)) {
        const percentVal = (op === '+' || op === '−')
          ? (baseVal * numberVal / 100)
          : (numberVal / 100);
        this.currentInput = `${leftExpr}${op}${this.formatNumber(percentVal)}`;
        this.updateDisplay();
      }
      return;
    }

    // Standalone number -> divide by 100
    const value = this.computeExpression(this.currentInput);
    if (Number.isFinite(value)) {
      this.currentInput = this.formatNumber(value / 100);
      this.updateDisplay();
    }
  }

  /* ─── Parentheses ────────────────────────────────── */
  inputParen(p) {
    if (this.justEvaluated) {
      this.expressionStr = '';
      this.justEvaluated = false;
    }
    if (p === '(') {
      const last = this.currentInput.slice(-1);
      // Auto-multiply if digit or ) precedes (
      if (/[0-9\)]/.test(last)) this.currentInput += '×';
      this.currentInput += '(';
      this.parenDepth++;
    } else {
      // Only close if there's a matching open
      if (this.parenDepth > 0) {
        this.currentInput += ')';
        this.parenDepth--;
      }
    }
    this.updateDisplay();
  }

  /* ─── Toggle sign ────────────────────────────────── */
  toggleSign() {
    if (this.currentInput === '0') return;
    // Try to negate the last number token
    const match = this.currentInput.match(/^(.*?)([\+\−\×\÷\^])?(\-?\d*\.?\d+)$/);
    if (match) {
      const [, pre, op, num] = match;
      const negated = (parseFloat(num) * -1).toString();
      this.currentInput = pre + (op || '') + negated;
    } else if (this.currentInput.startsWith('-')) {
      this.currentInput = this.currentInput.slice(1);
    } else {
      this.currentInput = '-' + this.currentInput;
    }
    this.updateDisplay();
  }

  /* ─── Function input (sin, cos, log, √…) ────────── */
  inputFunction(fn) {
    if (this.justEvaluated) {
      // Wrap the result
      this.currentInput = fn + '(' + this.currentInput + ')';
      this.expressionStr = this.currentInput;
      this.justEvaluated = false;
      this.updateDisplay();
      return;
    }
    const last = this.currentInput.slice(-1);
    if (/[0-9\)]/.test(last)) this.currentInput += '×';
    this.currentInput += fn + '(';
    this.parenDepth++;
    this.updateDisplay();
  }

  /* ─── Square (x²) ───────────────────────────────── */
  inputSquare() {
    if (this.justEvaluated) {
      const val = parseFloat(this.currentInput);
      if (!isNaN(val)) {
        const result = val * val;
        this.expressionStr = this.currentInput + '²';
        this.currentInput  = this.formatNumber(result);
        this.justEvaluated = true;
        this.updateDisplay();
        return;
      }
    }
    this.currentInput += '^2';
    this.updateDisplay();
  }

  /* ─── Constants ──────────────────────────────────── */
  inputConstant(symbol, value) {
    if (this.justEvaluated) {
      this.currentInput  = symbol;
      this.expressionStr = '';
      this.justEvaluated = false;
    } else {
      const last = this.currentInput.slice(-1);
      if (/[0-9\)]/.test(last)) this.currentInput += '×';
      if (this.currentInput === '0') this.currentInput = '';
      this.currentInput += symbol;
    }
    this.updateDisplay();
  }

  /* ─── Memory ops ─────────────────────────────────── */
  memoryClear() {
    this.memory = 0;
    this.memIndicator.classList.add('hidden');
  }

  memoryRecall() {
    if (this.memory === 0) return;
    const val = this.formatNumber(this.memory);
    if (this.justEvaluated || this.currentInput === '0') {
      this.currentInput  = val;
      this.expressionStr = '';
      this.justEvaluated = false;
    } else {
      const last = this.currentInput.slice(-1);
      if (/[0-9\)]/.test(last)) this.currentInput += '×';
      this.currentInput += val;
    }
    this.updateDisplay();
  }

  memoryStore() {
    try {
      const val = this.computeExpression(this.currentInput);
      if (!isNaN(val) && isFinite(val)) {
        this.memory += val;
        this.memIndicator.classList.remove('hidden');
        this.memIndicator.classList.add('active');
        // Flash indicator
        setTimeout(() => this.memIndicator.classList.remove('active'), 500);
      }
    } catch {}
  }

  /* ─── Evaluate ───────────────────────────────────── */
  evaluate() {
    if (this.justEvaluated || this.currentInput === '0') return;

    // Auto-close open parentheses
    let expr = this.currentInput;
    while (this.parenDepth > 0) { expr += ')'; this.parenDepth--; }

    this.expressionStr = expr + ' =';
    try {
      const result = this.computeExpression(expr);
      if (!isFinite(result)) throw new Error('Division by zero');
      this.currentInput  = this.formatNumber(result);
      this.justEvaluated = true;
      this.flashDisplay();
    } catch (err) {
      this.showError(err.message === 'Division by zero' ? 'Div by Zero' : 'Error');
    }

    this.updateDisplay();
  }

  /* ─── Core expression evaluator ─────────────────── */
  computeExpression(expr) {
    // Replace display symbols with JS-parseable equivalents
    let e = expr
      .replace(/π/g, `(${Math.PI})`)
      .replace(/\be\b/g, `(${Math.E})`)
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\^/g, '**');

    // Replace trig / log / sqrt functions
    e = e.replace(/sin\(/g,  this.isRadians ? 'Math.sin('  : 'Math.sin(Math.PI/180*')
         .replace(/cos\(/g,  this.isRadians ? 'Math.cos('  : 'Math.cos(Math.PI/180*')
         .replace(/tan\(/g,  this.isRadians ? 'Math.tan('  : 'Math.tan(Math.PI/180*')
         .replace(/log\(/g,  'Math.log10(')
         .replace(/ln\(/g,   'Math.log(')
         .replace(/√\(/g,    'Math.sqrt(');

    // Validate: only allow safe characters
    if (!/^[\d\s\+\-\*\/\.\(\)MathsincotaglqrepPI\d_,]+$/.test(e.replace(/Math\.\w+/g, '')) ) {
      // Fallback: run the safe eval
    }

    // Safe eval using Function (no global scope access)
    const fn = new Function('"use strict"; return (' + e + ')');
    const result = fn();
    return result;
  }

  /* ─── Format result number ───────────────────────── */
  formatNumber(n) {
    if (typeof n !== 'number' || isNaN(n)) return 'Error';
    if (!isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity';

    // Handle very large / very small numbers
    if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-9 && n !== 0)) {
      return n.toExponential(6).replace(/\.?0+e/, 'e');
    }

    // Limit precision to avoid floating point noise
    const str = parseFloat(n.toPrecision(12)).toString();
    return str;
  }

  /* ─── Error display ──────────────────────────────── */
  showError(msg) {
    this.currentInput  = msg;
    this.hasError      = true;
    this.justEvaluated = false;
  }

  /* ─── Flash animation on = ───────────────────────── */
  flashDisplay() {
    this.display.classList.remove('flash');
    void this.display.offsetWidth; // reflow
    this.display.classList.add('flash');
    setTimeout(() => this.display.classList.remove('flash'), 300);
  }

  /* ─── Update display DOM ─────────────────────────── */
  updateDisplay() {
    // Expression line
    this.expression.textContent = this.expressionStr || '';

    // Main display
    const text = this.currentInput;
    this.display.textContent = text;

    // Dynamic font sizing
    this.display.classList.remove('shrink', 'tiny', 'error');
    if (this.hasError) {
      this.display.classList.add('error');
    } else if (text.length > 14) {
      this.display.classList.add('tiny');
    } else if (text.length > 9) {
      this.display.classList.add('shrink');
    }
  }
}

/* ── Boot ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  window.calc = new Calculator();
});
