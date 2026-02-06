/* ============================================
   PERDAK — Landing Page Scripts
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // --- Navigation scroll effect ---
    const nav = document.getElementById('nav');
    const handleScroll = () => {
        if (window.scrollY > 50) {
            nav.classList.add('nav--scrolled');
        } else {
            nav.classList.remove('nav--scrolled');
        }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // --- Mobile menu ---
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobileMenu');

    burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            burger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // --- Animated counters ---
    const animateCounter = (el) => {
        const target = parseFloat(el.dataset.target);
        const isFloat = target % 1 !== 0;
        const duration = 2000;
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = eased * target;

            if (isFloat) {
                el.textContent = current.toFixed(1);
            } else {
                el.textContent = Math.floor(current).toLocaleString();
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        requestAnimationFrame(update);
    };

    // --- Intersection Observer for animations ---
    const observerCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // Counter animation trigger
                const counters = entry.target.querySelectorAll('.stat__number');
                if (counters.length) {
                    counters.forEach(counter => {
                        if (!counter.dataset.animated) {
                            counter.dataset.animated = 'true';
                            animateCounter(counter);
                        }
                    });
                }
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Add fade-in class and observe elements
    document.querySelectorAll(
        '.feature-card, .sound-card, .testimonial-card, .price-card, ' +
        '.section-header, .pedal__visual, .pedal__info, .cta__inner, .hero__stats'
    ).forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });

    // --- Card glow effect on mouse move ---
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', x + '%');
            card.style.setProperty('--mouse-y', y + '%');
        });
    });

    // --- Sound card play animation ---
    document.querySelectorAll('.sound-card').forEach(card => {
        let isPlaying = false;

        card.addEventListener('click', () => {
            isPlaying = !isPlaying;
            const playBtn = card.querySelector('.sound-card__play');

            if (isPlaying) {
                // Stop all other cards
                document.querySelectorAll('.sound-card').forEach(c => {
                    if (c !== card) {
                        c.classList.remove('playing');
                        c.querySelector('.sound-card__play').innerHTML =
                            '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
                    }
                });

                card.classList.add('playing');
                playBtn.innerHTML =
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
            } else {
                card.classList.remove('playing');
                playBtn.innerHTML =
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
            }
        });
    });

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;

            e.preventDefault();
            const target = document.querySelector(targetId);
            if (target) {
                const offset = 80;
                const position = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top: position, behavior: 'smooth' });
            }
        });
    });

    // --- Knob interaction (plugin UI) ---
    document.querySelectorAll('.knob').forEach(knob => {
        let isDragging = false;
        let startY;
        let startValue;

        const updateKnob = (value) => {
            value = Math.max(0, Math.min(100, value));
            knob.dataset.value = value;
            const fill = knob.querySelector('.knob__fill');
            const indicator = knob.querySelector('.knob__indicator');
            if (fill) fill.style.setProperty('--value', value);
            if (indicator) {
                const rotation = (value / 100) * 270 - 135;
                indicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
            }
        };

        knob.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startValue = parseInt(knob.dataset.value) || 50;
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const delta = (startY - e.clientY) * 0.5;
            updateKnob(startValue + delta);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
            }
        });
    });

    // --- Mode buttons ---
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('mode-btn--active'));
            btn.classList.add('mode-btn--active');
        });
    });

    // --- Parallax for hero glows ---
    let ticking = false;
    window.addEventListener('mousemove', (e) => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const x = (e.clientX / window.innerWidth - 0.5) * 30;
            const y = (e.clientY / window.innerHeight - 0.5) * 30;
            document.querySelectorAll('.hero__glow').forEach((glow, i) => {
                const factor = i === 0 ? 1 : -0.7;
                glow.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
            });
            ticking = false;
        });
    });

});
