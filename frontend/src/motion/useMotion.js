import { introGate } from './introGate';
import { injectMotionTokens, motionTokens } from './tokens';

export function initMotion() {
    if (typeof window === 'undefined') return;

    injectMotionTokens();

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Smooth Scroll for nav links
    const setupSmoothScroll = () => {
        if (isReduced) return;
        document.querySelectorAll('header nav a, a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');
                if (targetId && targetId.startsWith('#')) {
                    const targetEl = document.querySelector(targetId);
                    if (targetEl) {
                        e.preventDefault();
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    };
    setupSmoothScroll();

    // 2. Scroll Reveals
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                if (target.dataset.reveal === 'pending') {
                    target.dataset.reveal = 'revealed';

                    // Cards stagger logic
                    const cards = target.querySelectorAll('.motion-card-stagger');
                    let delay = 60;
                    cards.forEach((card, i) => {
                        card.dataset.reveal = 'pending';
                        // Force layout
                        void card.offsetWidth;
                        setTimeout(() => {
                            if(card) {
                                card.dataset.reveal = 'revealed';
                            }
                        }, delay * (i + 1));
                    });
                    
                    observer.unobserve(target);
                }
            }
        });
    }, { threshold: 0.1 });

    const markForReveal = () => {
        // Sections
        const elements = document.querySelectorAll(
            '#features, .aspect-\\[16\\/10\\], section, #weather, #insights, #console'
        );

        elements.forEach(el => {
            const txt = el.textContent || "";
            let isTarget = false;
            
            if (el.id === 'features') isTarget = true;
            if (el.id === 'weather') isTarget = true;
            if (el.id === 'insights') isTarget = true;
            if (el.id === 'console') isTarget = true;
            if (el.id === 'how-it-works') isTarget = true;
            if (el.classList.contains('aspect-[16/10]')) isTarget = true;
            if (el.tagName.toLowerCase() === 'section' && txt.includes("Live HUD telemetry")) isTarget = true;
            if (el.tagName.toLowerCase() === 'section' && txt.includes("More insights")) isTarget = true;
            if (el.tagName.toLowerCase() === 'section' && txt.includes("Yield prediction")) isTarget = true;
            if (el.tagName.toLowerCase() === 'section' && txt.includes("7-day action plan")) isTarget = true;

            if (isTarget && !el.dataset.reveal) {
                // Find cards and mark them for stagger
                const cards = el.querySelectorAll('.bg-white\\/\\[0\\.03\\], .bg-black\\/40, .border-white\\/10');
                cards.forEach(card => {
                    if (card.tagName.toLowerCase() === 'div' && (card.className.includes('p-6') || card.className.includes('p-4') || card.className.includes('p-5'))) {
                        card.classList.add('motion-card-stagger');
                    }
                });

                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight) {
                    el.dataset.reveal = 'revealed';
                    // Reveal cards immediately if section is already in view
                    const staggerCards = el.querySelectorAll('.motion-card-stagger');
                    staggerCards.forEach((c) => {
                         c.dataset.reveal = 'revealed';
                    });
                } else {
                    el.dataset.reveal = 'pending';
                    observer.observe(el);
                }
            }
        });
    };

    // 3. MutationObserver for dynamically created nodes
    const mutObserver = new MutationObserver(() => {
        markForReveal();
    });
    mutObserver.observe(document.body, { childList: true, subtree: true });
    markForReveal();

    // 4. Hero Entrance with IntroGate
    const runHeroEntrance = () => {
        const nav = document.querySelector('header');
        const headline = document.querySelector('h1');
        const desc = document.querySelector('h1 + p');
        const buttons = document.querySelector('h1 ~ div.flex-wrap'); // Hero buttons
        const visual = document.querySelector('.aspect-\\[16\\/10\\]');
        const floatingPanels = document.querySelectorAll('.aspect-\\[16\\/10\\] > div.absolute.z-10, .aspect-\\[16\\/10\\] > div.absolute.bottom-4'); 

        const sequence = [nav, headline, desc, buttons, visual, ...Array.from(floatingPanels)].filter(Boolean);
        
        sequence.forEach((el, i) => {
            el.dataset.reveal = 'pending';
            setTimeout(() => {
                el.dataset.reveal = 'revealed';
            }, 70 * i);
        });
    };

    introGate.wait(() => {
        runHeroEntrance();
    });
}

    // Stage 3: Watch Demo Modal Observer
    const observeModal = () => {
        const modalObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                // Check for added modal backdrop
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('z-50') && node.classList.contains('bg-black/80')) {
                        // It's the backdrop!
                        node.classList.add('motion-modal-backdrop');
                        const contentNode = node.querySelector('.bg-\\[\\#0A120D\\]') || node.firstElementChild;
                        if (contentNode) contentNode.classList.add('motion-modal-content');

                        // Add an observer for the style attribute to detect exit
                        const styleObserver = new MutationObserver((styleMutations) => {
                            styleMutations.forEach(sm => {
                                if (sm.attributeName === 'style') {
                                    const opacity = parseFloat(node.style.opacity);
                                    if (opacity < 1 && opacity > 0 && !node.classList.contains('exiting')) {
                                        // Framer motion is animating it out!
                                        node.classList.add('exiting');
                                        if (contentNode) contentNode.classList.add('exiting');
                                    }
                                }
                            });
                        });
                        styleObserver.observe(node, { attributes: true, attributeFilter: ['style'] });
                    }
                });
            });
        });
        modalObserver.observe(document.body, { childList: true, subtree: true });
    };
    if (typeof window !== 'undefined') {
        observeModal();
    }

    // Stage 4: Micro-weather fade
    const weatherStrip = document.querySelector('.min-w-\\[980px\\]');
    if (weatherStrip) {
        weatherStrip.addEventListener('click', (e) => {
            if (e.target.closest('.cursor-pointer')) {
                const roundedParent = weatherStrip.parentElement.parentElement; 
                const detailPanel = roundedParent.nextElementSibling;
                if (detailPanel && detailPanel.classList.contains('grid')) {
                    detailPanel.classList.add('motion-weather-detail');
                    detailPanel.classList.add('fading');
                    setTimeout(() => detailPanel.classList.remove('fading'), 200);
                }
            }
        });
    }

    // Stage 4: Cross-field table staggered reveal & highlight
    const tableRows = document.querySelectorAll('table tbody tr');
    if (tableRows.length > 0) {
        const tableObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    tableRows.forEach((tr, i) => {
                        tr.style.opacity = '0';
                        tr.style.transform = 'translateY(10px)';
                        tr.style.transition = 'opacity 300ms ease, transform 300ms ease';
                        setTimeout(() => {
                            tr.style.opacity = '1';
                            tr.style.transform = 'translateY(0)';
                        }, 50 * i);
                    });
                    tableObserver.disconnect();
                }
            });
        });
        tableObserver.observe(tableRows[0].closest('table'));

        // Highlight active row based on farm selector
        const farmSelector = document.getElementById('farm-selector');
        if (farmSelector) {
            const updateActiveRow = () => {
                const selectedText = farmSelector.options[farmSelector.selectedIndex].text.toLowerCase();
                tableRows.forEach(tr => {
                    const farmName = (tr.querySelector('td') || {}).textContent || '';
                    if (selectedText.includes(farmName.toLowerCase()) && farmName.trim() !== '') {
                        tr.classList.add('motion-row-active');
                    } else {
                        tr.classList.remove('motion-row-active');
                    }
                });
            };
            farmSelector.addEventListener('change', updateActiveRow);
            updateActiveRow();
        }
    }

    // Stage 4: Seven-day plan tick feedback
    document.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox' && e.target.classList.contains('accent-\\[\\#22C55E\\]')) {
            if (e.target.checked) {
                const card = e.target.closest('.rounded-2xl');
                if (card) {
                    card.classList.add('motion-tick-feedback');
                    setTimeout(() => card.classList.remove('motion-tick-feedback'), 400);
                }
            }
        }
    });

    // Stage 4: General field switch fade (Info Panel, Chart, Weather, Action Plan)
    const farmSelector = document.getElementById('farm-selector');
    if (farmSelector) {
        farmSelector.addEventListener('change', () => {
            // 1. Field Info Panel
            const infoPanel = document.getElementById('val-farm-name')?.parentElement;
            if (infoPanel) {
                infoPanel.classList.add('motion-field-info');
                infoPanel.classList.add('fading');
                setTimeout(() => infoPanel.classList.remove('fading'), 200);
            }

            // 2. Yield Chart Fade
            const chartContainer = document.querySelector('.recharts-responsive-container');
            if (chartContainer) {
                chartContainer.classList.add('motion-chart-fade');
                chartContainer.classList.add('fading');
                setTimeout(() => chartContainer.classList.remove('fading'), 200);
            }

            // 3. Action Plan Fade
            const planSection = document.querySelector('.flex.flex-col.space-y-10 .grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-7');
            if (planSection) {
                planSection.classList.add('motion-section-fade');
                planSection.classList.add('fading');
                setTimeout(() => planSection.classList.remove('fading'), 200);
            }
            
            // 4. Zone Cards Fade
            const zoneCards = document.querySelectorAll('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
            if (zoneCards.length > 0) {
                const zoneGrid = zoneCards[zoneCards.length - 1]; // Assume last one is zones
                if (zoneGrid) {
                    zoneGrid.classList.add('motion-section-fade');
                    zoneGrid.classList.add('fading');
                    setTimeout(() => zoneGrid.classList.remove('fading'), 200);
                }
            }
        });
    }

    // Stage 4: Shimmer loading state replacement
    const attachShimmer = () => {
        document.querySelectorAll('div, td').forEach(el => {
            if (el.children.length === 0 && el.textContent && el.textContent.includes('LOADING')) {
                if (!el.classList.contains('motion-shimmer')) {
                    el.classList.add('motion-shimmer');
                }
            }
        });
    };
    // Run periodically to catch loading states during React updates
    setInterval(attachShimmer, 500);
