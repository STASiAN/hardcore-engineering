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

    // ========================================
    // PERDAK LIVE ENGINE
    // Knobs, modes, power button all control
    // a continuous TR-909 kick + distortion loop
    // ========================================

    let audioCtx = null;
    let currentSource = null;
    let pluginIsOn = false;
    let activeMode = 'fuzz';
    let loopTimer = null;

    // Knob state (0-100)
    const knobState = { drive: 65, tone: 40, mix: 75, level: 50 };

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    // --- Distortion curves ---
    function makeDistortionCurve(amount) {
        const n = 8192, c = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n-1; c[i] = ((Math.PI+amount)*x)/(Math.PI+amount*Math.abs(x)); }
        return c;
    }
    function makeFuzzCurve(intensity) {
        const n = 8192, c = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n-1, b = x*intensity; c[i] = b>0 ? 1-Math.exp(-b*3) : -(1-Math.exp(b*2))*0.9; }
        return c;
    }
    function makeHardClipCurve(threshold) {
        const n = 8192, c = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n-1; c[i] = Math.max(-threshold, Math.min(threshold, x*20)); }
        return c;
    }
    function makeFoldCurve(folds) {
        const n = 8192, c = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n-1; c[i] = Math.sin(x*Math.PI*folds); }
        return c;
    }

    // --- TR-909 kick ---
    function create909Kick(ctx, output, time, tune, decay, level) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(tune * 4.5, time);
        osc.frequency.exponentialRampToValueAtTime(tune, time + 0.04);
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(level, time);
        oscGain.gain.setValueAtTime(level * 0.9, time + 0.01);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + decay);

        const clickLen = 0.015;
        const bufSz = Math.ceil(ctx.sampleRate * clickLen);
        const nBuf = ctx.createBuffer(1, bufSz, ctx.sampleRate);
        const d = nBuf.getChannelData(0);
        for (let i = 0; i < bufSz; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/(bufSz*0.15));
        const click = ctx.createBufferSource(); click.buffer = nBuf;
        const cFilt = ctx.createBiquadFilter(); cFilt.type = 'highpass'; cFilt.frequency.setValueAtTime(800, time);
        const cGain = ctx.createGain(); cGain.gain.setValueAtTime(level*0.6, time); cGain.gain.exponentialRampToValueAtTime(0.001, time+clickLen);

        const osc2 = ctx.createOscillator(); osc2.type = 'sine';
        osc2.frequency.setValueAtTime(tune*4.5*1.5, time); osc2.frequency.exponentialRampToValueAtTime(tune*0.5, time+0.03);
        const o2g = ctx.createGain(); o2g.gain.setValueAtTime(level*0.25, time); o2g.gain.exponentialRampToValueAtTime(0.001, time+decay*0.5);

        osc.connect(oscGain); oscGain.connect(output);
        osc2.connect(o2g); o2g.connect(output);
        click.connect(cFilt); cFilt.connect(cGain); cGain.connect(output);
        osc.start(time); osc.stop(time+decay+0.05);
        osc2.start(time); osc2.stop(time+decay*0.5+0.05);
        click.start(time);
        return [osc, osc2, click];
    }

    // --- Mode configs (same used by both plugin-ui and sound cards) ---
    function getModeConfig(mode) {
        const configs = {
            tube: {
                baseDrive: 3, curve1Fn: () => makeDistortionCurve(8), curve2Fn: () => makeDistortionCurve(4), curve3Fn: () => makeDistortionCurve(2),
                preFreq: 100, preQ: 2, preGainDb: 6, postFreq: 2500, postQ: 0.8, postGainDb: 3,
                kickTune: 52, kickDecay: 0.45, kickLevel: 0.9, bpm: 130,
                pattern: [1,0,0,0, 1,0,0,0, 1,0,0,1, 0,0,1,0],
                accentPattern: [1,0,0,0, 0.8,0,0,0, 1,0,0,0.6, 0,0,0.7,0]
            },
            fuzz: {
                baseDrive: 8, curve1Fn: () => makeFuzzCurve(12), curve2Fn: () => makeFuzzCurve(8), curve3Fn: () => makeDistortionCurve(15),
                preFreq: 150, preQ: 3, preGainDb: 12, postFreq: 1800, postQ: 1.5, postGainDb: 6,
                kickTune: 48, kickDecay: 0.55, kickLevel: 1.0, bpm: 145,
                pattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
                accentPattern: [1,0,0.7,0, 0.9,0,0.6,0, 1,0,0.7,0, 0.8,0,0.6,0]
            },
            clip: {
                baseDrive: 15, curve1Fn: () => makeHardClipCurve(0.3), curve2Fn: () => makeHardClipCurve(0.2), curve3Fn: () => makeDistortionCurve(20),
                preFreq: 200, preQ: 4, preGainDb: 18, postFreq: 3500, postQ: 1, postGainDb: 8,
                kickTune: 44, kickDecay: 0.35, kickLevel: 1.0, bpm: 170,
                pattern: [1,0,1,1, 0,1,1,0, 1,1,0,1, 1,0,1,1],
                accentPattern: [1,0,0.8,0.9, 0,0.7,0.8,0, 1,0.9,0,0.8, 0.9,0,0.7,1]
            },
            fold: {
                baseDrive: 6, curve1Fn: () => makeFoldCurve(5), curve2Fn: () => makeFoldCurve(3), curve3Fn: () => makeFoldCurve(7),
                preFreq: 120, preQ: 2, preGainDb: 8, postFreq: 4000, postQ: 2, postGainDb: 4,
                kickTune: 55, kickDecay: 0.5, kickLevel: 0.85, bpm: 140,
                pattern: [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,1],
                accentPattern: [1,0,0,0.7, 0,0,0.8,0, 0,0.6,0,0, 0.9,0,0,0.7]
            }
        };
        return configs[mode] || configs.tube;
    }

    // --- Play one loop of 909 kicks with knob-controlled params ---
    function playLoop(mode, knobs) {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const cfg = getModeConfig(mode);

        // Knob mappings (0-100 → real values)
        const driveAmount = (knobs.drive / 100) * cfg.baseDrive * 3;  // drive knob scales heavily
        const toneFreq = 800 + (knobs.tone / 100) * 6000;            // 800–6800 Hz LP
        const mixWet = knobs.mix / 100;                                // 0=dry, 1=full distortion
        const levelVol = (knobs.level / 100) * 0.5;                   // 0–0.5

        // Master
        const master = ctx.createGain();
        master.gain.setValueAtTime(levelVol, now);
        master.connect(ctx.destination);

        // Limiter
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(-6, now);
        limiter.knee.setValueAtTime(3, now); limiter.ratio.setValueAtTime(20, now);
        limiter.attack.setValueAtTime(0.001, now); limiter.release.setValueAtTime(0.05, now);
        limiter.connect(master);

        // Dry/Wet mixer
        const wetGain = ctx.createGain();
        wetGain.gain.setValueAtTime(mixWet, now);
        const dryGain = ctx.createGain();
        dryGain.gain.setValueAtTime(1 - mixWet, now);
        wetGain.connect(limiter);
        dryGain.connect(limiter);

        // Tone (post-distortion LP)
        const toneFilter = ctx.createBiquadFilter();
        toneFilter.type = 'lowpass';
        toneFilter.frequency.setValueAtTime(toneFreq, now);
        toneFilter.Q.setValueAtTime(0.7, now);
        toneFilter.connect(wetGain);

        // Post EQ
        const postEQ = ctx.createBiquadFilter();
        postEQ.type = 'peaking';
        postEQ.frequency.setValueAtTime(cfg.postFreq, now);
        postEQ.Q.setValueAtTime(cfg.postQ, now);
        postEQ.gain.setValueAtTime(cfg.postGainDb, now);
        postEQ.connect(toneFilter);

        // 3x stacked distortion
        const dist1 = ctx.createWaveShaper(); dist1.oversample = '4x'; dist1.curve = cfg.curve1Fn();
        const dist2 = ctx.createWaveShaper(); dist2.oversample = '4x'; dist2.curve = cfg.curve2Fn();
        const dist3 = ctx.createWaveShaper(); dist3.oversample = '4x'; dist3.curve = cfg.curve3Fn();
        dist3.connect(postEQ); dist2.connect(dist3); dist1.connect(dist2);

        // Drive gain
        const drive = ctx.createGain();
        drive.gain.setValueAtTime(driveAmount, now);
        drive.connect(dist1);

        // Pre EQ
        const preEQ = ctx.createBiquadFilter();
        preEQ.type = 'peaking';
        preEQ.frequency.setValueAtTime(cfg.preFreq, now);
        preEQ.Q.setValueAtTime(cfg.preQ, now);
        preEQ.gain.setValueAtTime(cfg.preGainDb, now);
        preEQ.connect(drive);
        preEQ.connect(dryGain); // dry path

        // Schedule kicks
        const stepDur = 60 / cfg.bpm / 4;
        const totalSteps = 16;
        const allNodes = [];

        for (let i = 0; i < totalSteps; i++) {
            const patIdx = i % cfg.pattern.length;
            if (cfg.pattern[patIdx] === 0) continue;
            const hitTime = now + i * stepDur;
            const accent = cfg.accentPattern[patIdx] || 1;
            const nodes = create909Kick(ctx, preEQ, hitTime, cfg.kickTune, cfg.kickDecay*(0.7+accent*0.3), cfg.kickLevel*accent);
            allNodes.push(...nodes);
        }

        const totalDur = totalSteps * stepDur;
        master.gain.setValueAtTime(levelVol, now + totalDur - 0.05);
        master.gain.linearRampToValueAtTime(levelVol * 0.95, now + totalDur);

        return {
            stop: () => {
                allNodes.forEach(n => { try { n.stop(); } catch(e) {} });
                master.gain.cancelScheduledValues(ctx.currentTime);
                master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.03);
            },
            duration: totalDur * 1000
        };
    }

    // --- Continuous loop manager ---
    function startPluginLoop() {
        if (!pluginIsOn) return;
        if (currentSource) currentSource.stop();

        currentSource = playLoop(activeMode, knobState);

        loopTimer = setTimeout(() => {
            if (pluginIsOn) startPluginLoop();
        }, currentSource.duration - 50);
    }

    function stopPluginLoop() {
        if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
        if (currentSource) { currentSource.stop(); currentSource = null; }
    }

    // --- Power button ---
    const powerBtn = document.getElementById('powerBtn');
    const powerHint = document.getElementById('powerHint');
    const pluginUI = document.querySelector('.plugin-ui');

    // Start with inactive state
    pluginUI.classList.add('plugin-ui--inactive');

    powerBtn.addEventListener('click', () => {
        pluginIsOn = !pluginIsOn;
        powerBtn.classList.toggle('power-btn--active', pluginIsOn);
        pluginUI.classList.toggle('plugin-ui--active', pluginIsOn);
        pluginUI.classList.toggle('plugin-ui--inactive', !pluginIsOn);
        powerHint.classList.add('power-hint--hidden');

        if (pluginIsOn) {
            // Stop any sound card that might be playing
            document.querySelectorAll('.sound-card.playing').forEach(c => {
                c.classList.remove('playing');
                c.querySelector('.sound-card__play').innerHTML =
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
            });
            startPluginLoop();
        } else {
            stopPluginLoop();
        }
    });

    // --- Mode buttons (plugin UI) → switch mode + restart if playing ---
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('mode-btn--active'));
            btn.classList.add('mode-btn--active');
            activeMode = btn.dataset.mode;
            if (pluginIsOn) {
                stopPluginLoop();
                startPluginLoop();
            }
        });
    });

    // --- Knob interaction (user-controlled, affects live sound) ---
    document.querySelectorAll('.knob').forEach(knob => {
        let isDragging = false;
        let startY, startValue;

        const updateKnob = (value) => {
            value = Math.max(0, Math.min(100, value));
            knob.dataset.value = Math.round(value);
            const fill = knob.querySelector('.knob__fill');
            const indicator = knob.querySelector('.knob__indicator');
            const fillAngle = (value / 100) * 360;
            const indicatorAngle = (value / 100) * 270 - 135;
            if (fill) fill.style.setProperty('--angle', fillAngle + 'deg');
            if (indicator) indicator.style.transform = `translateX(-50%) rotate(${indicatorAngle}deg)`;

            // Update knob state for live engine
            const param = knob.dataset.param;
            if (param && knobState.hasOwnProperty(param)) {
                knobState[param] = value;
            }
        };

        updateKnob(parseInt(knob.dataset.value) || 50);

        knob.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startValue = parseInt(knob.dataset.value) || 50;
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            updateKnob(startValue + (startY - e.clientY) * 0.5);
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) { isDragging = false; document.body.style.cursor = ''; }
        });

        knob.addEventListener('touchstart', (e) => {
            isDragging = true;
            startY = e.touches[0].clientY;
            startValue = parseInt(knob.dataset.value) || 50;
            e.preventDefault();
        }, { passive: false });
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            updateKnob(startValue + (startY - e.touches[0].clientY) * 0.5);
        });
        document.addEventListener('touchend', () => { if (isDragging) isDragging = false; });
    });

    // --- Sound card play (uses same engine as plugin, same mode configs) ---
    document.querySelectorAll('.sound-card').forEach(card => {
        let isPlaying = false;
        let playTimeout = null;
        let cardSource = null;

        card.addEventListener('click', () => {
            const playBtn = card.querySelector('.sound-card__play');
            const mode = card.dataset.mode;

            if (isPlaying) {
                isPlaying = false;
                card.classList.remove('playing');
                if (cardSource) { cardSource.stop(); cardSource = null; }
                if (playTimeout) clearTimeout(playTimeout);
                playBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
                return;
            }

            // Turn off plugin UI if it's on
            if (pluginIsOn) {
                pluginIsOn = false;
                powerBtn.classList.remove('power-btn--active');
                pluginUI.classList.remove('plugin-ui--active');
                pluginUI.classList.add('plugin-ui--inactive');
                stopPluginLoop();
            }

            // Stop other cards
            document.querySelectorAll('.sound-card').forEach(c => {
                if (c !== card) {
                    c.classList.remove('playing');
                    c.querySelector('.sound-card__play').innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
                }
            });
            if (currentSource) { currentSource.stop(); currentSource = null; }

            isPlaying = true;
            card.classList.add('playing');
            playBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

            // Play 2 bars with default knob values for demo
            cardSource = playLoop(mode, { drive: 65, tone: 50, mix: 80, level: 50 });

            playTimeout = setTimeout(() => {
                // Play second 2 bars
                const src2 = playLoop(mode, { drive: 65, tone: 50, mix: 80, level: 50 });
                const timeout2 = setTimeout(() => {
                    isPlaying = false;
                    card.classList.remove('playing');
                    cardSource = null;
                    playBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
                }, src2.duration + 100);
                cardSource = { stop: () => { src2.stop(); clearTimeout(timeout2); } };
            }, cardSource.duration - 50);
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
