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

    // --- TR-909 Kick Synthesis + Distortion ---

    function makeDistortionCurve(amount) {
        const n = 8192;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    function makeFuzzCurve(intensity) {
        const n = 8192;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            const boosted = x * intensity;
            curve[i] = boosted > 0
                ? 1 - Math.exp(-boosted * 3)
                : -(1 - Math.exp(boosted * 2)) * 0.9;
        }
        return curve;
    }

    function makeHardClipCurve(threshold) {
        const n = 8192;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = Math.max(-threshold, Math.min(threshold, x * 20));
        }
        return curve;
    }

    function makeFoldCurve(folds) {
        const n = 8192;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = Math.sin(x * Math.PI * folds);
        }
        return curve;
    }

    // Synthesize a single TR-909-style kick
    function create909Kick(ctx, output, time, tune, decay, level) {
        // --- Pitch oscillator (sine body) ---
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const startFreq = tune * 4.5;  // initial pitch click
        const endFreq = tune;
        osc.frequency.setValueAtTime(startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.04);

        // --- Amplitude envelope ---
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(level, time);
        oscGain.gain.setValueAtTime(level * 0.9, time + 0.01);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + decay);

        // --- Click / transient (noise burst) ---
        const clickLen = 0.015;
        const bufferSize = Math.ceil(ctx.sampleRate * clickLen);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        }
        const click = ctx.createBufferSource();
        click.buffer = noiseBuffer;

        const clickFilter = ctx.createBiquadFilter();
        clickFilter.type = 'highpass';
        clickFilter.frequency.setValueAtTime(800, time);
        clickFilter.Q.setValueAtTime(1, time);

        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(level * 0.6, time);
        clickGain.gain.exponentialRampToValueAtTime(0.001, time + clickLen);

        // --- Second harmonic ---
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(startFreq * 1.5, time);
        osc2.frequency.exponentialRampToValueAtTime(endFreq * 0.5, time + 0.03);

        const osc2Gain = ctx.createGain();
        osc2Gain.gain.setValueAtTime(level * 0.25, time);
        osc2Gain.gain.exponentialRampToValueAtTime(0.001, time + decay * 0.5);

        // Connect
        osc.connect(oscGain);
        oscGain.connect(output);

        osc2.connect(osc2Gain);
        osc2Gain.connect(output);

        click.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(output);

        osc.start(time);
        osc.stop(time + decay + 0.05);
        osc2.start(time);
        osc2.stop(time + decay * 0.5 + 0.05);
        click.start(time);

        return [osc, osc2, click];
    }

    function playDistortionDemo(mode) {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Master output
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.35, now);
        masterGain.connect(ctx.destination);

        // Limiter
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(-6, now);
        limiter.knee.setValueAtTime(3, now);
        limiter.ratio.setValueAtTime(20, now);
        limiter.attack.setValueAtTime(0.001, now);
        limiter.release.setValueAtTime(0.05, now);
        limiter.connect(masterGain);

        // Post-distortion EQ
        const postEQ = ctx.createBiquadFilter();
        postEQ.type = 'peaking';
        postEQ.connect(limiter);

        // Distortion chain (stacked for LOTS of distortion)
        const dist1 = ctx.createWaveShaper();
        dist1.oversample = '4x';
        const dist2 = ctx.createWaveShaper();
        dist2.oversample = '4x';
        const dist3 = ctx.createWaveShaper();
        dist3.oversample = '4x';

        dist3.connect(postEQ);
        dist2.connect(dist3);
        dist1.connect(dist2);

        // Pre-distortion drive
        const driveGain = ctx.createGain();
        driveGain.connect(dist1);

        // Pre-EQ (shape the kick before distortion)
        const preEQ = ctx.createBiquadFilter();
        preEQ.type = 'peaking';
        preEQ.connect(driveGain);

        // Mode configs — all based on TR-909 kick with different distortion
        const configs = {
            tube: {
                drive: 3, curve1: makeDistortionCurve(8), curve2: makeDistortionCurve(4), curve3: makeDistortionCurve(2),
                preFreq: 100, preQ: 2, preGainDb: 6,
                postFreq: 2500, postQ: 0.8, postGainDb: 3,
                kickTune: 52, kickDecay: 0.45, kickLevel: 0.9,
                bpm: 130,
                pattern: [1,0,0,0, 1,0,0,0, 1,0,0,1, 0,0,1,0],
                accentPattern: [1,0,0,0, 0.8,0,0,0, 1,0,0,0.6, 0,0,0.7,0]
            },
            fuzz: {
                drive: 8, curve1: makeFuzzCurve(12), curve2: makeFuzzCurve(8), curve3: makeDistortionCurve(15),
                preFreq: 150, preQ: 3, preGainDb: 12,
                postFreq: 1800, postQ: 1.5, postGainDb: 6,
                kickTune: 48, kickDecay: 0.55, kickLevel: 1.0,
                bpm: 145,
                pattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
                accentPattern: [1,0,0.7,0, 0.9,0,0.6,0, 1,0,0.7,0, 0.8,0,0.6,0]
            },
            clip: {
                drive: 15, curve1: makeHardClipCurve(0.3), curve2: makeHardClipCurve(0.2), curve3: makeDistortionCurve(20),
                preFreq: 200, preQ: 4, preGainDb: 18,
                postFreq: 3500, postQ: 1, postGainDb: 8,
                kickTune: 44, kickDecay: 0.35, kickLevel: 1.0,
                bpm: 170,
                pattern: [1,0,1,1, 0,1,1,0, 1,1,0,1, 1,0,1,1],
                accentPattern: [1,0,0.8,0.9, 0,0.7,0.8,0, 1,0.9,0,0.8, 0.9,0,0.7,1]
            },
            fold: {
                drive: 6, curve1: makeFoldCurve(5), curve2: makeFoldCurve(3), curve3: makeFoldCurve(7),
                preFreq: 120, preQ: 2, preGainDb: 8,
                postFreq: 4000, postQ: 2, postGainDb: 4,
                kickTune: 55, kickDecay: 0.5, kickLevel: 0.85,
                bpm: 140,
                pattern: [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,1],
                accentPattern: [1,0,0,0.7, 0,0,0.8,0, 0,0.6,0,0, 0.9,0,0,0.7]
            }
        };

        const cfg = configs[mode] || configs.tube;

        // Setup distortion chain
        driveGain.gain.setValueAtTime(cfg.drive, now);
        dist1.curve = cfg.curve1;
        dist2.curve = cfg.curve2;
        dist3.curve = cfg.curve3;

        preEQ.frequency.setValueAtTime(cfg.preFreq, now);
        preEQ.Q.setValueAtTime(cfg.preQ, now);
        preEQ.gain.setValueAtTime(cfg.preGainDb, now);

        postEQ.frequency.setValueAtTime(cfg.postFreq, now);
        postEQ.Q.setValueAtTime(cfg.postQ, now);
        postEQ.gain.setValueAtTime(cfg.postGainDb, now);

        // Schedule 909 kick pattern (2 bars = 16 steps × 2)
        const stepDur = 60 / cfg.bpm / 4; // 16th note duration
        const allNodes = [];
        const totalSteps = 32;

        for (let i = 0; i < totalSteps; i++) {
            const patIdx = i % cfg.pattern.length;
            if (cfg.pattern[patIdx] === 0) continue;

            const hitTime = now + i * stepDur;
            const accent = cfg.accentPattern[patIdx] || 1;
            const nodes = create909Kick(
                ctx, preEQ, hitTime,
                cfg.kickTune,
                cfg.kickDecay * (0.7 + accent * 0.3),
                cfg.kickLevel * accent
            );
            allNodes.push(...nodes);
        }

        const totalDur = totalSteps * stepDur;
        masterGain.gain.setValueAtTime(0.35, now + totalDur - 0.3);
        masterGain.gain.linearRampToValueAtTime(0, now + totalDur);

        return {
            stop: () => {
                allNodes.forEach(n => { try { n.stop(); } catch(e) {} });
                masterGain.gain.cancelScheduledValues(ctx.currentTime);
                masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.03);
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

    // --- Knob interaction (user-controlled) ---
    document.querySelectorAll('.knob').forEach(knob => {
        let isDragging = false;
        let startY;
        let startValue;

        const updateKnob = (value) => {
            value = Math.max(0, Math.min(100, value));
            knob.dataset.value = Math.round(value);
            const fill = knob.querySelector('.knob__fill');
            const indicator = knob.querySelector('.knob__indicator');
            const fillAngle = (value / 100) * 360;
            const indicatorAngle = (value / 100) * 270 - 135;
            if (fill) fill.style.setProperty('--angle', fillAngle + 'deg');
            if (indicator) {
                indicator.style.transform = `translateX(-50%) rotate(${indicatorAngle}deg)`;
            }
        };

        // Set initial position from data-value
        updateKnob(parseInt(knob.dataset.value) || 50);

        // Mouse drag
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

        // Touch support
        knob.addEventListener('touchstart', (e) => {
            isDragging = true;
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
