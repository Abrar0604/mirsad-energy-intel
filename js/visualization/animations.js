// ============================================================
// MIRSAD — Animations Module
// Micro-animations for UI polish
// ============================================================

class AnimationManager {
  constructor() {
    this.counters = new Map();
    this.observers = [];
  }

  // Animated counter — smoothly counts from 0 to target
  animateCounter(element, target, options = {}) {
    const {
      duration = 1200,
      decimals = 0,
      prefix = '',
      suffix = '',
      useCommas = true
    } = options;

    if (!element) return;

    const startTime = performance.now();
    const startValue = parseFloat(element.textContent.replace(/[^0-9.-]/g, '')) || 0;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (target - startValue) * easeOut;
      
      let formatted = current.toFixed(decimals);
      if (useCommas) {
        const parts = formatted.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formatted = parts.join('.');
      }
      
      element.textContent = prefix + formatted + suffix;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  // Animate gauge (SVG arc)
  animateGauge(fillElement, targetPercent, options = {}) {
    const {
      duration = 1000,
      radius = 52,
      maxAngle = 270
    } = options;

    if (!fillElement) return;

    const circumference = 2 * Math.PI * radius;
    const maxDash = circumference * (maxAngle / 360);
    const targetDash = maxDash * (1 - targetPercent / 100);

    fillElement.style.strokeDasharray = `${maxDash} ${circumference}`;
    fillElement.style.strokeDashoffset = maxDash; // Start empty

    const startTime = performance.now();
    const startOffset = maxDash;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentOffset = startOffset + (targetDash - startOffset) * easeOut;
      fillElement.style.strokeDashoffset = currentOffset;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  // Stagger animation for list items
  staggerEntrance(container, selector, options = {}) {
    const {
      delay = 50,
      duration = 400,
      translateY = 15,
      startDelay = 0
    } = options;

    if (!container) return;
    
    const items = container.querySelectorAll(selector);
    items.forEach((item, index) => {
      item.style.opacity = '0';
      item.style.transform = `translateY(${translateY}px)`;
      item.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
      
      setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      }, startDelay + index * delay);
    });
  }

  // Typing effect for text
  typeText(element, text, options = {}) {
    const { speed = 30, startDelay = 0 } = options;
    
    if (!element) return;
    element.textContent = '';
    
    setTimeout(() => {
      let i = 0;
      const timer = setInterval(() => {
        if (i < text.length) {
          element.textContent += text[i];
          i++;
        } else {
          clearInterval(timer);
        }
      }, speed);
    }, startDelay);
  }

  // Pulse effect on element
  pulse(element, options = {}) {
    const { 
      color = 'var(--color-accent-glow)', 
      duration = 600 
    } = options;
    
    if (!element) return;
    
    element.style.transition = `box-shadow ${duration}ms ease`;
    element.style.boxShadow = `0 0 20px ${color}`;
    
    setTimeout(() => {
      element.style.boxShadow = 'none';
    }, duration);
  }

  // Smooth progress bar fill
  animateProgressBar(fillElement, targetWidth, options = {}) {
    const { duration = 800, color = null } = options;
    
    if (!fillElement) return;
    
    fillElement.style.width = '0%';
    if (color) fillElement.style.background = color;
    fillElement.style.transition = `width ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    
    requestAnimationFrame(() => {
      fillElement.style.width = targetWidth + '%';
    });
  }

  // Notification slide in
  slideInNotification(element) {
    if (!element) return;
    
    element.style.transform = 'translateX(100%)';
    element.style.opacity = '0';
    element.style.transition = 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease';
    
    requestAnimationFrame(() => {
      element.style.transform = 'translateX(0)';
      element.style.opacity = '1';
    });
  }

  // Shake effect (for errors)
  shake(element) {
    if (!element) return;
    element.style.animation = 'none';
    element.offsetHeight; // Trigger reflow
    element.style.animation = 'shake 0.5s ease';
  }

  // Number flash effect
  flashNumber(element, options = {}) {
    const { color = '#00b4d8', duration = 300 } = options;
    
    if (!element) return;
    
    const originalColor = element.style.color;
    element.style.color = color;
    element.style.transform = 'scale(1.15)';
    element.style.transition = `color ${duration}ms ease, transform ${duration}ms ease`;
    
    setTimeout(() => {
      element.style.color = originalColor || '';
      element.style.transform = 'scale(1)';
    }, duration);
  }
}

// Add shake keyframes if not present
if (!document.querySelector('#mirsad-animations')) {
  const style = document.createElement('style');
  style.id = 'mirsad-animations';
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 50%, 90% { transform: translateX(-4px); }
      30%, 70% { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(style);
}

export { AnimationManager };
