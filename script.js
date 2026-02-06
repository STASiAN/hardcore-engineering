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

    // --- Web Audio API Sound Engine ---
    let audioCtx = null;
    let currentSource = null;

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function createDistortionCurve(type) {
        const samples = 8192;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            switch (type) {
                case 'tube':
                    // Warm tube saturation (soft tanh clipping)
                    curve[i] = Math.tanh(x * 3) * 0.9;
                    break;
                case 'fuzz':
                    // Asymmetric fuzz (germanium-style)
                    curve[i] = x > 0
                        ? 1 - Math.exp(-x * 8)
                        : -(1 - Math.exp(x * 5)) * 0.8;
                    break;
                case 'clip':
                    // Hard clipping (diode-style)
                    const gain = 12;
                    curve[i] = Math.max(-0.7, Math.min(0.7, x * gain));
                    break;
                case 'fold':
                    // Wave folding
                    curve[i] = Math.sin(x * Math.PI * 3) * 0.8;
                    break;
                default:
                    curve[i] = x;
            }
        }
        return curve;
    }

    function playDistortionDemo(mode) {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const duration = 5;

        // Master output chain
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.25, now);
        masterGain.connect(ctx.destination);

        // Compressor for safety
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-12, now);
        compressor.knee.setValueAtTime(10, now);
        compressor.ratio.setValueAtTime(8, now);
        compressor.connect(masterGain);

        // Post-distortion filter (cabinet simulation)
        const cabinet = ctx.createBiquadFilter();
        cabinet.type = 'lowpass';
        cabinet.connect(compressor);

        // Distortion
        const distortion = ctx.createWaveShaper();
        distortion.curve = createDistortionCurve(mode);
        distortion.oversample = '4x';
        distortion.connect(cabinet);

        // Pre-distortion drive gain
        const driveGain = ctx.createGain();
        driveGain.connect(distortion);

        // Configure per mode
        const configs = {
            tube: {
                cabFreq: 3500, cabQ: 0.7, drive: 2.5,
                notes: [
                    { freq: 82.41, dur: 0.8 }, { freq: 110, dur: 0.6 },
                    { freq: 98, dur: 0.5 }, { freq: 82.41, dur: 0.7 },
                    { freq: 110, dur: 0.4 }, { freq: 130.81, dur: 0.5 },
                    { freq: 110, dur: 0.5 }, { freq: 82.41, dur: 1.0 }
                ],
                oscType: 'sawtooth', fifths: true
            },
            fuzz: {
                cabFreq: 2500, cabQ: 1.5, drive: 4,
                notes: [
                    { freq: 110, dur: 0.3 }, { freq: 110, dur: 0.3 },
                    { freq: 146.83, dur: 0.6 }, { freq: 164.81, dur: 0.4 },
                    { freq: 110, dur: 0.3 }, { freq: 110, dur: 0.3 },
                    { freq: 82.41, dur: 0.8 }, { freq: 98, dur: 1.0 }
                ],
                oscType: 'square', fifths: true
            },
            clip: {
                cabFreq: 4500, cabQ: 0.5, drive: 6,
                notes: [
                    { freq: 73.42, dur: 0.2 }, { freq: 73.42, dur: 0.2 },
                    { freq: 73.42, dur: 0.2 }, { freq: 0, dur: 0.15 },
                    { freq: 73.42, dur: 0.4 }, { freq: 98, dur: 0.3 },
                    { freq: 110, dur: 0.25 }, { freq: 73.42, dur: 0.5 },
                    { freq: 0, dur: 0.1 }, { freq: 73.42, dur: 0.2 },
                    { freq: 87.31, dur: 0.5 }, { freq: 73.42, dur: 1.0 }
                ],
                oscType: 'sawtooth', fifths: true
            },
            fold: {
                cabFreq: 6000, cabQ: 1.0, drive: 3,
                notes: [
                    { freq: 220, dur: 0.5 }, { freq: 277.18, dur: 0.5 },
                    { freq: 329.63, dur: 0.5 }, { freq: 440, dur: 0.75 },
                    { freq: 329.63, dur: 0.5 }, { freq: 277.18, dur: 0.5 },
                    { freq: 220, dur: 0.75 }, { freq: 164.81, dur: 1.0 }
                ],
                oscType: 'sawtooth', fifths: false
            }
        };

        const cfg = configs[mode] || configs.tube;
        cabinet.frequency.setValueAtTime(cfg.cabFreq, now);
        cabinet.Q.setValueAtTime(cfg.cabQ, now);
        driveGain.gain.setValueAtTime(cfg.drive, now);

        // Schedule notes
        let noteTime = now;
        const oscillators = [];

        cfg.notes.forEach((note) => {
            if (note.freq === 0) {
                // Rest
                noteTime += note.dur;
                return;
            }

            // Main oscillator
            const osc1 = ctx.createOscillator();
            osc1.type = cfg.oscType;
            osc1.frequency.setValueAtTime(note.freq, noteTime);

            // Note envelope
            const env = ctx.createGain();
            env.gain.setValueAtTime(0, noteTime);
            env.gain.linearRampToValueAtTime(0.4, noteTime + 0.015);
            env.gain.setValueAtTime(0.35, noteTime + note.dur * 0.3);
            env.gain.exponentialRampToValueAtTime(0.001, noteTime + note.dur);

            osc1.connect(env);

            if (cfg.fifths) {
                // Power chord: add a fifth above
                const osc2 = ctx.createOscillator();
                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(note.freq * 1.498, noteTime);
                osc2.connect(env);
                osc2.start(noteTime);
                osc2.stop(noteTime + note.dur);
                oscillators.push(osc2);

                // Octave above for body
                const osc3 = ctx.createOscillator();
                osc3.type = 'square';
                osc3.frequency.setValueAtTime(note.freq * 2, noteTime);
                const octGain = ctx.createGain();
                octGain.gain.setValueAtTime(0.15, noteTime);
                osc3.connect(octGain);
                octGain.connect(env);
                osc3.start(noteTime);
                osc3.stop(noteTime + note.dur);
                oscillators.push(osc3);
            }

            env.connect(driveGain);
            osc1.start(noteTime);
            osc1.stop(noteTime + note.dur);
            oscillators.push(osc1);

            noteTime += note.dur;
        });

        // Fade out master
        const totalDur = Math.min(noteTime - now, duration);
        masterGain.gain.setValueAtTime(0.25, now + totalDur - 0.5);
        masterGain.gain.linearRampToValueAtTime(0, now + totalDur);

        return {
            stop: () => {
                oscillators.forEach(osc => {
                    try { osc.stop(); } catch (e) { /* already stopped */ }
                });
                masterGain.gain.cancelScheduledValues(ctx.currentTime);
                masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
            },
            duration: totalDur * 1000
        };
    }

    // --- Sound card play with real audio ---
    document.querySelectorAll('.sound-card').forEach(card => {
        let isPlaying = false;
        let playTimeout = null;

        card.addEventListener('click', () => {
            const playBtn = card.querySelector('.sound-card__play');
            const mode = card.dataset.mode;

            if (isPlaying) {
                // Stop
                isPlaying = false;
                card.classList.remove('playing');
                if (currentSource) {
                    currentSource.stop();
                    currentSource = null;
                }
                if (playTimeout) clearTimeout(playTimeout);
                playBtn.innerHTML =
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
                return;
            }

            // Stop all other playing cards
            document.querySelectorAll('.sound-card').forEach(c => {
                if (c !== card) {
                    c.classList.remove('playing');
                    c.querySelector('.sound-card__play').innerHTML =
                        '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
                }
            });
            if (currentSource) {
                currentSource.stop();
                currentSource = null;
            }

            // Play
            isPlaying = true;
            card.classList.add('playing');
            playBtn.innerHTML =
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

            currentSource = playDistortionDemo(mode);

            // Auto-stop after playback ends
            playTimeout = setTimeout(() => {
                isPlaying = false;
                card.classList.remove('playing');
                currentSource = null;
                playBtn.innerHTML =
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
            }, currentSource.duration + 200);
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

    // --- Knob auto-rotation (spinning knobs) ---
    document.querySelectorAll('.knob').forEach((knob, index) => {
        let isDragging = false;
        let startY;
        let startValue;
        let autoRotate = true;

        // Each knob spins at a different speed and phase
        const speeds = [0.0008, 0.0006, 0.0009, 0.0005];
        const phases = [0, 1.5, 3.0, 4.5];
        const ranges = [[15, 85], [20, 70], [30, 95], [10, 80]];
        const speed = speeds[index] || 0.0006;
        const phase = phases[index] || 0;
        const [minVal, maxVal] = ranges[index] || [20, 80];

        knob.classList.add('knob--spinning');

        const updateKnob = (value) => {
            value = Math.max(0, Math.min(100, value));
            knob.dataset.value = Math.round(value);
            const fill = knob.querySelector('.knob__fill');
            const indicator = knob.querySelector('.knob__indicator');
            if (fill) fill.style.setProperty('--value', value);
            if (indicator) {
                const rotation = (value / 100) * 270 - 135;
                indicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
            }
        };

        // Auto-rotation loop
        const animate = () => {
            if (autoRotate) {
                const time = performance.now();
                const mid = (minVal + maxVal) / 2;
                const amp = (maxVal - minVal) / 2;
                const value = mid + amp * Math.sin(time * speed + phase);
                updateKnob(value);
            }
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);

        // Manual drag override
        knob.addEventListener('mousedown', (e) => {
            isDragging = true;
            autoRotate = false;
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
                // Resume auto-rotation after 2 seconds
                setTimeout(() => { autoRotate = true; }, 2000);
            }
        });

        // Touch support
        knob.addEventListener('touchstart', (e) => {
            isDragging = true;
            autoRotate = false;
            startY = e.touches[0].clientY;
            startValue = parseInt(knob.dataset.value) || 50;
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const delta = (startY - e.touches[0].clientY) * 0.5;
            updateKnob(startValue + delta);
        });

        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                setTimeout(() => { autoRotate = true; }, 2000);
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
