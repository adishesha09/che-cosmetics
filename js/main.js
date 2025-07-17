/**
 * CHE COSMETICS - Main JavaScript File
 * Contains all functionality for the landing page
 */

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    initLoader();
    initNavigation();
    initScrollEffects();
    initAnimations();
    renderFeaturedProducts();
    initFooter();
    initCookieBanner();
});

/**
 * Initialize Cookie Banner
 */
function initCookieBanner() {
    // Get elements safely
    const cookieBanner = document.getElementById('cookieBanner');
    const cookieAccept = document.querySelector('.cookie-accept');
    
    if (!cookieBanner || !cookieAccept) {
        console.error('Cookie banner elements missing!');
        return;
    }

    // Improved cookie check
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // Show banner if no consent
    if (!getCookie('cookieConsent')) {
        cookieBanner.style.display = 'block';
    }

    // Handle accept click
    cookieAccept.addEventListener('click', () => {
        // Set secure cookie
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        document.cookie = `cookieConsent=true; expires=${expiry.toUTCString()}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
        
        // Animate out
        cookieBanner.style.opacity = '0';
        setTimeout(() => {
            cookieBanner.style.display = 'none';
            cookieBanner.remove(); // Optional: Remove from DOM completely
        }, 300);
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieBanner);
} else {
    initCookieBanner();
}

/**
 * Initialize Loader
 */
function initLoader() {
    const loader = document.querySelector('.loader');
    
    window.addEventListener('load', function() {
        setTimeout(function() {
            loader.classList.add('loader-hidden');
            loader.addEventListener('transitionend', function() {
                if (loader.classList.contains('loader-hidden')) {
                    loader.style.display = 'none';
                }
            });
        }, 1500);
    });
}

/**
 * Initialize Navigation
 */
function initNavigation() {
    const burger = document.querySelector('.burger');
    const mobileNav = document.querySelector('.mobile-nav-links');

    burger.addEventListener('click', function() {
        mobileNav.classList.toggle('active');
        burger.classList.toggle('toggle');
        document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu when clicking a link
    document.querySelectorAll('.mobile-nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            burger.classList.remove('toggle');
            document.body.style.overflow = '';
        });
    });

    // Smooth scrolling (existing code remains the same)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Initialize Scroll Effects
 */
function initScrollEffects() {
    // Header scroll effect
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.style.padding = '1rem 5%';
            header.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.padding = '1.5rem 5%';
            header.style.boxShadow = 'none';
        }
    });
    
    // Animate elements when they come into view
    window.addEventListener('scroll', animateOnScroll);
}

/**
 * Initialize Animations
 */
function initAnimations() {
    // Set initial state for animated elements
    const elements = document.querySelectorAll(
        '.hero-content, .hero-image, .section-title, .value-item, .about-content, .about-image'
    );
    
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    // Trigger animation after a slight delay
    setTimeout(animateOnScroll, 300);
}

/**
 * Animate Elements on Scroll
 */
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

/**
 * Initialize Footer Functionality
 */
function initFooter() {
    // Update copyright year automatically
    const yearElement = document.querySelector('.footer-bottom p:first-child');
    if (yearElement) {
        const currentYear = new Date().getFullYear();
        yearElement.textContent = yearElement.textContent.replace('2023', currentYear);
    }
    
    // Smooth scroll for footer links
    document.querySelectorAll('.quick-links a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
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
    
    // Add hover effects for social icons
    const socialLinks = document.querySelectorAll('.social-links a');
    if (socialLinks) {
        socialLinks.forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-3px)';
            });
            link.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });
    }
}

/**
 * Debounce function for performance optimization
 */
function debounce(func, wait = 20, immediate = true) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// Optimize scroll performance
window.addEventListener('scroll', debounce(animateOnScroll));