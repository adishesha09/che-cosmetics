
document.addEventListener('DOMContentLoaded', function () {
    initLoader();
    initNavigation();
    initScrollEffects();
    initAnimations();
    renderFeaturedProducts();
    initFooter();
    initCookieBanner();
});

function initCookieBanner() {
    const cookieBanner = document.getElementById('cookieBanner');
    const cookieAccept = document.querySelector('.cookie-accept');

    if (!cookieBanner || !cookieAccept) {
        console.error('Cookie banner elements missing!');
        return;
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    if (!getCookie('cookieConsent')) {
        cookieBanner.style.display = 'block';
    }

    cookieAccept.addEventListener('click', () => {
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        document.cookie = `cookieConsent=true; expires=${expiry.toUTCString()}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;

        cookieBanner.style.opacity = '0';
        setTimeout(() => {
            cookieBanner.style.display = 'none';
            cookieBanner.remove();
        }, 300);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieBanner);
} else {
    initCookieBanner();
}

function initLoader() {
    const loader = document.querySelector('.loader');

    window.addEventListener('load', function () {
        setTimeout(function () {
            loader.classList.add('loader-hidden');
            loader.addEventListener('transitionend', function () {
                if (loader.classList.contains('loader-hidden')) {
                    loader.style.display = 'none';
                }
            });
        }, 1500);
    });
}

function initNavigation() {
    const burger = document.querySelector('.burger');
    const mobileNav = document.querySelector('.mobile-nav-links');
    const body = document.body;

    let overlay = document.querySelector('.mobile-nav-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-nav-overlay';
        document.body.appendChild(overlay);
    }

    function openMenu() {
        mobileNav.classList.add('active');
        overlay.classList.add('active');
        body.classList.add('menu-open');
        burger.classList.add('toggle');
    }

    function closeMenu() {
        mobileNav.classList.remove('active');
        overlay.classList.remove('active');
        body.classList.remove('menu-open');
        burger.classList.remove('toggle');
    }

    burger.addEventListener('click', function () {
        if (mobileNav.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    overlay.addEventListener('click', closeMenu);

    document.querySelectorAll('.mobile-nav-links a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
            closeMenu();
        }
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                closeMenu();
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function initScrollEffects() {
    window.addEventListener('scroll', function () {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.style.padding = '1rem 5%';
            header.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.padding = '1.5rem 5%';
            header.style.boxShadow = 'none';
        }
    });

    window.addEventListener('scroll', animateOnScroll);
}

function initAnimations() {
    const elements = document.querySelectorAll(
        '.hero-content, .hero-image, .section-title, .value-item, .about-content, .about-image'
    );

    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    setTimeout(animateOnScroll, 300);
}

function animateOnScroll() {
    const elements = document.querySelectorAll(
        '.hero-content, .hero-image, .section-title, .value-item, .about-content, .about-image'
    );

    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.3;

        if (elementPosition < screenPosition) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
}

function initFooter() {
    const yearElement = document.querySelector('.footer-bottom p:first-child');
    if (yearElement) {
        const currentYear = new Date().getFullYear();
        yearElement.textContent = yearElement.textContent.replace('2023', currentYear);
    }

    document.querySelectorAll('.quick-links a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    const socialLinks = document.querySelectorAll('.social-links a');
    if (socialLinks) {
        socialLinks.forEach(link => {
            link.addEventListener('mouseenter', function () {
                this.style.transform = 'translateY(-3px)';
            });
            link.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0)';
            });
        });
    }
}

function debounce(func, wait = 20, immediate = true) {
    let timeout;
    return function () {
        const context = this, args = arguments;
        const later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

window.addEventListener('scroll', debounce(animateOnScroll));